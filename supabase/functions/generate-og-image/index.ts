import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SSR_SITE_URL = Deno.env.get("SSR_SITE_URL") || "https://jobs.jobstate.net"
const OG_INTERNAL_SECRET = Deno.env.get("OG_INTERNAL_SECRET")!

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { jobId } = await req.json()
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId е задължителен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ============================================================
    // АВТЕНТИКАЦИЯ — същият модел като match-job-listing/post-job-to-facebook:
    // или service_role (вика се от stripe-webhook/JobListingForm при запис),
    // или собственика на обявата.
    // ============================================================
    const { data: job, error: jobError } = await supabaseAdmin
      .from("job_listings")
      .select("id, company_id")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Обявата не е намерена" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace(/^Bearer\s+/i, "")
    const isServiceRole = token === SERVICE_KEY

    if (!isServiceRole) {
      const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (!user || user.id !== job.company_id) {
        return new Response(JSON.stringify({ error: "Нямаш достъп до тази обява" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    await supabaseAdmin
      .from("job_listings")
      .update({ og_image_status: "processing" })
      .eq("id", jobId)

    // 1. Рендерираме PNG-то през Next.js (SSR сайта).
    const renderRes = await fetch(`${SSR_SITE_URL}/api/generate-og/${jobId}`, {
      headers: { "x-internal-secret": OG_INTERNAL_SECRET },
    })

    if (!renderRes.ok) {
      const detail = await renderRes.text().catch(() => "")
      await supabaseAdmin
        .from("job_listings")
        .update({ og_image_status: "failed" })
        .eq("id", jobId)
      console.error("generate-og render failed:", renderRes.status, detail)
      return new Response(JSON.stringify({ error: "Рендерирането гръмна" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const pngBytes = new Uint8Array(await renderRes.arrayBuffer())

    // 2. Качваме в Storage bucket "og-images", презаписваме със същото име —
    //    затова версия в URL-а (?v=N), за да накараме Facebook да го види
    //    като различен ресурс след редакция на обявата.
    const storagePath = `${jobId}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from("og-images")
      .upload(storagePath, pngBytes, {
        contentType: "image/png",
        upsert: true,
      })

    if (uploadError) {
      await supabaseAdmin
        .from("job_listings")
        .update({ og_image_status: "failed" })
        .eq("id", jobId)
      console.error("og-images upload failed:", uploadError)
      return new Response(JSON.stringify({ error: "Качването в Storage гръмна" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("og-images")
      .getPublicUrl(storagePath)

    // 3. Записваме готовия линк + увеличаваме версията.
    const { data: currentJob } = await supabaseAdmin
      .from("job_listings")
      .select("og_image_version")
      .eq("id", jobId)
      .single()

    const newVersion = (currentJob?.og_image_version || 0) + 1

    await supabaseAdmin
      .from("job_listings")
      .update({
        og_image_status: "ready",
        og_image_url: `${publicUrlData.publicUrl}?v=${newVersion}`,
        og_image_version: newVersion,
      })
      .eq("id", jobId)

    return new Response(JSON.stringify({ ok: true, url: publicUrlData.publicUrl, version: newVersion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("generate-og-image error:", error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
