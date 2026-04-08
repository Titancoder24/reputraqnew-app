import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/cron/daily-report - Generate daily reports                */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (
      !cronSecret ||
      (authHeader !== `Bearer ${cronSecret}` &&
        request.nextUrl.searchParams.get("secret") !== cronSecret)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // Get all active orgs
    const { data: orgs, error: orgsError } = await admin
      .from("organizations")
      .select("id, brand_name, subscriptions!inner(status)")
      .eq("monitoring_active", true)
      .eq("subscriptions.status", "active");

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { success: true, message: "No active organizations" },
        { status: 200 }
      );
    }

    // Yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const reportsGenerated: string[] = [];
    const errors: { org_id: string; error: string }[] = [];

    for (const org of orgs) {
      try {
        // Count results from yesterday
        const { count: totalResults } = await admin
          .from("search_results")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .gte("collected_at", yesterday.toISOString())
          .lte("collected_at", yesterdayEnd.toISOString());

        // Count by sentiment
        const { data: sentimentData } = await admin
          .from("search_results")
          .select("sentiment")
          .eq("org_id", org.id)
          .gte("collected_at", yesterday.toISOString())
          .lte("collected_at", yesterdayEnd.toISOString());

        const sentimentBreakdown: Record<string, number> = {
          Positive: 0,
          Negative: 0,
          Neutral: 0,
          Mixed: 0,
        };
        for (const row of sentimentData || []) {
          if (row.sentiment && sentimentBreakdown[row.sentiment] !== undefined) {
            sentimentBreakdown[row.sentiment]++;
          }
        }

        // Count risk flags
        const { count: riskCount } = await admin
          .from("search_results")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("risk_flag", true)
          .gte("collected_at", yesterday.toISOString())
          .lte("collected_at", yesterdayEnd.toISOString());

        // Count scans
        const { count: scanCount } = await admin
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .gte("started_at", yesterday.toISOString())
          .lte("started_at", yesterdayEnd.toISOString());

        // Insert report
        const { error: insertError } = await admin.from("reports").insert({
          org_id: org.id,
          report_type: "daily",
          period_start: yesterday.toISOString(),
          period_end: yesterdayEnd.toISOString(),
          data: {
            total_results: totalResults || 0,
            sentiment_breakdown: sentimentBreakdown,
            risk_flags: riskCount || 0,
            scans_run: scanCount || 0,
          },
          generated_at: new Date().toISOString(),
        });

        if (insertError) {
          errors.push({ org_id: org.id, error: insertError.message });
        } else {
          reportsGenerated.push(org.id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ org_id: org.id, error: msg });
      }
    }

    return NextResponse.json(
      {
        success: true,
        reports_generated: reportsGenerated.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Daily report cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
