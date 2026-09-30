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

  let privateKey = GA_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  if (!pemContents) throw new Error("GA_SERVICE_ACCOUNT_PRIVATE_KEY е празен.");

  let binaryDer: Uint8Array;
  try {
    binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("GA_SERVICE_ACCOUNT_PRIVATE_KEY не е валиден Base64/PEM private key.");
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

  return tokenData.access_token as string;
}

async function runBatchReports(accessToken: string, reports: any[]) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:batchRunReports`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: reports }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error("GA4 batchRunReports failed: " + JSON.stringify(data));
  return data;
}

function simplifyRows(gaResponse: any) {
  if (!gaResponse) return [];

  const dimensionHeaders = (gaResponse.dimensionHeaders || []).map(
    (h: any) => h.name
  );

  const metricHeaders = (gaResponse.metricHeaders || []).map(
    (h: any) => h.name
  );

  return (gaResponse.rows || []).map((row: any) => {
    const out: Record<string, string | number> = {};

    (row.dimensionValues || []).forEach((val: any, idx: number) => {
      if (dimensionHeaders[idx]) {
        out[dimensionHeaders[idx]] = val.value;
      }
    });

    (row.metricValues || []).forEach((val: any, idx: number) => {
      if (metricHeaders[idx]) {
        out[metricHeaders[idx]] = Number(val.value);
      }
    });

    return out;
  });
}

const firstRow = (res: any) => {
  const rows = simplifyRows(res);
  return rows[0] || {};
};

const summaryReport = (startDate: string, endDate: string) => ({
  dateRanges: [{ startDate, endDate }],
  metrics: [
    { name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" },
    { name: "screenPageViews" }, { name: "engagedSessions" }, { name: "engagementRate" },
    { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "eventCount" }, { name: "keyEvents" },
  ],
});

const dateReport = (startDate: string, endDate: string) => ({
  dateRanges: [{ startDate, endDate }],
  dimensions: [{ name: "date" }],
  metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "engagedSessions" }],
  orderBys: [{ dimension: { dimensionName: "date" } }],
});

const orderedReport = (startDate: string, endDate: string, dimensions: string[], metrics: string[], orderMetric: string, limit: number) => ({
  dateRanges: [{ startDate, endDate }],
  dimensions: dimensions.map((name) => ({ name })),
  metrics: metrics.map((name) => ({ name })),
  orderBys: [{ metric: { metricName: orderMetric }, desc: true }],
  limit,
});

function getPreviousPeriod(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const day = 24 * 60 * 60 * 1000;
  const numberOfDays = Math.round((end.getTime() - start.getTime()) / day) + 1;
  const previousEnd = new Date(start.getTime() - day);
  const previousStart = new Date(previousEnd.getTime() - (numberOfDays - 1) * day);

  return {
    previousStartDate: previousStart.toISOString().slice(0, 10),
    previousEndDate: previousEnd.toISOString().slice(0, 10),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const startDate = body?.startDate || "30daysAgo";
    const endDate = body?.endDate || "yesterday";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Липсва Authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Не сте логнати" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Нямате права" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let previousStartDate = "60daysAgo";
    let previousEndDate = "31daysAgo";
    if (!startDate.includes("Ago")) {
      const prev = getPreviousPeriod(startDate, endDate);
      previousStartDate = prev.previousStartDate;
      previousEndDate = prev.previousEndDate;
    }

    const accessToken = await getGoogleAccessToken();

    const batch1 = await runBatchReports(accessToken, [
      summaryReport(startDate, endDate),
      summaryReport(previousStartDate, previousEndDate),
      dateReport(startDate, endDate),
    ]);

    const batch2 = await runBatchReports(accessToken, [
      orderedReport(
        startDate,
        endDate,
        ["sessionDefaultChannelGroup"],
        ["sessions", "activeUsers", "screenPageViews", "engagedSessions"],
        "sessions",
        15
      ),
      orderedReport(
        startDate,
        endDate,
        ["sessionSourceMedium"],
        ["sessions", "activeUsers", "screenPageViews"],
        "sessions",
        20
      ),
      orderedReport(
        startDate,
        endDate,
        ["sessionCampaignName"],
        ["sessions", "activeUsers", "screenPageViews"],
        "sessions",
        20
      ),
      orderedReport(
        startDate,
        endDate,
        ["pagePath"],
        ["screenPageViews", "activeUsers"],
        "screenPageViews",
        30
      ),
      orderedReport(
        startDate,
        endDate,
        ["landingPage"],
        ["sessions", "activeUsers", "screenPageViews"],
        "sessions",
        20
      ),
    ]);

    const batch3 = await runBatchReports(accessToken, [
      orderedReport(
        startDate,
        endDate,
        ["deviceCategory"],
        ["activeUsers", "newUsers", "sessions", "screenPageViews"],
        "activeUsers",
        10
      ),
      orderedReport(
        startDate,
        endDate,
        ["browser"],
        ["activeUsers", "sessions", "screenPageViews"],
        "activeUsers",
        15
      ),
      orderedReport(
        startDate,
        endDate,
        ["operatingSystem"],
        ["activeUsers", "sessions", "screenPageViews"],
        "activeUsers",
        15
      ),
      orderedReport(
        startDate,
        endDate,
        ["country"],
        ["activeUsers", "newUsers", "sessions"],
        "activeUsers",
        20
      ),
      orderedReport(
        startDate,
        endDate,
        ["city"],
        ["activeUsers", "sessions"],
        "activeUsers",
        25
      ),
    ]);

    const batch4 = await runBatchReports(accessToken, [
      orderedReport(
        startDate,
        endDate,
        ["eventName"],
        ["eventCount", "keyEvents"],
        "eventCount",
        50
      ),
    ]);

    const [b1, b2, b3, b4] = [
      batch1.reports || [],
      batch2.reports || [],
      batch3.reports || [],
      batch4.reports || [],
    ];

    return new Response(
      JSON.stringify({
        period: { startDate, endDate },
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate },
        summary: firstRow(b1[0]),
        previousSummary: firstRow(b1[1]),
        daily: simplifyRows(b1[2]),
        channels: simplifyRows(b2[0]),
        sources: simplifyRows(b2[1]),
        campaigns: simplifyRows(b2[2]),
        pages: simplifyRows(b2[3]),
        landingPages: simplifyRows(b2[4]),
        devices: simplifyRows(b3[0]),
        browsers: simplifyRows(b3[1]),
        operatingSystems: simplifyRows(b3[2]),
        countries: simplifyRows(b3[3]),
        cities: simplifyRows(b3[4]),
        events: simplifyRows(b4[0]),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ga-stats error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});