"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MentionCard } from "@/components/dashboard/mention-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const platforms = [
  { value: "all", label: "All" },
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "Twitter/X" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "quora", label: "Quora" },
];

export default function SocialPage() {
  const { dateRange } = useAppStore();
  const [platform, setPlatform] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    if (platform !== "all") params.set("platform", platform);
    // Filter to social-type sources
    if (platform === "all") {
      params.set("source_type", "social");
    }
    try {
      const res = await fetch(`/api/feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      }
    } catch {} finally { setLoading(false); }
  }, [dateRange, platform, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => { setPage(1); }, [platform, dateRange]);

  return (
    <div className="space-y-4">
      <Tabs value={platform} onValueChange={setPlatform}>
        <TabsList className="bg-gray-100">
          {platforms.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-sm text-gray-500">{total} results found</p>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r) => <MentionCard key={r.id} result={r} />)}
        </div>
      ) : (
        <EmptyState icon={MessageCircle} title="No social mentions" description="Social media mentions will appear here after scans" />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
