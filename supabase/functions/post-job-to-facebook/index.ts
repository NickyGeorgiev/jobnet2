import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FB_PAGE_ID = Deno.env.get('FB_PAGE_ID')!
const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Няколко различни "гласа" за поста — избира се на случаен принцип,
// за да не изглеждат публикациите като поточна линия една след друга.
function buildMessage(title: string, city: string | null, salaryLine: string) {
  const templates = [
    `🔥 Ново свободно място!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\nКандидатствай тук 👇`,
    `Търсиш нова работа? 👀\n${title} те чака${city ? ` в ${city}` : ''}.${salaryLine}\n\nВиж повече 👇`,
    `Една нова възможност се появи ✨\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\nЛинкът е тук 👇`,
    `🚀 Следващата ти работа може да е тук!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\n👇 Разгледай обявата`,
    `👀 Може би точно това търсиш...\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\nКандидатствай тук 👇`,
    `💼 Нов шанс за твоето развитие!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\n👇 Виж обявата`,
    `⚡ Току-що публикувана работа!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\nНе я изпускай 👇`,
    `🎯 Следващата стъпка в кариерата ти?\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\n👇 Научи повече`,
    `💰 Нова възможност за работа!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\nВиж детайлите 👇`,
    `✨ Работа, която може да ти допадне!\n${title}${city ? `\n📍 ${city}` : ''}${salaryLine}\n\n👇 Кандидатствай сега`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jobListingId } = await req.json()

    if (!jobListingId) {
      return new Response(JSON.stringify({ error: 'jobListingId е задължителен' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================================
    // АВТЕНТИКАЦИЯ — тази функция се вика по два начина:
    // 1) от stripe-webhook (server-to-server, с service_role ключ)
    // 2) директно от frontend-а на логнатата фирма след публикуване
    // Проверяваме кой от двата е налице — иначе всеки в интернет
    // би могъл да спамва Facebook страницата с произволен jobListingId.
    // ============================================================
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: job, error: jobError } = await supabase
      .from('job_listings')
      .select('id, title, slug, city, salary, salary_visible, status, company_id')
      .eq('id', jobListingId)
      .single()

    if (jobError || !job || job.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Обявата не е намерена или не е публикувана' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isServiceRole) {
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabaseAuth.auth.getUser()

      if (!user || user.id !== job.company_id) {
        return new Response(JSON.stringify({ error: 'Нямаш достъп до тази обява' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const jobUrl = `https://jobs.jobstate.net/jobs/${job.slug}-${job.id}`
    const salaryLine = job.salary_visible && job.salary ? `\n💰 от ${job.salary} € / месец` : ''
    const message = buildMessage(job.title, job.city, salaryLine)

    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed?access_token=${FB_PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, link: jobUrl }),
      }
    )

    const fbData = await fbRes.json()

    if (!fbRes.ok) {
      console.error('Facebook post error:', fbData)
      return new Response(JSON.stringify({ error: fbData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ posted: true, fbPostId: fbData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('post-job-to-facebook error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
