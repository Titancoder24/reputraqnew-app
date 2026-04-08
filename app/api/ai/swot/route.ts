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
    const { competitor_name, dateFrom, dateTo } = body;

    if (!competitor_name || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "competitor_name, dateFrom, and dateTo are required" },
        { status: 400 }
      );
    }

    const { apiKey, model } = await getGeminiConfig(supabase);

    const { data: org } = await supabase
      .from("organizations")
      .select("brand_name")
      .eq("id", profile.org_id)
      .single();

    const brandName = org?.brand_name || "Unknown Brand";

    // Fetch brand mentions
    const { data: brandResults, error: brandError } = await supabase
      .from("search_results")
      .select(
        "title, sentiment, sentiment_score, themes, source_name, reach_estimate"
      )
      .eq("org_id", profile.org_id)
      .eq("entity_type", "brand")
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (brandError) {
      return NextResponse.json(
        { error: brandError.message },
        { status: 500 }
      );
    }

    // Fetch competitor mentions
    const { data: competitorResults, error: compError } = await supabase
      .from("search_results")
      .select(
        "title, sentiment, sentiment_score, themes, source_name, reach_estimate"
      )
      .eq("org_id", profile.org_id)
      .eq("entity_name", competitor_name)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (compError) {
      return NextResponse.json(
        { error: compError.message },
        { status: 500 }
      );
    }

    const brandData = brandResults || [];
    const compData = competitorResults || [];

    // Build brand summary
    const brandSummary = buildMentionSummary(brandData);
    const compSummary = buildMentionSummary(compData);

    const systemInstruction =
      "You are a brand intelligence analyst. Based on media coverage data, generate a SWOT analysis comparing the brand vs competitor. Respond ONLY with valid JSON. No markdown, no explanation.";

    const prompt = `Generate a SWOT analysis comparing "${brandName}" vs competitor "${competitor_name}" based on their media coverage data.

Brand "${brandName}" data:
- Total mentions: ${brandSummary.total}
- Sentiment breakdown: ${brandSummary.positive} positive, ${brandSummary.negative} negative, ${brandSummary.neutral} neutral, ${brandSummary.mixed} mixed
- Average sentiment score: ${brandSummary.avgScore}
- Top themes: ${brandSummary.topThemes.join(", ") || "none"}

Competitor "${competitor_name}" data:
- Total mentions: ${compSummary.total}
- Sentiment breakdown: ${compSummary.positive} positive, ${compSummary.negative} negative, ${compSummary.neutral} neutral, ${compSummary.mixed} mixed
- Average sentiment score: ${compSummary.avgScore}
- Top themes: ${compSummary.topThemes.join(", ") || "none"}

Return a JSON object with:
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "threats": ["threat1", "threat2", ...],
  "summary": "2-3 sentence overall summary of the SWOT analysis"
}

Max 5 items per SWOT category.`;

    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const swot = JSON.parse(jsonStr);

    return NextResponse.json(
      {
        strengths: swot.strengths || [],
        weaknesses: swot.weaknesses || [],
        opportunities: swot.opportunities || [],
        threats: swot.threats || [],
        summary: swot.summary || "",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("SWOT analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function buildMentionSummary(results: any[]) {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let mixed = 0;
  let scoreSum = 0;
  let scoreCounted = 0;
  const themeCounts: Record<string, number> = {};

  for (const r of results) {
    const sentiment = r.sentiment?.toLowerCase();
    if (sentiment === "positive") positive++;
    else if (sentiment === "negative") negative++;
    else if (sentiment === "neutral") neutral++;
    else if (sentiment === "mixed") mixed++;

    if (r.sentiment_score != null) {
      scoreSum += r.sentiment_score;
      scoreCounted++;
    }

    const themes: string[] = r.themes || [];
    for (const theme of themes) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  }

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme]) => theme);

  const avgScore =
    scoreCounted > 0
      ? Math.round((scoreSum / scoreCounted) * 100) / 100
      : 0;

  return {
    total: results.length,
    positive,
    negative,
    neutral,
    mixed,
    avgScore,
    topThemes,
  };
}
