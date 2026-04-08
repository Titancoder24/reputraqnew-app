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

    // Fetch negative and risk-flagged results
    const { data: negativeResults, error: negError } = await supabase
      .from("search_results")
      .select("title, snippet, source_name, platform, sentiment, sentiment_score, risk_flag, themes, collected_at")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo)
      .in("sentiment", ["Negative", "negative"]);

    if (negError) {
      return NextResponse.json({ error: negError.message }, { status: 500 });
    }

    // Also fetch risk-flagged results regardless of sentiment
    const { data: riskResults, error: riskError } = await supabase
      .from("search_results")
      .select("title, snippet, source_name, platform, sentiment, sentiment_score, risk_flag, themes, collected_at")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo)
      .eq("risk_flag", true);

    if (riskError) {
      return NextResponse.json({ error: riskError.message }, { status: 500 });
    }

    // Merge and deduplicate
    const seenIds = new Set<string>();
    const allRiskItems: any[] = [];
    for (const r of [...(negativeResults || []), ...(riskResults || [])]) {
      const key = `${r.title}-${r.source_name}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allRiskItems.push(r);
      }
    }

    // Get total mentions for context
    const { count: totalMentions } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    const systemInstruction = `You are a brand risk assessment expert. Analyze the provided negative and risk-flagged media mentions for "${brandName}" and provide a risk assessment. Respond ONLY with valid JSON. No markdown, no explanation.`;

    const prompt = `Assess the reputational risk for "${brandName}" based on these data points:

- Total mentions in period: ${totalMentions || 0}
- Negative/risk-flagged mentions: ${allRiskItems.length}
- Industry: ${org?.industry_category || "Unknown"}

Risk items (up to 50):
${JSON.stringify(
  allRiskItems.slice(0, 50).map((r) => ({
    title: r.title,
    snippet: r.snippet,
    source: r.source_name,
    platform: r.platform,
    sentiment: r.sentiment,
    score: r.sentiment_score,
    risk_flag: r.risk_flag,
    themes: r.themes,
  })),
  null,
  2
)}

Return a JSON object with:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "2-3 sentence overall risk summary",
  "top_risks": [{ "title": "risk title", "description": "brief description", "severity": "low|medium|high|critical" }],
  "recommendations": ["actionable recommendation 1", "recommendation 2", ...]
}

Max 5 top_risks and 5 recommendations.`;

    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const assessment = JSON.parse(jsonStr);

    return NextResponse.json(
      {
        risk_level: assessment.risk_level || "low",
        summary: assessment.summary || "",
        top_risks: assessment.top_risks || [],
        recommendations: assessment.recommendations || [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Risk assessment error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
