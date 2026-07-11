import Stripe from "npm:stripe@17.0.0"
import { createClient } from "npm:@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Не сте логнати" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { type } = await req.json() // "company" или "candidate"

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    let stripeSubscriptionId

    if (type === "company") {
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("company_id", user.id)
        .single()
      stripeSubscriptionId = data?.stripe_subscription_id
    } else {
      // За candidate, взимаме subscription ID директно от Stripe по customer ID
      const { data } = await supabaseAdmin
        .from("candidates")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single()

      if (!data?.stripe_customer_id) {
        return new Response(JSON.stringify({ error: "Няма намерен абонамент" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const subs = await stripe.subscriptions.list({ customer: data.stripe_customer_id, status: "active", limit: 1 })
      stripeSubscriptionId = subs.data[0]?.id
    }

    if (!stripeSubscriptionId) {
      return new Response(JSON.stringify({ error: "Няма намерен активен абонамент" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Отменяме в края на текущия платен период (не веднага) — потребителят
    // запазва достъп до края на вече платения месец, честна практика
    await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})