"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MentionCard } from "@/components/dashboard/mention-card";
import { SentimentPieChart } from "@/components/charts/sentiment-pie-chart";
import { PlatformBarChart } from "@/components/charts/platform-bar-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Search, Filter, ChevronLeft, ChevronRight, Newspaper, Mic, MicOff } from "lucide-react";

const sentimentFilters = ["All", "Positive", "Negative", "Neutral", "Mixed"];
const sourceTypeFilters = ["All", "news", "organic", "discussion", "social", "video", "top_story"];
const platformFilters = ["All", "google_news", "reddit", "twitter", "youtube", "linkedin", "quora", "web"];
const regionFilters = [
  { value: "All", label: "All Regions" },
  { value: "IN", label: "IN (India)" },
  { value: "US", label: "US (United States)" },
  { value: "GB", label: "GB (United Kingdom)" },
  { value: "AU", label: "AU (Australia)" },
  { value: "SG", label: "SG (Singapore)" },
];
const languageFilters = [
  { value: "All", label: "All Languages" },
  { value: "en", label: "en (English)" },
  { value: "hi", label: "hi (Hindi)" },
  { value: "ta", label: "ta (Tamil)" },
];

export default function MediaPage() {
  const { dateRange } = useAppStore();
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("All");
  const [sourceType, setSourceType] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [entityType, setEntityType] = useState("All");
  const [region, setRegion] = useState("All");
  const [language, setLanguage] = useState("All");
  const [riskOnly, setRiskOnly] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
    };
    recognition.start();
  };

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Sidebar stats
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    if (sentiment !== "All") params.set("sentiment", sentiment);
    if (sourceType !== "All") params.set("source_type", sourceType);
    if (platform !== "All") params.set("platform", platform);
    if (entityType !== "All") params.set("entity_type", entityType);
    if (search) params.set("search", search);
    if (region !== "All") params.set("region", region);
    if (language !== "All") params.set("language", language);
    if (riskOnly) params.set("risk_flag", "true");

    try {
      const res = await fetch(`/api/feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateRange, page, sentiment, sourceType, platform, entityType, region, language, search, riskOnly]);

  const fetchSidebarStats = useCallback(async () => {
    const params = new URLSearchParams({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
    });
    try {
      const [ovRes, platRes] = await Promise.all([
        fetch(`/api/analytics/overview?${params}`),
        fetch(`/api/analytics/platform-breakdown?${params}`),
      ]);
      if (ovRes.ok) {
        const ov = await ovRes.json();
        setSentimentData([
          { name: "Positive", value: ov.positive_count || 0 },
          { name: "Negative", value: ov.negative_count || 0 },
          { name: "Neutral", value: ov.neutral_count || 0 },
          { name: "Mixed", value: ov.mixed_count || 0 },
        ].filter(d => d.value > 0));
      }
      if (platRes.ok) setPlatformData(await platRes.json());
    } catch {}
  }, [dateRange]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    fetchSidebarStats();
  }, [fetchSidebarStats]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [sentiment, sourceType, platform, entityType, region, language, search, riskOnly, dateRange]);

  return (
    <div className="flex gap-6">
      {/* Main Feed */}
      <div className="flex-1 min-w-0">
        {/* Filter Bar */}
        <Card className="mb-4 border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Search with Voice */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search mentions... or use voice"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <button
                  onClick={startVoiceSearch}
                  className={`p-2 rounded-lg border transition ${isListening ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  title="Voice search"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-2">
                {/* Sentiment filter */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {sentimentFilters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSentiment(s)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                        sentiment === s ? "bg-white shadow-sm text-brand-charcoal" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Source type */}
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {sourceTypeFilters.map((s) => (
                    <option key={s} value={s}>{s === "All" ? "All Types" : s.replace("_", " ")}</option>
                  ))}
                </select>

                {/* Platform */}
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {platformFilters.map((p) => (
                    <option key={p} value={p}>{p === "All" ? "All Platforms" : p.replace("_", " ")}</option>
                  ))}
                </select>

                {/* Entity type */}
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="All">All Entities</option>
                  <option value="brand">Brand</option>
                  <option value="competitor">Competitor</option>
                </select>

                {/* Region */}
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {regionFilters.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                {/* Language */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {languageFilters.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>

                {/* Risk flag */}
                <button
                  onClick={() => setRiskOnly(!riskOnly)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                    riskOnly ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Risk Only
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {total > 0 ? `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} results` : "No results"}
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((result) => (
              <MentionCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Newspaper} title="No mentions found" description="Try adjusting your filters or date range" />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Right Sidebar - Stats */}
      <div className="hidden xl:block w-80 space-y-4">
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sentiment Split</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <SentimentPieChart data={sentimentData} />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <PlatformBarChart data={platformData} />
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
