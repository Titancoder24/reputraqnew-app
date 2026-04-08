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
    let { results, dateFrom, dateTo } = body;

    // If no results provided, fetch from DB using date range
    if (!results || !Array.isArray(results) || results.length === 0) {
      if (!dateFrom || !dateTo) {
        return NextResponse.json(
          {
            error:
              "Either results array or dateFrom/dateTo parameters are required",
          },
          { status: 400 }
        );
      }

      const { data: dbResults, error: dbError } = await supabase
        .from("search_results")
        .select("title, snippet")
        .eq("org_id", profile.org_id)
        .gte("collected_at", dateFrom)
        .lte("collected_at", dateTo);

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      results = dbResults || [];
    }

    if (results.length === 0) {
      return NextResponse.json({ themes: [] }, { status: 200 });
    }

    const { apiKey, model } = await getGeminiConfig(supabase);

    const { data: org } = await supabase
      .from("organizations")
      .select("brand_name")
      .eq("id", profile.org_id)
      .single();

    const brandName = org?.brand_name || "Unknown Brand";

    const items = results.slice(0, 100).map((r: any, idx: number) => ({
      index: idx,
      title: r.title,
      snippet: r.snippet,
    }));

    const systemInstruction = `You are an expert media analyst. Identify and rank the key themes from the provided search results for the brand "${brandName}". Respond ONLY with a valid JSON array. No markdown, no explanation.`;

    const prompt = `Analyze these ${items.length} search results and identify the top themes. For each theme, provide:
- name: a short descriptive theme name
- count: estimated number of results related to this theme
- sentiment_bias: "positive", "negative", "neutral", or "mixed" based on the overall tone of results in this theme

Return a JSON array sorted by count descending. Maximum 15 themes.

Results:
${JSON.stringify(items, null, 2)}`;

    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    // Parse JSON from response
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const themes = JSON.parse(jsonStr);

    return NextResponse.json({ themes }, { status: 200 });
  } catch (err: any) {
    console.error("Theme extraction error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
