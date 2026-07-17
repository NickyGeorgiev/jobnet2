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

// Безопасно взима "current_period_end" — понякога е на горно ниво,
// понякога живее вътре в items.data[0] (зависи от Stripe API версията на payload-а)
function getPeriodEnd(subscription) {
  const raw = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end
  return raw ? new Date(raw * 1000).toISOString() : null
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature")!
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook грешка: ${err.message}`, { status: 400 })
  }

  const goldPriceId = Deno.env.get("STRIPE_GOLD_PRICE_ID")
  const companyMonthlyPriceId = Deno.env.get("STRIPE_COMPANY_MONTHLY_PRICE_ID")
  const companyYearlyPriceId = Deno.env.get("STRIPE_COMPANY_YEARLY_PRICE_ID")
  const companyPriceIds = [companyMonthlyPriceId, companyYearlyPriceId]

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const userId = session.client_reference_id
    const customerId = session.customer
    const subscriptionId = session.subscription

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0].price.id

    if (priceId === goldPriceId) {
      await supabaseAdmin
        .from("candidates")
        .update({ is_gold: true, stripe_customer_id: customerId })
        .eq("id", userId)
    } else if (companyPriceIds.includes(priceId)) {
      const { error: upsertError } = await supabaseAdmin
        .from("subscriptions")
        .upsert({
          company_id: userId,
          plan: "company_plan",
          status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: getPeriodEnd(subscription),
          cancel_at_period_end: false,
        }, { onConflict: "company_id" })

      if (upsertError) {
        console.error("Грешка при запис на subscription:", upsertError.message)
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object

    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_end: getPeriodEnd(subscription),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq("stripe_subscription_id", subscription.id)

    if (updateError) {
      console.error("Грешка при update:", updateError.message)
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object
    const priceId = subscription.items.data[0].price.id

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