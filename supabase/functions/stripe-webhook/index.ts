import Stripe from "npm:stripe@17.0.0"
import { createClient } from "npm:@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

// Тук ползваме service_role key (не anon key) — само тази функция,
// живееща на сървъра, има право да пипа данни в заобикаляне на RLS,
// защото трябва да обнови subscription статус на всеки потребител.
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

  // Плащането е успешно завършено (първо плащане при нов абонамент)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session.client_reference_id
    const customerId = session.customer
    const subscriptionId = session.subscription

    // Вземаме детайли за абонамента, за да разберем за какъв продукт става дума
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0].price.id

    const goldPriceId = Deno.env.get("STRIPE_GOLD_PRICE_ID")
    const companyPriceId = Deno.env.get("STRIPE_COMPANY_PRICE_ID")

    if (priceId === goldPriceId) {
      // Candidate купува "gold" статус
      await supabaseAdmin
        .from("candidates")
        .update({ is_gold: true, stripe_customer_id: customerId })
        .eq("id", userId)
    } else if (priceId === companyPriceId) {
      // Company купува план — записваме/обновяваме subscription запис
      await supabaseAdmin
        .from("subscriptions")
        .upsert({
          company_id: userId,
          plan: "company_plan",
          status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "company_id" })
    }
  }

  // Абонаментът е отменен/изтекъл
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object
    const priceId = subscription.items.data[0].price.id
    const goldPriceId = Deno.env.get("STRIPE_GOLD_PRICE_ID")

    if (priceId === goldPriceId) {
      await supabaseAdmin
        .from("candidates")
        .update({ is_gold: false })
        .eq("stripe_customer_id", subscription.customer)
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", subscription.id)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
})