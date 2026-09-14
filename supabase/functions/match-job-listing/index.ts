import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // service_role ключ — тази функция трябва да чете candidates без RLS
    // ограничения (тя не действа от името на конкретен логнат потребител).
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Заредете обявата
    const { data: job, error: jobError } = await supabase
      .from('job_listings')
      .select('id, title, slug, city, sector, level, duration, salary, salary_max, status, company_id')
      .eq('id', jobListingId)
      .single()

    if (jobError || !job || job.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Обявата не е намерена или не е публикувана' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============================================================
    // АВТЕНТИКАЦИЯ — тази функция се вика по два начина:
    // 1) от stripe-webhook (server-to-server, с service_role ключ)
    // 2) директно от frontend-а на логнатата фирма след публикуване
    // Проверяваме кой от двата е налице — иначе всеки в интернет
    // би могъл да спамва кандидатите с имейли за произволен jobListingId.
    // ============================================================
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY

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

    // Ако липсва някое от нужните полета в обявата, не можем да
    // съпоставим сигурно — пропускаме matching-а тихо (не е грешка).
    if (!job.city || !job.sector || !job.level || !job.duration || job.salary == null) {
      return new Response(JSON.stringify({ matched: 0, sent: 0, reason: 'incomplete job fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobSalaryCeiling = job.salary_max ?? job.salary

    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('id, fname, contact_email, target_salary')
      .eq('active', true)
      .eq('notify_on_match', true)
      .lte('target_salary', jobSalaryCeiling)
      .contains('target_sector', [job.sector])
      .contains('target_cities', [job.city])
      .contains('target_level', [job.level])
      .contains('target_duration', [job.duration])

    if (candError) {
      console.error('Matching query error:', candError)
      return new Response(JSON.stringify({ error: candError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matched = candidates || []
    const jobUrl = `https://jobs.jobstate.net/jobs/${job.slug}-${job.id}`

    // 3. Изпратете имейл на всеки подходящ кандидат
    let sentCount = 0

    for (const candidate of matched) {
      if (!candidate.contact_email) continue

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Jobstate <info@jobstate.net>',
            to: [candidate.contact_email],
            subject: `Нова обява, отговаряща на критериите ти: ${job.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px;">
                <p>Здравей${candidate.fname ? ', ' + candidate.fname : ''},</p>
                <p>Има нова обява, която отговаря на зададените от теб критерии за работа:</p>
                <h3 style="margin-bottom: 0.3rem;">${job.title}</h3>
                <p style="color: #666; margin-top: 0;">${job.city} · ${job.sector}</p>
                <p>
                  <a href="${jobUrl}" style="display:inline-block;background:#BF953F;color:#201608;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;">
                    Виж обявата и кандидатствай
                  </a>
                </p>
                <p style="color:#888;font-size:0.85rem;margin-top:2rem;">
                  Получаваш този имейл, защото критериите за работа в профила ти в Jobstate съвпадат с тази обява.
                  Можеш да изключиш тези известия по всяко време от таблото си в Jobstate.
                </p>
              </div>
            `,
          }),
        })

        if (emailRes.ok) sentCount++
        else console.error('Resend error for', candidate.contact_email, await emailRes.text())
      } catch (emailErr) {
        console.error('Email send error for', candidate.contact_email, emailErr)
      }
    }

    // In-app известие — отделно от имейла, best-effort (не бива да
    // проваля целия matching процес, ако insert-ването гръмне).
    if (matched.length > 0) {
      try {
        await supabase.from('notifications').insert(
          matched.map((candidate) => ({
            user_id: candidate.id,
            type: 'job_match',
            title: 'Нова обява за теб',
            body: `"${job.title}" отговаря на критериите ти.`,
            link: jobUrl,
          }))
        )
      } catch (notifyErr) {
        console.error('Notification insert error:', notifyErr)
      }
    }

    return new Response(JSON.stringify({ matched: matched.length, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('match-job-listing error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
