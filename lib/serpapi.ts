import { createHash } from "crypto";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RawResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  platform: string;
  position: number;
  keyword: string;
  keyword_id: string;
  entity_type: string;
  entity_name: string;
  region: string;
  language: string;
  result_type: string;
  thumbnail?: string;
  date?: string;
}

/* ------------------------------------------------------------------ */
/*  Base SerpAPI fetch                                                  */
/* ------------------------------------------------------------------ */

export async function serpSearch(
  apiKey: string,
  params: Record<string, string>
): Promise<any> {
  const url = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers                                               */
/* ------------------------------------------------------------------ */

export async function serpOrganic(
  apiKey: string,
  keyword: string,
  gl: string = "us",
  hl: string = "en"
): Promise<any> {
  return serpSearch(apiKey, {
    engine: "google",
    q: keyword,
    gl,
    hl,
    num: "20",
  });
}

export async function serpNews(
  apiKey: string,
  keyword: string,
  gl: string = "us",
  hl: string = "en"
): Promise<any> {
  return serpSearch(apiKey, {
    engine: "google_news",
    q: keyword,
    gl,
    hl,
  });
}

/* ------------------------------------------------------------------ */
/*  Platform detection                                                 */
/* ------------------------------------------------------------------ */

export function detectPlatform(url: string): string {
  if (!url) return "web";
  const lower = url.toLowerCase();

  if (lower.includes("reddit.com")) return "reddit";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("linkedin.com")) return "linkedin";
  if (lower.includes("quora.com")) return "quora";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("facebook.com") || lower.includes("fb.com")) return "facebook";

  return "web";
}

/* ------------------------------------------------------------------ */
/*  URL normalization & hashing                                        */
/* ------------------------------------------------------------------ */

export function normalizeUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Remove tracking params
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_term");
    u.searchParams.delete("utm_content");
    u.searchParams.delete("ref");
    u.searchParams.delete("fbclid");
    u.searchParams.delete("gclid");
    // Remove trailing slash
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    // Remove www
    u.hostname = u.hostname.replace(/^www\./, "");
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export function urlHash(url: string): string {
  return createHash("md5").update(normalizeUrl(url)).digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Extract results from SerpAPI response                              */
/* ------------------------------------------------------------------ */

export function extractAllResults(
  data: any,
  keyword: string,
  keywordId: string,
  entityType: string,
  entityName: string,
  region: string,
  language: string
): RawResult[] {
  const results: RawResult[] = [];

  const push = (
    items: any[] | undefined,
    resultType: string,
    getLink?: (item: any) => string,
    getSnippet?: (item: any) => string,
    getSource?: (item: any) => string
  ) => {
    if (!items || !Array.isArray(items)) return;
    items.forEach((item, idx) => {
      const link = getLink ? getLink(item) : item.link;
      if (!link) return;
      results.push({
        title: item.title || "",
        link,
        snippet: getSnippet ? getSnippet(item) : item.snippet || item.description || "",
        source: getSource ? getSource(item) : item.source || item.displayed_link || "",
        platform: detectPlatform(link),
        position: item.position ?? idx + 1,
        keyword,
        keyword_id: keywordId,
        entity_type: entityType,
        entity_name: entityName,
        region,
        language,
        result_type: resultType,
        thumbnail: item.thumbnail || undefined,
        date: item.date || undefined,
      });
    });
  };

  // Organic results
  push(data.organic_results, "organic");

  // News results
  push(data.news_results, "news");

  // Discussions and forums
  push(
    data.discussions_and_forums,
    "discussion",
    (item) => item.link,
    (item) => item.snippet || item.comment || "",
    (item) => item.source || ""
  );

  // Twitter results
  push(
    data.twitter_results?.tweets,
    "twitter",
    (item) => item.link,
    (item) => item.snippet || item.tweet || "",
    (item) => item.source || "Twitter"
  );

  // Inline videos
  push(
    data.inline_videos,
    "video",
    (item) => item.link,
    (item) => item.description || item.snippet || "",
    (item) => item.source || item.platform || ""
  );

  // Top stories
  push(
    data.top_stories,
    "top_story",
    (item) => item.link,
    (item) => item.snippet || item.description || "",
    (item) => item.source || ""
  );

  return results;
}
