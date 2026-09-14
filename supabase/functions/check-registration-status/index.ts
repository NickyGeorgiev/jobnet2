import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STALE_HOURS = 24

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email е задължителен' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: rows, error } = await supabase.rpc('get_user_registration_status', {
      check_email: email,
    })

    if (error) {
      console.error('get_user_registration_status error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const existing = rows?.[0]

    // Няма съществуващ акаунт с този имейл — свободно за регистрация.
    if (!existing) {
      return new Response(JSON.stringify({ status: 'available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Вече има потвърден акаунт — не позволяваме нова регистрация.
    if (existing.confirmed) {
      return new Response(JSON.stringify({ status: 'confirmed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Има непотвърден акаунт — проверяваме възрастта му.
    const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60)

    if (ageHours < STALE_HOURS) {
      // Все още в прозореца от 24ч — не създаваме дубликат, само казваме на клиента.
      return new Response(
        JSON.stringify({ status: 'pending', hoursRemaining: Math.ceil(STALE_HOURS - ageHours) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // По-стар от 24ч, никога непотвърден — чистим изоставения запис
    // и позволяваме чист нов опит за регистрация.
    await supabase.from('companies').delete().eq('id', existing.user_id)
    await supabase.from('candidates').delete().eq('id', existing.user_id)
    await supabase.auth.admin.deleteUser(existing.user_id)

    return new Response(JSON.stringify({ status: 'available', cleanedUp: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('check-registration-status error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})