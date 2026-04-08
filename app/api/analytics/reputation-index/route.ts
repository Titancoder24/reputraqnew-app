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

    // Fetch all results in the date range
    const { data, error } = await supabase
      .from("search_results")
      .select(
        "sentiment_score, source_type, reach_estimate, risk_flag"
      )
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = data || [];
    const totalMentions = results.length;

    if (totalMentions === 0) {
      return NextResponse.json(
        {
          overall_index: 0,
          news_score: 0,
          social_score: 0,
          volume_score: 0,
          tier1_score: 0,
          risk_score: 0,
          trend_vs_previous: 0,
        },
        { status: 200 }
      );
    }

    // Separate by source type for scoring
    const newsTypes = ["news"];
    const socialTypes = ["social", "discussion", "forum"];

    let newsScoreSum = 0;
    let newsCounted = 0;
    let socialScoreSum = 0;
    let socialCounted = 0;
    let highReachCount = 0;
    let riskFlagCount = 0;

    for (const r of results) {
      const sourceType = r.source_type?.toLowerCase() || "";

      if (r.sentiment_score != null) {
        if (newsTypes.includes(sourceType)) {
          newsScoreSum += r.sentiment_score;
          newsCounted++;
        }
        if (socialTypes.includes(sourceType)) {
          socialScoreSum += r.sentiment_score;
          socialCounted++;
        }
      }

      if (r.reach_estimate === "high") {
        highReachCount++;
      }

      if (r.risk_flag === true) {
        riskFlagCount++;
      }
    }

    // News sentiment score (0-100): map from [-1, 1] to [0, 100]
    const avgNewsSentiment =
      newsCounted > 0 ? newsScoreSum / newsCounted : 0;
    const news_score = Math.round(((avgNewsSentiment + 1) / 2) * 100);

    // Social sentiment score (0-100): map from [-1, 1] to [0, 100]
    const avgSocialSentiment =
      socialCounted > 0 ? socialScoreSum / socialCounted : 0;
    const social_score = Math.round(
      ((avgSocialSentiment + 1) / 2) * 100
    );

    // Media volume score (0-100): normalized count
    // Use a log scale so it doesn't just max out with many mentions
    // Assume ~150 mentions maps to score ~100
    const volume_score = Math.min(
      100,
      Math.round((Math.log(totalMentions + 1) / Math.log(150)) * 100)
    );

    // Tier-1 coverage score (0-100): percentage of high reach mentions
    const tier1_score =
      totalMentions > 0
        ? Math.min(
            100,
            Math.round((highReachCount / totalMentions) * 100)
          )
        : 0;

    // Risk score (0-100): inverse of risk flag percentage
    const riskPercentage =
      totalMentions > 0 ? riskFlagCount / totalMentions : 0;
    const risk_score = Math.round((1 - riskPercentage) * 100);

    // Combined reputation index with weights
    const overall_index = Math.round(
      news_score * 0.35 +
        social_score * 0.25 +
        volume_score * 0.15 +
        tier1_score * 0.15 +
        risk_score * 0.1
    );

    // Calculate trend vs previous period
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const periodDuration = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodDuration);
    const prevTo = new Date(fromDate.getTime());

    const { data: prevData, error: prevError } = await supabase
      .from("search_results")
      .select("sentiment_score, source_type, reach_estimate, risk_flag")
      .eq("org_id", profile.org_id)
      .gte("collected_at", prevFrom.toISOString())
      .lte("collected_at", prevTo.toISOString());

    let trend_vs_previous = 0;

    if (!prevError && prevData && prevData.length > 0) {
      const prevResults = prevData;
      const prevTotal = prevResults.length;

      let prevNewsSum = 0;
      let prevNewsCnt = 0;
      let prevSocialSum = 0;
      let prevSocialCnt = 0;
      let prevHighReach = 0;
      let prevRiskFlags = 0;

      for (const r of prevResults) {
        const sourceType = r.source_type?.toLowerCase() || "";

        if (r.sentiment_score != null) {
          if (newsTypes.includes(sourceType)) {
            prevNewsSum += r.sentiment_score;
            prevNewsCnt++;
          }
          if (socialTypes.includes(sourceType)) {
            prevSocialSum += r.sentiment_score;
            prevSocialCnt++;
          }
        }

        if (r.reach_estimate === "high") prevHighReach++;

        const flags: string[] = r.risk_flag || [];
        if (flags.length > 0) prevRiskFlags++;
      }

      const prevNewsScore = Math.round(
        (((prevNewsCnt > 0 ? prevNewsSum / prevNewsCnt : 0) + 1) / 2) *
          100
      );
      const prevSocialScore = Math.round(
        (((prevSocialCnt > 0 ? prevSocialSum / prevSocialCnt : 0) + 1) /
          2) *
          100
      );
      const prevVolumeScore = Math.min(
        100,
        Math.round((Math.log(prevTotal + 1) / Math.log(150)) * 100)
      );
      const prevTier1Score =
        prevTotal > 0
          ? Math.min(
              100,
              Math.round((prevHighReach / prevTotal) * 100)
            )
          : 0;
      const prevRiskScore = Math.round(
        (1 - (prevTotal > 0 ? prevRiskFlags / prevTotal : 0)) * 100
      );

      const prevOverall = Math.round(
        prevNewsScore * 0.35 +
          prevSocialScore * 0.25 +
          prevVolumeScore * 0.15 +
          prevTier1Score * 0.15 +
          prevRiskScore * 0.1
      );

      trend_vs_previous = overall_index - prevOverall;
    }

    return NextResponse.json(
      {
        overall_index,
        news_score,
        social_score,
        volume_score,
        tier1_score,
        risk_score,
        trend_vs_previous,
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
