import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GA_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL")!;
const GA_SERVICE_ACCOUNT_PRIVATE_KEY = Deno.env.get("GA_SERVICE_ACCOUNT_PRIVATE_KEY")!;
const GA_PROPERTY_ID = Deno.env.get("GA_PROPERTY_ID")!;

function base64url(input: string | ArrayBuffer): string {
  const b64 = typeof input === "string" 
    ? btoa(input) 
    : btoa(String.fromCharCode(...new Uint8Array(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: GA_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) => base64url(JSON.stringify(obj));
  const unsigned = `${encode(header)}.${encode(claimSet)}`;

  const pemContents = GA_SERVICE_ACCOUNT_PRIVATE_KEY
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  if (!pemContents) throw new Error("GA_SERVICE_ACCOUNT_PRIVATE_KEY е празен.");

  let binaryDer: Uint8Array;
  try {
    binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("GA_SERVICE_ACCOUNT_PRIVATE_KEY не е валиден.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${base64url(signature)}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error("Google token exchange failed: " + JSON.stringify(tokenData));

  return tokenData.access_token;
}

async function runRealtimeReport(accessToken: string, body: unknown) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error("GA4 realtime failed: " + JSON.stringify(data));
  return data;
}

function simplifyRows(response: any) {
  const dimensions = (response.dimensionHeaders || []).map((h: any) => h.name);
  const metrics = (response.metricHeaders || []).map((h: any) => h.name);

  return (response.rows || []).map((row: any) => {
    const out: Record<string, string | number> = {};
    (row.dimensionValues || []).forEach((val: any, idx: number) => {
      out[dimensions[idx]] = val.value;
    });
    (row.metricValues || []).forEach((val: any, idx: number) => {
      out[metrics[idx]] = Number(val.value);
    });
    return out;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Липсва Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Не сте логнати" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Нямате права" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getGoogleAccessToken();
    const response = await runRealtimeReport(accessToken, {
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      limit: 20,
    });

    const pages = simplifyRows(response);
    const totalActiveUsers = pages.reduce((sum, row) => sum + Number(row.activeUsers || 0), 0);

    return new Response(
      JSON.stringify({
        totalActiveUsers,
        pages,
        updatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ga-realtime error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});