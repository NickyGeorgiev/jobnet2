import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const STATIC_PAGES = [
  { path: "", priority: "1.0", freq: "weekly" },
  { path: "about", priority: "0.7", freq: "monthly" },
  { path: "how-it-works", priority: "0.8", freq: "monthly" },
  { path: "contact", priority: "0.5", freq: "yearly" },
  { path: "register", priority: "0.9", freq: "monthly" },
  { path: "login", priority: "0.3", freq: "yearly" },
  { path: "blog", priority: "0.8", freq: "daily" },
]

Deno.serve(async (req) => {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, published_at")
    .eq("status", "published")

  const staticUrls = STATIC_PAGES.map((p) => `
  <url>
    <loc>https://jobstate.net/${p.path}</loc>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("")

  const blogUrls = (posts || []).map((post) => `
  <url>
    <loc>https://jobstate.net/blog/${post.slug}</loc>
    <lastmod>${new Date(post.published_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${blogUrls}
</urlset>`

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
})