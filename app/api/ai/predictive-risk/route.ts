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
    const { dateFrom, dateTo } = body;

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo are required" },
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

    // Fetch daily sentiment trend data for the date range
    const { data: trendData, error: trendError } = await supabase
      .from("search_results")
      .select("collected_at, sentiment, sentiment_score")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (trendError) {
      return NextResponse.json(
        { error: trendError.message },
        { status: 500 }
      );
    }

    // Build daily sentiment trend
    const dayMap: Record<
      string,
      { positive: number; negative: number; neutral: number; total: number }
    > = {};

    for (const r of trendData || []) {
      const day = new Date(r.collected_at).toISOString().split("T")[0];
      if (!dayMap[day]) {
        dayMap[day] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      dayMap[day].total++;
      const sentiment = r.sentiment?.toLowerCase();
      if (sentiment === "positive") dayMap[day].positive++;
      else if (sentiment === "negative") dayMap[day].negative++;
      else dayMap[day].neutral++;
    }

    const dailyTrend = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // Fetch risk-flagged and negative mentions
    const { data: riskMentions, error: riskError } = await supabase
      .from("search_results")
      .select(
        "title, snippet, source_name, sentiment, sentiment_score, risk_flags, themes, collected_at"
      )
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo)
      .in("sentiment", ["Negative", "negative"]);

    if (riskError) {
      return NextResponse.json(
        { error: riskError.message },
        { status: 500 }
      );
    }

    // Also fetch risk-flagged results regardless of sentiment
    const { data: flaggedMentions, error: flaggedError } = await supabase
      .from("search_results")
      .select(
        "title, snippet, source_name, sentiment, sentiment_score, risk_flags, themes, collected_at"
      )
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo)
      .not("risk_flags", "eq", "{}");

    if (flaggedError) {
      return NextResponse.json(
        { error: flaggedError.message },
        { status: 500 }
      );
    }

    // Deduplicate risk mentions
    const seenKeys = new Set<string>();
    const uniqueRiskItems: any[] = [];
    for (const r of [
      ...(riskMentions || []),
      ...(flaggedMentions || []),
    ]) {
      const key = `${r.title}-${r.source_name}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRiskItems.push(r);
      }
    }

    // Collect themes from risk items
    const riskThemeCounts: Record<string, number> = {};
    for (const r of uniqueRiskItems) {
      const themes: string[] = r.themes || [];
      for (const theme of themes) {
        riskThemeCounts[theme] = (riskThemeCounts[theme] || 0) + 1;
      }
    }
    const topRiskThemes = Object.entries(riskThemeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => `${theme} (${count})`);

    const systemInstruction =
      "You are a predictive brand risk analyst. Based on media coverage trends and risk signals, predict upcoming reputation risks for the brand. Respond ONLY with valid JSON. No markdown, no explanation.";

    const prompt = `Predict upcoming reputation risks for "${brandName}" (industry: ${org?.industry_category || "Unknown"}) based on these data points:

Daily sentiment trend (last period):
${JSON.stringify(dailyTrend, null, 2)}

Risk/negative mentions count: ${uniqueRiskItems.length} out of ${(trendData || []).length} total mentions
Top risk themes: ${topRiskThemes.join(", ") || "none"}

Sample risk items (up to 30):
${JSON.stringify(
  uniqueRiskItems.slice(0, 30).map((r) => ({
    title: r.title,
    snippet: r.snippet,
    source: r.source_name,
    sentiment: r.sentiment,
    score: r.sentiment_score,
    risk_flags: r.risk_flags,
    themes: r.themes,
    date: r.collected_at,
  })),
  null,
  2
)}

Analyze:
1. Is negative sentiment increasing, stable, or decreasing over the period?
2. Are there mention volume spikes that indicate emerging issues?
3. What themes are driving risk?

Return a JSON object with:
{
  "risk_score": <number 0-100, where 0 is no risk and 100 is extreme risk>,
  "trend": "improving" | "stable" | "declining" | "critical",
  "predictions": ["prediction1", "prediction2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "factors": [{ "name": "factor name", "impact": "high" | "medium" | "low" }, ...]
}

Max 5 predictions, 5 recommendations, and 5 factors.`;

    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    return NextResponse.json(
      {
        risk_score:
          typeof result.risk_score === "number"
            ? Math.max(0, Math.min(100, result.risk_score))
            : 50,
        trend: ["improving", "stable", "declining", "critical"].includes(
          result.trend
        )
          ? result.trend
          : "stable",
        predictions: Array.isArray(result.predictions)
          ? result.predictions.slice(0, 5)
          : [],
        recommendations: Array.isArray(result.recommendations)
          ? result.recommendations.slice(0, 5)
          : [],
        factors: Array.isArray(result.factors)
          ? result.factors.slice(0, 5).map((f: any) => ({
              name: f.name || "Unknown factor",
              impact: ["high", "medium", "low"].includes(f.impact)
                ? f.impact
                : "medium",
            }))
          : [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Predictive risk error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
