import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, getGeminiConfig } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { period, dateFrom, dateTo } = body;

    if (!period || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "period, dateFrom, and dateTo are required" },
        { status: 400 }
      );
    }

    if (!["daily", "weekly", "monthly"].includes(period)) {
      return NextResponse.json(
        { error: "period must be daily, weekly, or monthly" },
        { status: 400 }
      );
    }

    const { apiKey, model } = await getGeminiConfig(supabase);

    const { data: org } = await supabase
      .from("organizations")
      .select("brand_name, industry_category")
      .eq("id", profile.org_id)
      .single();

    const brandName = org?.brand_name || "Unknown Brand";

    const { data: results, error: resultsError } = await supabase
      .from("search_results")
      .select("*")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 }
      );
    }

    const allResults = results || [];

    // Compute stats
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let mixedCount = 0;
    const platformCounts: Record<string, number> = {};
    const sourceTypeCounts: Record<string, number> = {};
    const themeMap: Record<string, number> = {};
    const sourceMap: Record<string, number> = {};

    for (const r of allResults) {
      const sentiment = r.sentiment?.toLowerCase();
      if (sentiment === "positive") positiveCount++;
      else if (sentiment === "negative") negativeCount++;
      else if (sentiment === "neutral") neutralCount++;
      else if (sentiment === "mixed") mixedCount++;

      if (r.platform) {
        platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
      }
      if (r.source_type) {
        sourceTypeCounts[r.source_type] =
          (sourceTypeCounts[r.source_type] || 0) + 1;
      }
      const themes: string[] = r.themes || [];
      for (const t of themes) {
        themeMap[t] = (themeMap[t] || 0) + 1;
      }
      if (r.source_name) {
        sourceMap[r.source_name] = (sourceMap[r.source_name] || 0) + 1;
      }
    }

    const topThemes = Object.entries(themeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topSources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const stats = {
      total: allResults.length,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      mixed_count: mixedCount,
      by_platform: platformCounts,
      by_source_type: sourceTypeCounts,
      top_themes: topThemes.map(([name, count]) => ({ name, count })),
      top_sources: topSources.map(([name, count]) => ({ name, count })),
    };

    const prompt = `Write a professional ${period} media monitoring report for the brand "${brandName}" covering the period ${dateFrom} to ${dateTo}.

Data summary:
- Total mentions: ${stats.total}
- Positive: ${positiveCount}, Negative: ${negativeCount}, Neutral: ${neutralCount}, Mixed: ${mixedCount}
- Platforms: ${JSON.stringify(platformCounts)}
- Source types: ${JSON.stringify(sourceTypeCounts)}
- Top themes: ${topThemes.map(([n, c]) => `${n} (${c})`).join(", ")}
- Top sources: ${topSources.map(([n, c]) => `${n} (${c})`).join(", ")}

Sample headlines:
${allResults
  .slice(0, 15)
  .map((r) => `- "${r.title}" [${r.sentiment}] (${r.source_name})`)
  .join("\n")}

Write a clear, structured report with: Executive Summary, Key Findings, Sentiment Analysis, Risk Assessment, and Recommendations. Keep it concise and actionable.`;

    const systemInstruction =
      "You are a professional media monitoring analyst. Write structured, data-driven reports. Use markdown formatting.";

    const summary = await callGemini(apiKey, model, prompt, systemInstruction);

    return NextResponse.json({ summary, stats }, { status: 200 });
  } catch (err: any) {
    console.error("AI report generation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
