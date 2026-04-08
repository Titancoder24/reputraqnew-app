import { createHash } from "crypto";

const SERPAPI_BASE = "https://serpapi.com/search.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RawResult {
  title: string;
  link: string;
  snippet: string;
  source_name: string;
  published_date: string;
  thumbnail_url?: string;
  source_type: string;
  platform: string;
  keyword_text: string;
  keyword_id: string;
  entity_type: string;
  entity_name: string;
  region: string;
  language: string;
}

/* ------------------------------------------------------------------ */
/*  Base SerpAPI fetch                                                  */
/* ------------------------------------------------------------------ */

export async function serpSearch(
  apiKey: string,
  params: Record<string, string>
): Promise<any> {
  const url = `${SERPAPI_BASE}?${new URLSearchParams({ api_key: apiKey, ...params })}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${res.statusText}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers                                               */
/* ------------------------------------------------------------------ */

export async function serpOrganic(
  apiKey: string,
  keyword: string,
  gl = "in",
  hl = "en"
): Promise<any> {
  return serpSearch(apiKey, { engine: "google", q: keyword, gl, hl, num: "20" });
}

export async function serpNews(
  apiKey: string,
  keyword: string,
  gl = "in",
  hl = "en"
): Promise<any> {
  return serpSearch(apiKey, {
    engine: "google",
    q: keyword,
    gl,
    hl,
    tbm: "nws",
    tbs: "qdr:d",
    num: "20",
  });
}

/* ------------------------------------------------------------------ */
/*  Platform detection                                                 */
/* ------------------------------------------------------------------ */

export function detectPlatform(url: string): string {
  if (!url) return "web";
  const u = url.toLowerCase();
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("quora.com")) return "quora";
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook";
  return "web";
}

/* ------------------------------------------------------------------ */
/*  URL normalization & hashing                                        */
/* ------------------------------------------------------------------ */

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function urlHash(url: string): string {
  return createHash("md5").update(normalizeUrl(url)).digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Extract results from SerpAPI response                              */
/*                                                                     */
/*  Handles the real SerpAPI JSON structures:                          */
/*  - organic_results[] with title, link, snippet, source              */
/*  - news_results[] with title, link, snippet, source, date           */
/*  - discussions_and_forums[] with answers[].snippet                  */
/*  - twitter_results.tweets[] with snippet, user.name                 */
/*  - inline_videos[] with title, link, source                         */
/*  - top_stories[] with title, link, source, date                     */
/*  - perspectives[] with title, link, source, author                  */
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
  const base = {
    keyword_text: keyword,
    keyword_id: keywordId,
    entity_type: entityType,
    entity_name: entityName,
    region,
    language,
  };

  // 1. Organic results
  (data.organic_results || []).forEach((r: any) => {
    if (!r.link) return;
    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet: r.snippet || "",
      source_name: r.source || r.displayed_link || "",
      published_date: r.date || "",
      thumbnail_url: r.thumbnail,
      source_type: "organic",
      platform: detectPlatform(r.link),
    });
  });

  // 2. News results (from tbm=nws or google_news engine)
  (data.news_results || []).forEach((r: any) => {
    if (!r.link) return;
    // Google News API has source.name, regular news has flat source
    const sourceName =
      typeof r.source === "object" ? r.source?.name : r.source || "";
    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet: r.snippet || "",
      source_name: sourceName,
      published_date: r.date || r.iso_date || "",
      thumbnail_url: r.thumbnail || r.thumbnail_small,
      source_type: "news",
      platform: "google_news",
    });

    // Also extract sub-stories if present
    (r.stories || []).forEach((story: any) => {
      if (!story.link) return;
      const storySource =
        typeof story.source === "object"
          ? story.source?.name
          : story.source || "";
      results.push({
        ...base,
        title: story.title || "",
        link: story.link,
        snippet: "",
        source_name: storySource,
        published_date: story.date || story.iso_date || "",
        thumbnail_url: story.thumbnail || story.thumbnail_small,
        source_type: "news",
        platform: "google_news",
      });
    });
  });

  // 3. Discussions and forums (Reddit, Quora, etc.)
  (data.discussions_and_forums || []).forEach((r: any) => {
    if (!r.link) return;
    const src = (r.source || "").toLowerCase();
    // Get snippet from first answer if available
    const snippet =
      r.answers?.[0]?.snippet || r.snippet || r.description || "";
    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet,
      source_name: r.source || "",
      published_date: r.date || "",
      source_type: "discussion",
      platform: src.includes("reddit")
        ? "reddit"
        : src.includes("quora")
          ? "quora"
          : detectPlatform(r.link),
    });
  });

  // 4. Twitter/X results
  (data.twitter_results?.tweets || []).forEach((r: any) => {
    if (!r.link) return;
    results.push({
      ...base,
      title: r.snippet || r.title || "",
      link: r.link,
      snippet: r.snippet || "",
      source_name: r.user?.name || "Twitter/X",
      published_date: r.published_date || r.date || "",
      source_type: "social",
      platform: "twitter",
    });
  });

  // 5. Inline videos (usually YouTube)
  (data.inline_videos || []).forEach((r: any) => {
    if (!r.link) return;
    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet: r.description || "",
      source_name: r.source || r.platform || "YouTube",
      published_date: r.date || "",
      thumbnail_url: r.thumbnail,
      source_type: "video",
      platform: "youtube",
    });
  });

  // 6. Top stories
  (data.top_stories || []).forEach((r: any) => {
    if (!r.link) return;
    const sourceName =
      typeof r.source === "object" ? r.source?.name : r.source || "";
    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet: "",
      source_name: sourceName,
      published_date: r.date || "",
      source_type: "top_story",
      platform: "google_news",
    });
  });

  // 7. Perspectives (social media posts - YouTube, Reddit, LinkedIn, etc.)
  (data.perspectives || []).forEach((r: any) => {
    if (!r.link) return;
    const platSrc = (r.source || "").toLowerCase();
    let platform = "web";
    if (platSrc.includes("youtube")) platform = "youtube";
    else if (platSrc.includes("reddit")) platform = "reddit";
    else if (platSrc.includes("linkedin")) platform = "linkedin";
    else if (platSrc.includes("instagram")) platform = "instagram";
    else if (platSrc.includes("facebook")) platform = "facebook";
    else if (platSrc.includes("twitter") || platSrc.includes("x.com"))
      platform = "twitter";
    else platform = detectPlatform(r.link);

    results.push({
      ...base,
      title: r.title || "",
      link: r.link,
      snippet: r.title || "",
      source_name: r.author || r.source || "",
      published_date: r.date || "",
      thumbnail_url: r.thumbnails?.[0],
      source_type: "social",
      platform,
    });
  });

  return results;
}
