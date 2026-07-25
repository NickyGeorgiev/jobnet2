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
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Моля, попълнете всички полета" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const trimmedEmail = email.trim()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Невалиден имейл адрес" }), {
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
        from: "Jobstate контактна форма <onboarding@resend.dev>",
        to: ["n.georrgiev@gmail.com"],
        reply_to: [trimmedEmail],
        subject: `Ново съобщение от ${name} (контактна форма)`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px;">
            <p><strong>От:</strong> ${name} (${email})</p>
            <hr style="margin: 1rem 0; border: none; border-top: 1px solid #ddd;" />
            <p>${message.replace(/\n/g, "<br>")}</p>
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