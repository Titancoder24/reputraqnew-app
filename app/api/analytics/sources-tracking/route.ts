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

    const { data, error } = await supabase
      .from("search_results")
      .select(
        "source_name, title, sentiment, sentiment_score, collected_at"
      )
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = data || [];

    // Group by source_name
    const sourceMap: Record<
      string,
      {
        total_mentions: number;
        positive_count: number;
        negative_count: number;
        neutral_count: number;
        score_sum: number;
        score_counted: number;
        latest_article_date: string;
        sample_titles: string[];
      }
    > = {};

    for (const r of results) {
      const sourceName = r.source_name || "Unknown";

      if (!sourceMap[sourceName]) {
        sourceMap[sourceName] = {
          total_mentions: 0,
          positive_count: 0,
          negative_count: 0,
          neutral_count: 0,
          score_sum: 0,
          score_counted: 0,
          latest_article_date: "",
          sample_titles: [],
        };
      }

      const entry = sourceMap[sourceName];
      entry.total_mentions++;

      const sentiment = r.sentiment?.toLowerCase();
      if (sentiment === "positive") entry.positive_count++;
      else if (sentiment === "negative") entry.negative_count++;
      else entry.neutral_count++;

      if (r.sentiment_score != null) {
        entry.score_sum += r.sentiment_score;
        entry.score_counted++;
      }

      if (
        r.collected_at &&
        r.collected_at > entry.latest_article_date
      ) {
        entry.latest_article_date = r.collected_at;
      }

      if (r.title && entry.sample_titles.length < 3) {
        entry.sample_titles.push(r.title);
      }
    }

    // Build sorted array, limit to top 25
    const sources = Object.entries(sourceMap)
      .map(([source_name, s]) => ({
        source_name,
        total_mentions: s.total_mentions,
        positive_count: s.positive_count,
        negative_count: s.negative_count,
        neutral_count: s.neutral_count,
        avg_sentiment_score:
          s.score_counted > 0
            ? Math.round((s.score_sum / s.score_counted) * 100) / 100
            : 0,
        latest_article_date: s.latest_article_date,
        sample_titles: s.sample_titles,
      }))
      .sort((a, b) => b.total_mentions - a.total_mentions)
      .slice(0, 25);

    return NextResponse.json(sources, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
