import { createClient } from "npm:@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { candidateId, subject, message } = await req.json()

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

    // Проверяваме, че user-ят реално е company (не позволяваме на кандидати да пращат имейли произволно)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "company") {
      return new Response(JSON.stringify({ error: "Само фирми могат да пращат съобщения" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("company_name")
      .eq("id", user.id)
      .single()

    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("contact_email, fname")
      .eq("id", candidateId)
      .single()

    if (!candidate?.contact_email) {
      return new Response(JSON.stringify({ error: "Кандидатът няма имейл за връзка" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Jobstate <info@jobstate.net>",
        to: [candidate.contact_email],
        reply_to: user.email,
        subject:`Съобщение от ${company?.company_name || "фирма"} през Jobstate`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px;">
            <p>${message.replace(/\n/g, "<br>")}</p>
            <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;" />
            <p style="color: #888; font-size: 0.85rem;">
              Изпратено от <strong>${company?.company_name || "фирма"}</strong> през Jobstate.
              Можете да отговорите директно на този имейл.
            </p>
          </div>
        `,
      }),
    })

    const emailData = await emailRes.json()

    if (!emailRes.ok) {
      return new Response(JSON.stringify({ error: emailData.message || "Грешка при изпращане" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

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