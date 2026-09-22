import { createClient } from 'npm:@supabase/supabase-js@2'

const WORKER_URL = 'https://jobstate-registry-test.n-georrgiev.workers.dev'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function normalizeCompanyName(name: string) {
  return (name || '')
    .toUpperCase()
    .replace(/["\u201E\u201C]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { valid: false, error: 'Разрешени са само POST заявки.' },
      405
    )
  }

  // Клиентът се проверява с неговия JWT токен.
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return jsonResponse(
      { valid: false, error: 'Не сте логнати.' },
      401
    )
  }

  try {
    const { eik, companyName } = await req.json()

    if (!eik || !/^\d{9}$/.test(eik)) {
      return jsonResponse(
        {
          valid: false,
          error: 'ЕИК трябва да бъде точно 9 цифри.',
        },
        400
      )
    }

    if (!companyName?.trim()) {
      return jsonResponse(
        {
          valid: false,
          error: 'Въведете име на фирмата преди проверка на ЕИК.',
        },
        400
      )
    }

    // Използва се само в Edge Function.
    // SUPABASE_SERVICE_ROLE_KEY НЕ трябва да бъде в React/Vite env.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Ако фирмата вече е верифицирана, отказваме нова проверка.
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, eik_verified')
      .eq('id', user.id)
      .single()

    if (companyError || !company) {
      return jsonResponse(
        {
          valid: false,
          error: 'Не е открит фирмен профил.',
        },
        404
      )
    }

    if (company.eik_verified) {
      return jsonResponse(
        {
          valid: false,
          alreadyVerified: true,
          error: 'ЕИК вече е потвърден и не може да бъде променян.',
        },
        409
      )
    }

    const response = await fetch(
      `${WORKER_URL}/?eik=${encodeURIComponent(eik)}`
    )

    const body = await response.text()

    if (!response.ok || !body) {
      return jsonResponse({
        valid: false,
        error: 'Неуспешна проверка в Търговския регистър.',
      })
    }

    const registry = JSON.parse(body)

    // Освен че има отговор, проверяваме дали върнатият ЕИК е същият.
    if (!registry.uic || String(registry.uic).trim() !== eik) {
      return jsonResponse({
        valid: false,
        error: 'Не е открита фирма с този ЕИК.',
      })
    }

    const registryName = normalizeCompanyName(registry.fullName)
    const enteredName = normalizeCompanyName(companyName)

    const nameMatches =
      registryName.includes(enteredName) ||
      enteredName.includes(registryName)

    if (!nameMatches) {
      return jsonResponse({
        valid: false,
        error: `Въведеният ЕИК не е на тази фирма!`,
      })
    }

    // Това е единственото място, което има право да маркира ЕИК като verified.
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        bulstat: eik,
        company_name: companyName.trim(),
        eik_verified: true,
        eik_verified_name: registry.fullName,
      })
      .eq('id', user.id)
      .eq('eik_verified', false)
      .select('id')
      .maybeSingle()

    if (updateError) {
      return jsonResponse(
        {
          valid: false,
          error: 'Грешка при запазване на верификацията.',
        },
        500
      )
    }

    if (!updatedCompany) {
      return jsonResponse(
        {
          valid: false,
          alreadyVerified: true,
          error: 'ЕИК вече е потвърден.',
        },
        409
      )
    }

    return jsonResponse({
      valid: true,
      registry: {
        fullName: registry.fullName,
        uic: registry.uic,
      },
    })
  } catch (error) {
    return jsonResponse(
      {
        valid: false,
        error: String(error),
      },
      500
    )
  }
})