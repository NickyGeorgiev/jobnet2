import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug")

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("title, excerpt, cover_image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  const title = post ? escapeHtml(post.title) : "Jobstate — Блог"
  const description = post ? escapeHtml(post.excerpt || "") : "Съвети за търсене на работа и кариерно развитие."
  const image = post?.cover_image_url || "https://jobstate.net/og-facebook.jpg"
  const pageUrl = `https://jobstate.net/blog/${slug}`

  const html = `\uFEFF<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0; url=${pageUrl}" />
</head>
<body>
  <a href="${pageUrl}">${title}</a>
</body>
</html>`

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
})