"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MentionTrendChart } from "@/components/charts/mention-trend-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TrendingUp, Flame } from "lucide-react";

export default function TrendingPage() {
  const { dateRange } = useAppStore();
  const [trendData, setTrendData] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
      });
      try {
        const [trendRes, themesRes] = await Promise.all([
          fetch(`/api/analytics/sentiment-trend?${params}`),
          fetch(`/api/analytics/top-themes?${params}`),
        ]);
        if (trendRes.ok) setTrendData(await trendRes.json());
        if (themesRes.ok) setThemes(await themesRes.json());
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [dateRange]);

  // Detect spikes: days where total mentions > 2x average
  const avgMentions = trendData.length > 0
    ? trendData.reduce((sum, d) => sum + (d.positive || 0) + (d.negative || 0) + (d.neutral || 0) + (d.mixed || 0), 0) / trendData.length
    : 0;
  const spikeDays = trendData.filter(d => {
    const total = (d.positive || 0) + (d.negative || 0) + (d.neutral || 0) + (d.mixed || 0);
    return total > avgMentions * 2 && avgMentions > 0;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Chart */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Mention Trend</CardTitle></CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <MentionTrendChart data={trendData} />
          ) : (
            <EmptyState icon={TrendingUp} title="No trend data yet" />
          )}
        </CardContent>
      </Card>

      {/* Spike Detection */}
      {spikeDays.length > 0 && (
        <Card className="border border-amber-200 rounded-xl shadow-sm bg-amber-50/50">
          <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" /> Mention Spikes Detected
          </CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {spikeDays.map((d, i) => {
                const total = (d.positive || 0) + (d.negative || 0) + (d.neutral || 0) + (d.mixed || 0);
                return (
                  <Badge key={i} variant="outline" className="border-amber-300 text-amber-700 bg-white">
                    {d.date}: {total} mentions ({Math.round(total / avgMentions)}x avg)
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Themes */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Trending Themes</CardTitle></CardHeader>
        <CardContent>
          {themes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {themes.map((t: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1.5">
                  {(t.theme || t.name || "").replace(/_/g, " ")}
                  <span className="ml-1.5 text-gray-400">({t.count})</span>
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No themes detected" description="Themes appear after scanning" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
