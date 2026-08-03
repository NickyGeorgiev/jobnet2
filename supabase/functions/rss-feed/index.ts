import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

Deno.serve(async (req) => {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, title, excerpt, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30)

  const items = (posts || []).map((post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://jobstate.net/blog/${post.slug}</link>
      <guid>https://jobstate.net/blog/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || "")}</description>
    </item>`).join("")

  const xml = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Jobstate — Блог</title>
    <link>https://jobstate.net/blog</link>
    <description>Съвети за търсене на работа, пазар на труда и кариерно развитие.</description>
    <language>bg-BG</language>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
})