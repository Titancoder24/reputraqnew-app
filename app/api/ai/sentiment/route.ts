import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiConfig, batchSentimentAnalysis } from "@/lib/gemini";

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
    const { results } = body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "results array is required and must not be empty" },
        { status: 400 }
      );
    }

    const { apiKey, model } = await getGeminiConfig(supabase);

    const { data: org } = await supabase
      .from("organizations")
      .select("brand_name")
      .eq("id", profile.org_id)
      .single();

    if (!org?.brand_name) {
      return NextResponse.json(
        { error: "Organization brand_name not found" },
        { status: 404 }
      );
    }

    const analyzed = await batchSentimentAnalysis(
      apiKey,
      model,
      org.brand_name,
      results
    );

    return NextResponse.json({ results: analyzed }, { status: 200 });
  } catch (err: any) {
    console.error("Sentiment analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
