import { createClient } from "npm:@supabase/supabase-js@2";

const WORKER_URL = "https://jobstate-registry-test.n-georrgiev.workers.dev";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Само логнат потребител може да вика тази функция — иначе всеки
  // в интернет би могъл да спамва Cloudflare Worker-а безкрайно.
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ valid: false, error: "Не сте логнати." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const eik = new URL(req.url).searchParams.get("eik");

    if (!eik || !/^\d{9}$/.test(eik)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Невалиден EIK.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    const response = await fetch(
      `${WORKER_URL}/?eik=${encodeURIComponent(eik)}`
    );

    const body = await response.text();

    if (!response.ok || !body) {
      return new Response(
        JSON.stringify({
          valid: false,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    const data = JSON.parse(body);

    if (!data.uic) {
      return new Response(
        JSON.stringify({
          valid: false,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        registry: data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
});