import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  serpOrganic,
  serpNews,
  extractAllResults,
  urlHash,
  RawResult,
} from "@/lib/serpapi";
import { getGeminiConfig, batchSentimentAnalysis } from "@/lib/gemini";
import { filterNewResults } from "@/lib/dedup";
import { checkAlerts } from "@/lib/alerts";

/* ------------------------------------------------------------------ */
/*  Helper: get SerpAPI key from admin_settings or env                 */
/* ------------------------------------------------------------------ */

async function getSerpApiKey(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "serpapi_key")
    .single();

  const key = data?.value || process.env.SERPAPI_KEY;
  if (!key) {
    throw new Error("SerpAPI key not configured");
  }
  return key;
}

/* ------------------------------------------------------------------ */
/*  Helper: get SerpAPI usage from admin_settings                      */
/* ------------------------------------------------------------------ */

async function getSerpApiUsage(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ used: number; limit: number }> {
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["serpapi_used_this_month", "serpapi_monthly_limit"]);

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  return {
    used: parseInt(settings.serpapi_used_this_month || "0", 10),
    limit: parseInt(settings.serpapi_monthly_limit || "10000", 10),
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: increment SerpAPI usage counter                            */
/* ------------------------------------------------------------------ */

async function incrementSerpApiUsage(
  supabase: ReturnType<typeof createAdminClient>,
  increment: number
): Promise<void> {
  const { used } = await getSerpApiUsage(supabase);
  await supabase
    .from("admin_settings")
    .upsert(
      { key: "serpapi_used_this_month", value: String(used + increment) },
      { onConflict: "key" }
    );
}

/* ------------------------------------------------------------------ */
/*  Scan a single organization                                         */
/* ------------------------------------------------------------------ */

async function scanOrganization(
  supabase: ReturnType<typeof createAdminClient>,
  org: any,
  scanType: "manual" | "scheduled"
): Promise<{ new_results: number; scan_id: string }> {
  // a. Create scan record
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      org_id: org.id,
      scan_type: scanType,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (scanError || !scan) {
    throw new Error(`Failed to create scan record: ${scanError?.message}`);
  }

  const scanId = scan.id;

  try {
    // b. Get all active keywords for this org
    const { data: keywords, error: kwError } = await supabase
      .from("keywords")
      .select("*")
      .eq("org_id", org.id)
      .eq("is_active", true);

    if (kwError) {
      throw new Error(`Failed to fetch keywords: ${kwError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      // No keywords to scan - mark complete
      await supabase
        .from("scans")
        .update({
          status: "completed",
          results_found: 0,
          new_results: 0,
          serpapi_calls_used: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", scanId);

      return { new_results: 0, scan_id: scanId };
    }

    // c. Get SerpAPI key
    const apiKey = await getSerpApiKey(supabase);

    // d. Track serpapi_calls_used
    let serpapiCallsUsed = 0;

    // e. For each keyword, run searches
    const allResults: RawResult[] = [];
    const keywordResultCounts: Record<string, number> = {};

    const region = org.regions?.[0] || "us";
    const language = org.languages?.[0] || "en";

    for (const kw of keywords) {
      try {
        // Organic search
        const organicData = await serpOrganic(
          apiKey,
          kw.keyword,
          region,
          language
        );
        serpapiCallsUsed++;

        // News search
        const newsData = await serpNews(apiKey, kw.keyword, region, language);
        serpapiCallsUsed++;

        // Extract all results
        const kwResults = extractAllResults(
          organicData,
          kw.keyword,
          kw.id,
          kw.entity_type,
          kw.entity_name,
          region,
          language
        );

        const newsResults = extractAllResults(
          newsData,
          kw.keyword,
          kw.id,
          kw.entity_type,
          kw.entity_name,
          region,
          language
        );

        const combined = [...kwResults, ...newsResults];
        keywordResultCounts[kw.id] = combined.length;
        allResults.push(...combined);
      } catch (kwErr) {
        console.error(
          `Error scanning keyword "${kw.keyword}":`,
          kwErr
        );
        // Continue with other keywords
      }
    }

    // Update serpapi_used_this_month in admin_settings
    await incrementSerpApiUsage(supabase, serpapiCallsUsed);

    // f. Combined results are already in allResults

    // g. Deduplicate
    const newResults = await filterNewResults(supabase, org.id, allResults);

    // h. Run Gemini sentiment analysis on new results
    let analyzedResults: any[] = [];

    if (newResults.length > 0) {
      try {
        const geminiConfig = await getGeminiConfig(supabase);
        const sentimentResults = await batchSentimentAnalysis(
          geminiConfig.apiKey,
          geminiConfig.model,
          org.brand_name,
          newResults.map((r: any) => ({
            title: r.title,
            snippet: r.snippet,
            link: r.link,
            source_name: r.source_name,
            platform: r.platform,
          }))
        );

        // i. Merge sentiment results with raw results
        analyzedResults = newResults.map((r: any, idx: number) => {
          const sentiment = sentimentResults[idx] || {
            sentiment: "Neutral",
            sentiment_score: 0,
            themes: [],
            risk_flag: false,
            mention_type: "brand",
            reach_estimate: "medium",
          };

          return {
            org_id: org.id,
            scan_id: scanId,
            keyword_id: r.keyword_id,
            keyword_text: r.keyword_text,
            entity_type: r.entity_type,
            entity_name: r.entity_name,
            source_type: r.source_type,
            platform: r.platform,
            title: r.title,
            link: r.link,
            snippet: r.snippet,
            source_name: r.source_name,
            published_date: r.published_date || null,
            thumbnail_url: r.thumbnail_url || null,
            sentiment: sentiment.sentiment,
            sentiment_score: sentiment.sentiment_score,
            themes: sentiment.themes,
            risk_flag: sentiment.risk_flag,
            mention_type: sentiment.mention_type,
            reach_estimate: sentiment.reach_estimate,
            region: r.region,
            language: r.language,
            url_hash: urlHash(r.link),
            collected_at: new Date().toISOString(),
          };
        });
      } catch (geminiErr) {
        console.error("Gemini analysis error:", geminiErr);
        // Insert without sentiment analysis if Gemini fails
        analyzedResults = newResults.map((r: any) => ({
          org_id: org.id,
          scan_id: scanId,
          keyword_id: r.keyword_id,
          keyword_text: r.keyword_text,
          entity_type: r.entity_type,
          entity_name: r.entity_name,
          source_type: r.source_type,
          platform: r.platform,
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          source_name: r.source_name,
          published_date: r.published_date || null,
          thumbnail_url: r.thumbnail_url || null,
          sentiment: "Neutral",
          sentiment_score: 0,
          themes: [],
          risk_flag: false,
          mention_type: "brand",
          reach_estimate: "medium",
          region: r.region,
          language: r.language,
          url_hash: urlHash(r.link),
          collected_at: new Date().toISOString(),
        }));
      }

      // j. Insert all new results into search_results table
      if (analyzedResults.length > 0) {
        const { error: insertError } = await supabase
          .from("search_results")
          .insert(analyzedResults);

        if (insertError) {
          console.error(
            "Failed to insert search results:",
            insertError.message
          );
        }
      }
    }

    // k. Update scan record
    await supabase
      .from("scans")
      .update({
        status: "completed",
        results_found: allResults.length,
        new_results: newResults.length,
        serpapi_calls_used: serpapiCallsUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);

    // l. Update org: last_scan_at and next_scan_at
    const scanFrequencyHours = org.scan_frequency_hours || 24;
    const nextScanAt = new Date(
      Date.now() + scanFrequencyHours * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("organizations")
      .update({
        last_scan_at: new Date().toISOString(),
        next_scan_at: nextScanAt,
      })
      .eq("id", org.id);

    // m. Update each keyword: last_scanned_at and total_results
    for (const kw of keywords) {
      const countForKeyword = keywordResultCounts[kw.id] || 0;
      await supabase
        .from("keywords")
        .update({
          last_scanned_at: new Date().toISOString(),
          total_results: (kw.total_results || 0) + countForKeyword,
        })
        .eq("id", kw.id);
    }

    // n. Check alerts
    if (analyzedResults.length > 0) {
      try {
        // Re-fetch inserted results to get their IDs
        const { data: insertedResults } = await supabase
          .from("search_results")
          .select("id, title, link, snippet, sentiment, reach_estimate, mention_type, risk_flag, keyword_text, entity_name")
          .eq("scan_id", scanId);

        if (insertedResults && insertedResults.length > 0) {
          await checkAlerts(
            supabase,
            org.id,
            insertedResults.map((r: any) => ({
              id: r.id,
              title: r.title,
              link: r.link,
              snippet: r.snippet,
              sentiment: r.sentiment,
              reach_estimate: r.reach_estimate,
              mention_type: r.mention_type,
              risk_flag: r.risk_flag,
              keyword: r.keyword_text,
              entity_name: r.entity_name,
            }))
          );
        }
      } catch (alertErr) {
        console.error("Alert check error:", alertErr);
      }
    }

    return { new_results: newResults.length, scan_id: scanId };
  } catch (err) {
    // On failure, update scan status
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("scans")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);

    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/scans/run                                                */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { org_id, scan_type = "manual" } = body as {
      org_id?: string;
      scan_type?: "manual" | "scheduled";
    };

    const supabase = createAdminClient();

    // 1. Auth check
    if (scan_type === "scheduled") {
      // Verify CRON_SECRET for scheduled scans
      const authHeader = request.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;

      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized: invalid CRON_SECRET" },
          { status: 401 }
        );
      }
    } else {
      // Manual scan - verify user auth
      const userSupabase = await createClient();
      const {
        data: { user },
      } = await userSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // If no org_id provided, get from user's profile
      if (!org_id) {
        const { data: profile } = await userSupabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) {
          return NextResponse.json(
            { error: "No organization found" },
            { status: 404 }
          );
        }

        // Override to scan only the user's org
        body.org_id = profile.org_id;
      }
    }

    // 2. Check SerpAPI usage limits before scanning
    const { used, limit } = await getSerpApiUsage(supabase);
    if (used >= limit) {
      return NextResponse.json(
        {
          error: "SerpAPI monthly limit reached",
          used,
          limit,
        },
        { status: 429 }
      );
    }

    // 3. Get the org(s) to scan
    let orgs: any[] = [];

    if (body.org_id) {
      const { data: org, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", body.org_id)
        .single();

      if (error || !org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      orgs = [org];
    } else {
      // Get all active orgs with active subscriptions
      const { data: activeOrgs, error } = await supabase
        .from("organizations")
        .select("*, subscriptions!inner(status)")
        .eq("monitoring_active", true)
        .eq("subscriptions.status", "active");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      orgs = activeOrgs || [];
    }

    if (orgs.length === 0) {
      return NextResponse.json(
        { error: "No organizations to scan" },
        { status: 404 }
      );
    }

    // 4. Scan each org
    let scansCompleted = 0;
    let totalNewResults = 0;
    const errors: { org_id: string; error: string }[] = [];

    for (const org of orgs) {
      try {
        // Re-check usage limit before each org
        const currentUsage = await getSerpApiUsage(supabase);
        if (currentUsage.used >= currentUsage.limit) {
          errors.push({
            org_id: org.id,
            error: "SerpAPI monthly limit reached",
          });
          break;
        }

        const result = await scanOrganization(supabase, org, scan_type);
        totalNewResults += result.new_results;
        scansCompleted++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`Scan failed for org ${org.id}:`, errorMessage);
        errors.push({ org_id: org.id, error: errorMessage });
        // Continue with other orgs
      }
    }

    // 5. Return summary
    return NextResponse.json(
      {
        scans_completed: scansCompleted,
        total_new_results: totalNewResults,
        orgs_scanned: orgs.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Scan engine error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
