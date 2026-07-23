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
    const priceId = session.line_items?.data?.[0]?.price?.id

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
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})