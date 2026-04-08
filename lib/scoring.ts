/* ------------------------------------------------------------------ */
/*  Brand Position Score Calculator                                    */
/* ------------------------------------------------------------------ */

export interface BrandScore {
  overall: number;
  media_volume: number;
  positive_sentiment: number;
  tier1_coverage: number;
  competitor_gap: number;
  executive_visibility: number;
  industry_leadership: number;
}

export async function calculateBrandScore(
  supabase: any,
  orgId: string,
  entityName: string,
  entityType: string,
  dateFrom: string,
  dateTo: string
): Promise<BrandScore> {
  // Fetch all results for this org in the date range
  const { data: results, error } = await supabase
    .from("search_results")
    .select("*")
    .eq("org_id", orgId)
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  if (error) {
    throw new Error(`Failed to fetch results: ${error.message}`);
  }

  const allResults = results || [];

  // Filter brand results vs competitor results
  const brandResults = allResults.filter(
    (r: any) =>
      r.entity_name?.toLowerCase() === entityName.toLowerCase() &&
      r.entity_type === entityType
  );

  const competitorResults = allResults.filter(
    (r: any) =>
      r.entity_name?.toLowerCase() !== entityName.toLowerCase()
  );

  // 1. Media Volume Score (0-100)
  // Based on number of mentions; scale: 100+ mentions = 100
  const mediaVolume = Math.min(100, Math.round((brandResults.length / 100) * 100));

  // 2. Positive Sentiment Score (0-100)
  // Percentage of positive results
  const positiveCount = brandResults.filter(
    (r: any) => r.sentiment === "Positive"
  ).length;
  const positiveSentiment =
    brandResults.length > 0
      ? Math.round((positiveCount / brandResults.length) * 100)
      : 0;

  // 3. Tier 1 Coverage Score (0-100)
  // Percentage of results with high reach
  const tier1Count = brandResults.filter(
    (r: any) => r.reach_estimate === "high"
  ).length;
  const tier1Coverage =
    brandResults.length > 0
      ? Math.round((tier1Count / brandResults.length) * 100)
      : 0;

  // 4. Competitor Gap Score (0-100)
  // How many more brand mentions vs average competitor mentions
  const uniqueCompetitors = new Set(
    competitorResults.map((r: any) => r.entity_name?.toLowerCase())
  );
  const competitorCount = uniqueCompetitors.size;
  const avgCompetitorMentions =
    competitorCount > 0 ? competitorResults.length / competitorCount : 0;

  let competitorGap: number;
  if (avgCompetitorMentions === 0) {
    competitorGap = brandResults.length > 0 ? 100 : 50;
  } else {
    const ratio = brandResults.length / avgCompetitorMentions;
    // ratio of 2.0 = 100, ratio of 1.0 = 50, ratio of 0.5 = 25
    competitorGap = Math.min(100, Math.round(ratio * 50));
  }

  // 5. Executive Visibility Score (0-100)
  // Percentage of executive mentions among brand results
  const execMentions = brandResults.filter(
    (r: any) => r.mention_type === "executive"
  ).length;
  const executiveVisibility =
    brandResults.length > 0
      ? Math.min(100, Math.round((execMentions / brandResults.length) * 200))
      : 0;

  // 6. Industry Leadership Score (0-100)
  // Based on industry-themed positive mentions
  const leadershipThemes = [
    "leadership",
    "innovation",
    "industry leader",
    "market leader",
    "thought leadership",
    "pioneer",
    "best in class",
  ];

  const leadershipMentions = brandResults.filter((r: any) => {
    const themes: string[] = r.themes || [];
    return themes.some((t: string) =>
      leadershipThemes.some((lt) =>
        t.toLowerCase().includes(lt)
      )
    );
  }).length;

  const industryLeadership =
    brandResults.length > 0
      ? Math.min(100, Math.round((leadershipMentions / brandResults.length) * 300))
      : 0;

  // Overall score: weighted average
  const overall = Math.round(
    mediaVolume * 0.15 +
    positiveSentiment * 0.25 +
    tier1Coverage * 0.15 +
    competitorGap * 0.15 +
    executiveVisibility * 0.15 +
    industryLeadership * 0.15
  );

  return {
    overall: Math.min(100, overall),
    media_volume: mediaVolume,
    positive_sentiment: positiveSentiment,
    tier1_coverage: tier1Coverage,
    competitor_gap: competitorGap,
    executive_visibility: executiveVisibility,
    industry_leadership: industryLeadership,
  };
}
