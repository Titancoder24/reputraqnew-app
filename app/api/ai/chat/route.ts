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
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
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

    // Fetch recent search results for context (last 50)
    const { data: recentResults } = await supabase
      .from("search_results")
      .select(
        "title, sentiment, sentiment_score, platform, source_type, themes, collected_at"
      )
      .eq("org_id", profile.org_id)
      .order("collected_at", { ascending: false })
      .limit(50);

    // Build context summary
    const mentions = recentResults || [];
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const themeMap: Record<string, number> = {};

    for (const r of mentions) {
      const s = r.sentiment?.toLowerCase();
      if (s === "positive") positiveCount++;
      else if (s === "negative") negativeCount++;
      else neutralCount++;

      const themes: string[] = r.themes || [];
      for (const t of themes) {
        themeMap[t] = (themeMap[t] || 0) + 1;
      }
    }

    const topThemes = Object.entries(themeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");

    const contextData = `
Recent media monitoring data for ${brandName}:
- Total recent mentions: ${mentions.length}
- Positive: ${positiveCount}, Negative: ${negativeCount}, Neutral: ${neutralCount}
- Top themes: ${topThemes || "none detected"}
- Recent headlines: ${mentions
      .slice(0, 10)
      .map((r) => `"${r.title}" [${r.sentiment}]`)
      .join("; ")}
`;

    const systemInstruction = `You are Reputraq AI, a brand intelligence assistant for ${brandName}. Answer based on the media monitoring data provided. Be concise and actionable.`;

    const prompt = `${contextData}\n\nUser question: ${message}`;

    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    // Save both messages to chat_history
    await supabase.from("chat_history").insert([
      {
        org_id: profile.org_id,
        user_id: user.id,
        role: "user",
        content: message,
      },
      {
        org_id: profile.org_id,
        user_id: user.id,
        role: "assistant",
        content: response,
      },
    ]);

    return NextResponse.json({ response }, { status: 200 });
  } catch (err: any) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    const { data: messages, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
