import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { topic } = await req.json()

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

    // Само admin може да генерира чернови
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Нямате права" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Напиши блог статия на български език за платформа за търсене на работа (Jobstate), на тема: "${topic}".

Изисквания:
- Заглавие (кратко, привличащо внимание, до 70 символа)
- Кратко резюме (1-2 изречения, до 160 символа, за SEO мета описание)
- Съдържание в HTML формат (使用 <h3>, <p>, <ul>/<li> тагове), 500-800 думи, полезно и конкретно, не generic

Отговори САМО с валиден JSON обект в този точен формат, без markdown code блок, без допълнителен текст:
{"title": "...", "excerpt": "...", "content": "..."}`,
        }],
      }),
    })

    const aiData = await aiRes.json()

    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: aiData.error?.message || "AI грешка" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rawText = aiData.content[0].text
    const cleaned = rawText.replace(/```json|```/g, "").trim()
    const draft = JSON.parse(cleaned)

    return new Response(JSON.stringify(draft), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})