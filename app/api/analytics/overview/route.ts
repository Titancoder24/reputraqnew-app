import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo query params are required" },
        { status: 400 }
      );
    }

    const { data: results, error } = await supabase
      .from("search_results")
      .select(
        "sentiment, sentiment_score, entity_type, entity_name, platform, source_type, reach_estimate, risk_flag"
      )
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allResults = results || [];

    let positive_count = 0;
    let negative_count = 0;
    let neutral_count = 0;
    let mixed_count = 0;
    let risk_count = 0;
    let brand_mentions = 0;
    let competitor_mentions = 0;
    let high_reach_count = 0;
    let sentiment_sum = 0;
    let sentiment_counted = 0;
    const platforms: Record<string, number> = {};
    const source_types: Record<string, number> = {};

    for (const r of allResults) {
      // Sentiment counts
      const sentiment = r.sentiment?.toLowerCase();
      if (sentiment === "positive") positive_count++;
      else if (sentiment === "negative") negative_count++;
      else if (sentiment === "neutral") neutral_count++;
      else if (sentiment === "mixed") mixed_count++;

      // Sentiment score average
      if (r.sentiment_score != null) {
        sentiment_sum += r.sentiment_score;
        sentiment_counted++;
      }

      // Entity type counts
      if (r.entity_type === "brand") brand_mentions++;
      else if (r.entity_type === "competitor") competitor_mentions++;

      // Platform counts
      if (r.platform) {
        platforms[r.platform] = (platforms[r.platform] || 0) + 1;
      }

      // Source type counts
      if (r.source_type) {
        source_types[r.source_type] = (source_types[r.source_type] || 0) + 1;
      }

      // Risk flag
      if (r.risk_flag === true) risk_count++;

      // High reach
      if (r.reach_estimate === "high") high_reach_count++;
    }

    const avg_sentiment_score =
      sentiment_counted > 0
        ? Math.round((sentiment_sum / sentiment_counted) * 100) / 100
        : 0;

    return NextResponse.json(
      {
        total_mentions: allResults.length,
        positive_count,
        negative_count,
        neutral_count,
        mixed_count,
        risk_count,
        avg_sentiment_score,
        brand_mentions,
        competitor_mentions,
        high_reach_count,
        platforms,
        source_types,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
