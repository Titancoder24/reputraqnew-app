import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiConfig, callGemini } from "@/lib/gemini";

/* ------------------------------------------------------------------ */
/*  GET /api/cron/weekly-report - Generate weekly reports with AI      */
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

    // Last 7 days range
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);

    // Try to get Gemini config for AI summaries
    let geminiConfig: { apiKey: string; model: string } | null = null;
    try {
      geminiConfig = await getGeminiConfig(admin);
    } catch {
      console.warn("Gemini not configured, skipping AI summaries");
    }

    const reportsGenerated: string[] = [];
    const errors: { org_id: string; error: string }[] = [];

    for (const org of orgs) {
      try {
        // Get all results from last 7 days
        const { data: results } = await admin
          .from("search_results")
          .select("sentiment, themes, risk_flag, mention_type, platform, title, snippet")
          .eq("org_id", org.id)
          .gte("collected_at", periodStart.toISOString())
          .lte("collected_at", periodEnd.toISOString());

        const allResults = results || [];

        // Sentiment breakdown
        const sentimentBreakdown: Record<string, number> = {
          Positive: 0,
          Negative: 0,
          Neutral: 0,
          Mixed: 0,
        };
        for (const r of allResults) {
          if (r.sentiment && sentimentBreakdown[r.sentiment] !== undefined) {
            sentimentBreakdown[r.sentiment]++;
          }
        }

        // Top themes
        const themeCounts: Record<string, number> = {};
        for (const r of allResults) {
          if (Array.isArray(r.themes)) {
            for (const theme of r.themes) {
              themeCounts[theme] = (themeCounts[theme] || 0) + 1;
            }
          }
        }
        const topThemes = Object.entries(themeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([theme, count]) => ({ theme, count }));

        // Platform breakdown
        const platformCounts: Record<string, number> = {};
        for (const r of allResults) {
          if (r.platform) {
            platformCounts[r.platform] =
              (platformCounts[r.platform] || 0) + 1;
          }
        }

        // Risk flags count
        const riskCount = allResults.filter((r: any) => r.risk_flag).length;

        // Count scans
        const { count: scanCount } = await admin
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .gte("started_at", periodStart.toISOString())
          .lte("started_at", periodEnd.toISOString());

        // Generate AI summary if Gemini is available
        let aiSummary: string | null = null;
        if (geminiConfig && allResults.length > 0) {
          try {
            const summaryPrompt = `Generate a concise weekly reputation report summary for "${org.brand_name}".

Data from the past 7 days:
- Total mentions: ${allResults.length}
- Sentiment breakdown: ${JSON.stringify(sentimentBreakdown)}
- Top themes: ${JSON.stringify(topThemes.slice(0, 5))}
- Platform breakdown: ${JSON.stringify(platformCounts)}
- Risk flags: ${riskCount}

Top headlines:
${allResults
  .slice(0, 10)
  .map((r: any) => `- [${r.sentiment}] ${r.title}`)
  .join("\n")}

Provide a 3-5 sentence executive summary covering overall sentiment trend, key themes, and any risks or opportunities. Be professional and concise.`;

            aiSummary = await callGemini(
              geminiConfig.apiKey,
              geminiConfig.model,
              summaryPrompt
            );
          } catch (aiErr) {
            console.error(
              `AI summary failed for org ${org.id}:`,
              aiErr
            );
          }
        }

        // Insert report
        const { error: insertError } = await admin.from("reports").insert({
          org_id: org.id,
          report_type: "weekly",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          data: {
            total_results: allResults.length,
            sentiment_breakdown: sentimentBreakdown,
            top_themes: topThemes,
            platform_breakdown: platformCounts,
            risk_flags: riskCount,
            scans_run: scanCount || 0,
          },
          ai_summary: aiSummary,
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
    console.error("Weekly report cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
