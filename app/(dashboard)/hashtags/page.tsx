"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MentionCard } from "@/components/dashboard/mention-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Hash, Search, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function HashtagsPage() {
  const { dateRange } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const hashtag = query.startsWith("#") ? query : `#${query}`;
    const params = new URLSearchParams({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
      search: hashtag,
      limit: "50",
    });
    try {
      const res = await fetch(`/api/feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Search Hashtags</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter hashtag..."
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length} results for #{query.replace("#", "")}</p>
          {results.map((r) => <MentionCard key={r.id} result={r} />)}
        </div>
      ) : searched ? (
        <EmptyState icon={Hash} title="No results found" description="Try a different hashtag or date range" />
      ) : null}
    </div>
  );
}
