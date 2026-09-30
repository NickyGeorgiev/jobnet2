import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function getDateRange(startDate: string, endDate: string) {
  return {
    start: `${startDate}T00:00:00.000Z`,
    end: `${endDate}T23:59:59.999Z`,
  }
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

function getPreviousPeriod(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  const days =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  const previousEnd = addDays(startDate, -1)
  const previousStart = addDays(previousEnd, -(days - 1))

  return {
    startDate: previousStart,
    endDate: previousEnd,
  }
}

function countError(result: any) {
  return result?.error ?? null
}

function rowsToMap(rows: any[] | null | undefined, key: string) {
  return (rows || []).map((row) => ({
    ...row,
    count: Number(row.count || 0),
  }))
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables" }, 500)
    }

    /*
     * Client using the user's JWT.
     */
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401)
    }

    /*
     * Service-role client.
     */
    const admin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    /*
     * Check admin role.
     */
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Profile error:", profileError)
      return json({ error: "Failed to check user role" }, 500)
    }

    if (!profile || profile.role !== "admin") {
      return json({ error: "Forbidden" }, 403)
    }

    /*
     * Request body.
     */
    const body = await req.json().catch(() => ({}))

    const startDate = body.startDate
    const endDate = body.endDate

    if (!startDate || !endDate) {
      return json({
        error: "startDate and endDate are required",
      }, 400)
    }

    const current = getDateRange(startDate, endDate)

    const previous = getPreviousPeriod(startDate, endDate)
    const previousRange = getDateRange(
      previous.startDate,
      previous.endDate
    )

    /*
     * IMPORTANT:
     * Snapshot statistics are based on NOW,
     * not on the selected analytics period.
     *
     * Active job:
     * published + expiration date has not passed.
     */
    const now = new Date().toISOString()

    /*
     * ============================================================
     * CURRENT PERIOD
     * ============================================================
     */

    const [
      newJobsRes,
      publishedJobsRes,
      newCompaniesRes,
      newCandidatesRes,
      applicationsRes,
      paymentsRevenueRes,
      paymentsCountRes,
      paidJobsRes,
      profileViewsRes,
      searchesRes,
      messagesRes,
      savedJobsRes,
      savedCandidatesRes,
      notificationsRes,
    ] = await Promise.all([
      /*
       * New jobs
       */
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Jobs published during selected period
       */
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .gte("published_at", current.start)
        .lte("published_at", current.end)
        .not("published_at", "is", null),

      /*
       * New companies
       */
      admin
        .from("companies")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * New candidates
       */
      admin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Applications
       */
      admin
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Revenue
       */
      admin
        .from("payments")
        .select("amount")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Number of payments
       */
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Paid job purchases
       *
       * Current payment descriptions contain "Обява".
       */
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end)
        .ilike("description", "%обява%"),

      /*
       * Profile views
       */
      admin
        .from("profile_view_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Candidate/company searches
       */
      admin
        .from("search_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Messages
       */
      admin
        .from("message_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Saved jobs
       */
      admin
        .from("saved_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Saved candidates
       */
      admin
        .from("saved_candidates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      /*
       * Notifications
       */
      admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", current.start)
        .lte("created_at", current.end),
    ])

    /*
     * Check important errors.
     */
    const currentErrors = [
      newJobsRes,
      publishedJobsRes,
      newCompaniesRes,
      newCandidatesRes,
      applicationsRes,
      paymentsRevenueRes,
      paymentsCountRes,
      paidJobsRes,
      profileViewsRes,
      searchesRes,
      messagesRes,
      savedJobsRes,
      savedCandidatesRes,
      notificationsRes,
    ]

    const currentError = currentErrors.find((result) => result.error)

    if (currentError?.error) {
      console.error("Current period error:", currentError.error)

      return json({
        error: currentError.error.message || "Database query failed",
      }, 500)
    }

    /*
     * Revenue calculation.
     */
    const revenue = (paymentsRevenueRes.data || []).reduce(
      (sum: number, payment: any) => {
        return sum + Number(payment.amount || 0)
      },
      0
    )

    /*
     * ============================================================
     * PREVIOUS PERIOD
     * ============================================================
     */

    const [
      previousJobsRes,
      previousCompaniesRes,
      previousCandidatesRes,
      previousApplicationsRes,
      previousPaymentsRes,
      previousProfileViewsRes,
    ] = await Promise.all([
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),

      admin
        .from("companies")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),

      admin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),

      admin
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),

      admin
        .from("payments")
        .select("amount")
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),

      admin
        .from("profile_view_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousRange.start)
        .lte("created_at", previousRange.end),
    ])

    const previousErrors = [
      previousJobsRes,
      previousCompaniesRes,
      previousCandidatesRes,
      previousApplicationsRes,
      previousPaymentsRes,
      previousProfileViewsRes,
    ]

    const previousError = previousErrors.find(
      (result) => result.error
    )

    if (previousError?.error) {
      console.error("Previous period error:", previousError.error)

      return json({
        error:
          previousError.error.message ||
          "Previous period query failed",
      }, 500)
    }

    const previousRevenue = (
      previousPaymentsRes.data || []
    ).reduce((sum: number, payment: any) => {
      return sum + Number(payment.amount || 0)
    }, 0)

    /*
     * ============================================================
     * CURRENT SNAPSHOT
     * ============================================================
     *
     * These are NOT affected by the selected period.
     * They describe the current state of the platform.
     */

    const [
      activeJobsRes,
      expiredJobsRes,
      draftJobsRes,
      activeCandidatesRes,
      goldCandidatesRes,
      verifiedCompaniesRes,
      activeJobCompaniesRes,
    ] = await Promise.all([
      /*
       * ACTIVE JOBS
       *
       * Published and expiration date has not passed.
       */
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gte("expires_at", now),

      /*
       * EXPIRED PUBLISHED JOBS
       */
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .lt("expires_at", now)
        .not("expires_at", "is", null),

      /*
       * DRAFT JOBS
       */
      admin
        .from("job_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),

      /*
       * ACTIVE CANDIDATES
       */
      admin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("active", true),

      /*
       * GOLD CANDIDATES
       */
      admin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("is_gold", true),

      /*
       * VERIFIED COMPANIES
       */
      admin
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("eik_verified", true),

      /*
       * Companies currently having at least one active job.
       *
       * We get company IDs and count unique companies below.
       */
      admin
        .from("job_listings")
        .select("company_id")
        .eq("status", "published")
        .gte("expires_at", now),
    ])

    const snapshotErrors = [
      activeJobsRes,
      expiredJobsRes,
      draftJobsRes,
      activeCandidatesRes,
      goldCandidatesRes,
      verifiedCompaniesRes,
      activeJobCompaniesRes,
    ]

    const snapshotError = snapshotErrors.find(
      (result) => result.error
    )

    if (snapshotError?.error) {
      console.error("Snapshot error:", snapshotError.error)

      return json({
        error:
          snapshotError.error.message ||
          "Snapshot query failed",
      }, 500)
    }

    const activeCompanyIds = new Set(
      (activeJobCompaniesRes.data || [])
        .map((row: any) => row.company_id)
        .filter(Boolean)
    )

    /*
     * ============================================================
     * JOB BREAKDOWNS
     * ============================================================
     */

    const [
      jobTiersRes,
      jobStatusesRes,
      jobCitiesRes,
      jobSectorsRes,
      topViewedJobsRes,
    ] = await Promise.all([
      admin
        .from("job_listings")
        .select("tier")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_listings")
        .select("status")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_listings")
        .select("city")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_listings")
        .select("sector")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_listings")
        .select(
          "id,title,company_id,view_count,status,created_at,expires_at"
        )
        .order("view_count", { ascending: false })
        .limit(10),
    ])

    const jobBreakdownErrors = [
      jobTiersRes,
      jobStatusesRes,
      jobCitiesRes,
      jobSectorsRes,
      topViewedJobsRes,
    ]

    const jobBreakdownError = jobBreakdownErrors.find(
      (result) => result.error
    )

    if (jobBreakdownError?.error) {
      console.error(
        "Job breakdown error:",
        jobBreakdownError.error
      )

      return json({
        error:
          jobBreakdownError.error.message ||
          "Job breakdown query failed",
      }, 500)
    }

    function countValues(rows: any[], field: string) {
      const counts = new Map<string, number>()

      for (const row of rows || []) {
        const value = row[field]

        if (!value) continue

        counts.set(
          value,
          (counts.get(value) || 0) + 1
        )
      }

      return Array.from(counts.entries())
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count)
    }

    const jobTiers = countValues(
      jobTiersRes.data || [],
      "tier"
    )

    const jobStatuses = countValues(
      jobStatusesRes.data || [],
      "status"
    )

    const jobCities = countValues(
      jobCitiesRes.data || [],
      "city"
    )

    const jobSectors = countValues(
      jobSectorsRes.data || [],
      "sector"
    )

    /*
     * ============================================================
     * APPLICATION BREAKDOWNS
     * ============================================================
     */

    const [
      applicationStatusesRes,
      applicationsByJobRes,
      dailyApplicationsRes,
    ] = await Promise.all([
      admin
        .from("job_applications")
        .select("status")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_applications")
        .select("job_listing_id")
        .gte("created_at", current.start)
        .lte("created_at", current.end),

      admin
        .from("job_applications")
        .select("created_at")
        .gte("created_at", current.start)
        .lte("created_at", current.end)
        .order("created_at", { ascending: true }),
    ])

    const applicationErrors = [
      applicationStatusesRes,
      applicationsByJobRes,
      dailyApplicationsRes,
    ]

    const applicationError = applicationErrors.find(
      (result) => result.error
    )

    if (applicationError?.error) {
      console.error(
        "Application breakdown error:",
        applicationError.error
      )

      return json({
        error:
          applicationError.error.message ||
          "Application breakdown query failed",
      }, 500)
    }

    const applicationStatuses = countValues(
      applicationStatusesRes.data || [],
      "status"
    )

    const applicationsByJobMap = new Map<string, number>()

    for (const row of applicationsByJobRes.data || []) {
      if (!row.job_listing_id) continue

      applicationsByJobMap.set(
        row.job_listing_id,
        (applicationsByJobMap.get(row.job_listing_id) || 0) + 1
      )
    }

    const topApplicationJobIds = Array.from(
      applicationsByJobMap.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    let applicationsByJob: any[] = []

    if (topApplicationJobIds.length > 0) {
      const ids = topApplicationJobIds.map(
        ([id]) => id
      )

      const { data: jobs, error } = await admin
        .from("job_listings")
        .select("id,title,company_id,status")
        .in("id", ids)

      if (error) {
        console.error(
          "Applications job lookup error:",
          error
        )

        return json({
          error: error.message,
        }, 500)
      }

      applicationsByJob = topApplicationJobIds.map(
        ([id, count]) => {
          const job = (jobs || []).find(
            (item: any) => item.id === id
          )

          return {
            jobId: id,
            title: job?.title || "Unknown",
            companyId: job?.company_id || null,
            status: job?.status || null,
            count,
          }
        }
      )
    }

    /*
     * Daily applications.
     */
    const dailyApplicationsMap = new Map<string, number>()

    for (const row of dailyApplicationsRes.data || []) {
      if (!row.created_at) continue

      const day = String(row.created_at).slice(0, 10)

      dailyApplicationsMap.set(
        day,
        (dailyApplicationsMap.get(day) || 0) + 1
      )
    }

    const dailyApplications = Array.from(
      dailyApplicationsMap.entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }))

    /*
     * ============================================================
     * PAYMENT BREAKDOWN
     * ============================================================
     */

    const { data: paymentRows, error: paymentRowsError } =
      await admin
        .from("payments")
        .select("description,amount,currency,user_type")
        .gte("created_at", current.start)
        .lte("created_at", current.end)

    if (paymentRowsError) {
      console.error(
        "Payment breakdown error:",
        paymentRowsError
      )

      return json({
        error: paymentRowsError.message,
      }, 500)
    }

    const paymentMap = new Map<
      string,
      {
        description: string
        payments: number
        revenue: number
        currency: string
      }
    >()

    for (const payment of paymentRows || []) {
      const description =
        payment.description || "Без описание"

      const currency =
        payment.currency || "EUR"

      const key = `${description}|||${currency}`

      if (!paymentMap.has(key)) {
        paymentMap.set(key, {
          description,
          payments: 0,
          revenue: 0,
          currency,
        })
      }

      const item = paymentMap.get(key)!

      item.payments += 1
      item.revenue += Number(payment.amount || 0)
    }

    const paymentsByProduct = Array.from(
      paymentMap.values()
    ).sort((a, b) => b.revenue - a.revenue)

    /*
     * ============================================================
     * RESPONSE
     * ============================================================
     */

    return json({
      period: {
        startDate,
        endDate,
      },

      previousPeriod: {
        startDate: previous.startDate,
        endDate: previous.endDate,
      },

      summary: {
        newJobs: newJobsRes.count || 0,
        publishedJobs: publishedJobsRes.count || 0,

        newCompanies:
          newCompaniesRes.count || 0,

        newCandidates:
          newCandidatesRes.count || 0,

        applications:
          applicationsRes.count || 0,

        revenue,

        payments:
          paymentsCountRes.count || 0,

        paidJobPurchases:
          paidJobsRes.count || 0,

        profileViews:
          profileViewsRes.count || 0,

        searches:
          searchesRes.count || 0,

        messages:
          messagesRes.count || 0,

        savedJobs:
          savedJobsRes.count || 0,

        savedCandidates:
          savedCandidatesRes.count || 0,

        notifications:
          notificationsRes.count || 0,
      },

      previousSummary: {
        newJobs:
          previousJobsRes.count || 0,

        newCompanies:
          previousCompaniesRes.count || 0,

        newCandidates:
          previousCandidatesRes.count || 0,

        applications:
          previousApplicationsRes.count || 0,

        revenue: previousRevenue,

        profileViews:
          previousProfileViewsRes.count || 0,
      },

      snapshot: {
        activeJobs:
          activeJobsRes.count || 0,

        expiredJobs:
          expiredJobsRes.count || 0,

        draftJobs:
          draftJobsRes.count || 0,

        activeCandidates:
          activeCandidatesRes.count || 0,

        goldCandidates:
          goldCandidatesRes.count || 0,

        verifiedCompanies:
          verifiedCompaniesRes.count || 0,

        companiesWithActiveJobs:
          activeCompanyIds.size,
      },

      jobs: {
        tiers: jobTiers,
        statuses: jobStatuses,
        cities: jobCities,
        sectors: jobSectors,
        topViewed: topViewedJobsRes.data || [],
      },

      applications: {
        statuses: applicationStatuses,
        byJob: applicationsByJob,
        daily: dailyApplications,
      },

      payments: {
        byProduct: paymentsByProduct,
      },
    })
  } catch (error) {
    console.error("db-stats error:", error)

    return json({
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    }, 500)
  }
})