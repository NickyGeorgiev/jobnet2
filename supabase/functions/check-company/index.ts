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

// Правни форми, които не се броят за част от името при сравнението.
const LEGAL_FORMS = ['ЕООД', 'ООД', 'ЕАД', 'АД', 'КДА', 'КД', 'СД', 'ЕТ', 'СНЦ', 'ДЗЗД']

// Латински букви, изглеждащи като кирилски (напр. "TECT" вместо "ТЕСТ").
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н',
  O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'У',
}

// Връща "ядрото" на името: без кавички, пунктуация, интервали и правна форма.
// "ТЕСТ ГРУП" ЕООД  ->  ТЕСТГРУП
function normalizeCompanyName(name: string) {
  return (name || '')
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
    .replace(/\./g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !LEGAL_FORMS.includes(word))
    .join('')
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

    // Ако след изчистването не е останало име (напр. въведено само "ЕООД"
    // или една буква), не можем да сравним смислено.
    if (enteredName.length < 2) {
      return jsonResponse({
        valid: false,
        error: 'Въведете името на фирмата, а не само правната форма.',
      })
    }

    // Точно съвпадение на ядрото на името — не "съдържа".
    if (!registryName || registryName !== enteredName) {
      return jsonResponse({
        valid: false,
        error:
          'Въведеното име не съвпада с името в Търговския регистър за този ЕИК. Въведете го точно както е вписано (правната форма не е задължителна).',
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