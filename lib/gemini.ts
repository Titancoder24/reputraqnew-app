/* ------------------------------------------------------------------ */
/*  Gemini AI helpers                                                  */
/* ------------------------------------------------------------------ */

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface SentimentResult {
  sentiment: string;
  sentiment_score: number;
  themes: string[];
  risk_flag: boolean;
  mention_type: string;
  reach_estimate: string;
}

/* ------------------------------------------------------------------ */
/*  Read config from admin_settings                                    */
/* ------------------------------------------------------------------ */

export async function getGeminiConfig(supabase: any): Promise<GeminiConfig> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["gemini_api_key", "gemini_model"]);

  if (error) {
    throw new Error(`Failed to read Gemini config: ${error.message}`);
  }

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  if (!settings.gemini_api_key) {
    throw new Error("Gemini API key not configured in admin_settings");
  }

  return {
    apiKey: settings.gemini_api_key,
    model: settings.gemini_model || "gemini-2.0-flash",
  };
}

/* ------------------------------------------------------------------ */
/*  Call Gemini API                                                     */
/* ------------------------------------------------------------------ */

export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  const text =
    json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

/* ------------------------------------------------------------------ */
/*  Batch sentiment analysis                                           */
/* ------------------------------------------------------------------ */

export async function batchSentimentAnalysis(
  apiKey: string,
  model: string,
  brandName: string,
  results: { title: string; snippet: string; link: string; source: string }[]
): Promise<SentimentResult[]> {
  const BATCH_SIZE = 15;
  const allResults: SentimentResult[] = [];

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchResults = await analyzeBatch(apiKey, model, brandName, batch);
    allResults.push(...batchResults);
  }

  return allResults;
}

async function analyzeBatch(
  apiKey: string,
  model: string,
  brandName: string,
  batch: { title: string; snippet: string; link: string; source: string }[]
): Promise<SentimentResult[]> {
  const items = batch.map((r, idx) => ({
    index: idx,
    title: r.title,
    snippet: r.snippet,
    source: r.source,
    url: r.link,
  }));

  const systemInstruction = `You are a reputation and sentiment analysis expert. Analyze each search result for the brand "${brandName}". For EACH result, determine:

1. sentiment: "Positive", "Negative", "Neutral", or "Mixed"
2. sentiment_score: a number from -1.0 (most negative) to 1.0 (most positive)
3. themes: an array of 1-3 relevant themes (e.g., "product quality", "customer service", "leadership", "innovation", "controversy")
4. risk_flag: true if the result poses a reputational risk, false otherwise
5. mention_type: "brand" (general brand mention), "executive" (mentions a specific person/executive), "product" (mentions a specific product), or "industry" (general industry mention)
6. reach_estimate: "high" (major news outlet, viral social media), "medium" (mid-tier publication, moderate engagement), or "low" (niche site, low engagement)

Respond ONLY with a valid JSON array of objects, one per input item, in the same order. No markdown, no explanation.`;

  const prompt = `Analyze these ${batch.length} search results for "${brandName}":\n\n${JSON.stringify(items, null, 2)}`;

  try {
    const response = await callGemini(apiKey, model, prompt, systemInstruction);

    // Extract JSON from response (handle possible markdown wrapping)
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed) || parsed.length !== batch.length) {
      // If length mismatch, pad or truncate
      return batch.map((_, idx) => {
        const item = parsed?.[idx];
        return item ? normalizeSentimentResult(item) : defaultSentimentResult();
      });
    }

    return parsed.map((item: any) => normalizeSentimentResult(item));
  } catch (error) {
    console.error("Gemini batch analysis error:", error);
    return batch.map(() => defaultSentimentResult());
  }
}

function normalizeSentimentResult(item: any): SentimentResult {
  return {
    sentiment: ["Positive", "Negative", "Neutral", "Mixed"].includes(item.sentiment)
      ? item.sentiment
      : "Neutral",
    sentiment_score:
      typeof item.sentiment_score === "number"
        ? Math.max(-1, Math.min(1, item.sentiment_score))
        : 0,
    themes: Array.isArray(item.themes) ? item.themes.slice(0, 3) : [],
    risk_flag: typeof item.risk_flag === "boolean" ? item.risk_flag : false,
    mention_type: ["brand", "executive", "product", "industry"].includes(item.mention_type)
      ? item.mention_type
      : "brand",
    reach_estimate: ["high", "medium", "low"].includes(item.reach_estimate)
      ? item.reach_estimate
      : "medium",
  };
}

function defaultSentimentResult(): SentimentResult {
  return {
    sentiment: "Neutral",
    sentiment_score: 0,
    themes: [],
    risk_flag: false,
    mention_type: "brand",
    reach_estimate: "medium",
  };
}
