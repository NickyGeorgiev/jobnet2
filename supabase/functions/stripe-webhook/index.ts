import Stripe from "npm:stripe@17.0.0"
import { createClient } from "npm:@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")!
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook грешка: ${err.message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session.client_reference_id

    // ============================================================
    // ИДЕМПОТЕНТНОСТ — Stripe може да достави едно и също събитие
    // повече от веднъж (retry при timeout/мрежов проблем). Ако вече
    // сме записали плащане за тази сесия, спираме тук — за да не
    // удвоим токени/дни/tier при повторна доставка.
    // ============================================================
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle()

    if (existingPayment) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // line_items не идва по подразбиране в session обекта — трябва да го изтеглим отделно
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const actualPriceId = lineItems.data[0]?.price?.id

    const goldPriceId = Deno.env.get("STRIPE_GOLD_PRICE_ID")
    const companyPriceId = Deno.env.get("STRIPE_COMPANY_PRICE_ID")

    const now = new Date()

    if (actualPriceId === goldPriceId) {
      const { data: candidateData } = await supabaseAdmin
        .from("candidates")
        .select("gold_until")
        .eq("id", userId)
        .single()

      const currentUntil = candidateData?.gold_until ? new Date(candidateData.gold_until) : null
      const base = currentUntil && currentUntil > now ? currentUntil : now
      const newUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

      await supabaseAdmin
        .from("candidates")
        .update({ is_gold: true, gold_until: newUntil.toISOString() })
        .eq("id", userId)

      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        user_type: "candidate",
        amount: session.amount_total / 100,
        description: "Gold статус — 30 дни",
        stripe_payment_intent_id: session.payment_intent,
        stripe_checkout_session_id: session.id,
      })

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "payment_confirmed",
        title: "Плащането е потвърдено",
        body: "Gold статус активиран за 30 дни.",
        link: "/payments",
      })
    } else if (actualPriceId === companyPriceId) {
      const { data: companyData } = await supabaseAdmin
        .from("companies")
        .select("paid_until")
        .eq("id", userId)
        .single()

      const currentUntil = companyData?.paid_until ? new Date(companyData.paid_until) : null
      const base = currentUntil && currentUntil > now ? currentUntil : now
      const newUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

      await supabaseAdmin
        .from("companies")
        .update({ paid_until: newUntil.toISOString() })
        .eq("id", userId)

      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        user_type: "company",
        amount: session.amount_total / 100,
        description: "Достъп до търсене — 30 дни",
        stripe_payment_intent_id: session.payment_intent,
        stripe_checkout_session_id: session.id,
      })

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "payment_confirmed",
        title: "Плащането е потвърдено",
        body: "Достъп до търсене на кандидати активиран за 30 дни.",
        link: "/payments",
      })
    } else {
      // Не е нито едно от двата стари, hardcoded продукта — проверяваме
      // новата product_prices таблица (State Credits пакети, нива на обяви).
      const { data: product } = await supabaseAdmin
        .from("product_prices")
        .select("*")
        .eq("stripe_price_id", actualPriceId)
        .maybeSingle()

      if (product?.product_type === "credit_bundle") {
        const { data: companyData } = await supabaseAdmin
          .from("companies")
          .select("token_balance")
          .eq("id", userId)
          .single()

        const newBalance = (companyData?.token_balance || 0) + product.credits

        await supabaseAdmin
          .from("companies")
          .update({ token_balance: newBalance })
          .eq("id", userId)

        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          user_type: "company",
          amount: session.amount_total / 100,
          description: `${product.label} (+${product.credits} State Credits)`,
          stripe_payment_intent_id: session.payment_intent,
          stripe_checkout_session_id: session.id,
        })

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "payment_confirmed",
          title: "Плащането е потвърдено",
          body: `+${product.credits} State Credits добавени към баланса ти.`,
          link: "/payments",
        })
      } else if (product?.product_type === "job_tier") {
        const jobListingId = session.metadata?.jobListingId
        const tierRank = { silver: 1, gold: 2, platinum: 3, diamond: 4 }[product.tier] || 0

        if (jobListingId) {
          const { data: jobListing } = await supabaseAdmin
            .from("job_listings")
            .select("published_at, post_to_facebook, company_id")
            .eq("id", jobListingId)
            .single()

          // ============================================================
          // ПРОВЕРКА ЗА СОБСТВЕНОСТ — jobListingId идва от client-side
          // metadata и НЕ е верифициран от Stripe. Без тази проверка
          // всяка фирма би могла да плати за ниво и да го насочи към
          // ЧУЖДА обява (metadata.jobListingId = произволен UUID).
          // ============================================================
          if (!jobListing || jobListing.company_id !== userId) {
            console.error(
              `job_tier webhook: ownership mismatch — jobListingId=${jobListingId}, ` +
              `expected company=${jobListing?.company_id}, got userId=${userId}`
            )
            // Плащането реално е станало в Stripe, но НЕ прилагаме
            // ъпдейт към чужда/несъществуваща обява. Записваме плащането
            // за проследимост, за да можеш да го обработиш ръчно (refund
            // или контакт с потребителя), вместо тихо да изчезне.
            await supabaseAdmin.from("payments").insert({
              user_id: userId,
              user_type: "company",
              amount: session.amount_total / 100,
              description: `${product.label} за обява — ГРЕШКА: невалиден jobListingId (${jobListingId})`,
              stripe_payment_intent_id: session.payment_intent,
              stripe_checkout_session_id: session.id,
            })
          } else {
            // Обявата е чакала като чернова, докато плащането се потвърди
            // (само при ПЪРВО публикуване — при ъпгрейд на вече публикувана
            // обява статусът остава непроменен от самото начало).
            const isFirstPublish = !jobListing.published_at

            await supabaseAdmin
              .from("job_listings")
              .update({
                tier: product.tier,
                tier_rank: tierRank,
                status: "published",
                published_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                expiry_reminder_sent: false,
              })
              .eq("id", jobListingId)

            // Само при първо публикуване — matching имейли + Facebook пост.
            if (isFirstPublish) {
              const functionsBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1`
              const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

              try {
                await fetch(`${functionsBase}/match-job-listing`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ jobListingId }),
                })
              } catch (err) {
                console.error("match-job-listing call failed:", err)
              }

              if (jobListing?.post_to_facebook) {
                try {
                  await fetch(`${functionsBase}/post-job-to-facebook`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ jobListingId }),
                  })
                } catch (err) {
                  console.error("post-job-to-facebook call failed:", err)
                }
              }
            }

            await supabaseAdmin.from("payments").insert({
              user_id: userId,
              user_type: "company",
              amount: session.amount_total / 100,
              description: `${product.label} за обява`,
              stripe_payment_intent_id: session.payment_intent,
              stripe_checkout_session_id: session.id,
            })

            await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              type: "payment_confirmed",
              title: "Плащането е потвърдено",
              body: `Обявата "${job.title}" вече е ${product.label}.`,
              link: "/company-jobs",
            })
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
