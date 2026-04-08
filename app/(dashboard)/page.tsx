"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { MentionCard } from "@/components/dashboard/mention-card";
import { MentionTrendChart } from "@/components/charts/mention-trend-chart";
import { SovPieChart } from "@/components/charts/sov-pie-chart";
import { SentimentPieChart } from "@/components/charts/sentiment-pie-chart";
import { PlatformBarChart } from "@/components/charts/platform-bar-chart";
import { SourceBarChart } from "@/components/charts/source-bar-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Newspaper, TrendingUp, ThumbsUp, AlertTriangle, BarChart3, Activity } from "lucide-react";

export default function DashboardPage() {
  const { dateRange, org } = useAppStore();
  const [overview, setOverview] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [sovData, setSovData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [topSources, setTopSources] = useState<any[]>([]);
  const [recentMentions, setRecentMentions] = useState<any[]>([]);
  const [reputationIndex, setReputationIndex] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
      });

      try {
        const [ovRes, trendRes, sovRes, platRes, srcRes, feedRes, repRes] = await Promise.all([
          fetch(`/api/analytics/overview?${params}`),
          fetch(`/api/analytics/sentiment-trend?${params}`),
          fetch(`/api/analytics/sov?${params}`),
          fetch(`/api/analytics/platform-breakdown?${params}`),
          fetch(`/api/analytics/top-sources?${params}`),
          fetch(`/api/feed?${params}&limit=5`),
          fetch(`/api/analytics/reputation-index?${params}`),
        ]);

        if (ovRes.ok) setOverview(await ovRes.json());
        if (trendRes.ok) setTrendData(await trendRes.json());
        if (sovRes.ok) setSovData(await sovRes.json());
        if (platRes.ok) setPlatformData(await platRes.json());
        if (srcRes.ok) setTopSources(await srcRes.json());
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          setRecentMentions(feedData.results || []);
        }
        if (repRes.ok) setReputationIndex(await repRes.json());
      } catch {
        // Silently fail, show empty states
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const sentimentData = overview ? [
    { name: "Positive", value: overview.positive_count || 0 },
    { name: "Negative", value: overview.negative_count || 0 },
    { name: "Neutral", value: overview.neutral_count || 0 },
    { name: "Mixed", value: overview.mixed_count || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Mentions"
          value={overview?.total_mentions || 0}
          icon={Newspaper}
          iconColor="text-brand-sky"
          iconBg="bg-brand-sky/10"
        />
        <StatCard
          title="Positive Sentiment"
          value={`${overview?.total_mentions ? Math.round((overview.positive_count / overview.total_mentions) * 100) : 0}%`}
          icon={ThumbsUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Media Reach"
          value={overview?.high_reach_count || 0}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Risk Flags"
          value={overview?.risk_count || 0}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Reputation Index */}
      {reputationIndex && reputationIndex.overall_index > 0 && (
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-sky" /> Combined Reputation Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8 flex-wrap">
              <div className="text-center">
                <p className="text-4xl font-bold text-brand-sky">{reputationIndex.overall_index}</p>
                <p className="text-xs text-gray-500 mt-1">Overall Score</p>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "News", value: reputationIndex.news_score, color: "text-blue-600" },
                  { label: "Social", value: reputationIndex.social_score, color: "text-purple-600" },
                  { label: "Volume", value: reputationIndex.volume_score, color: "text-green-600" },
                  { label: "Tier-1", value: reputationIndex.tier1_score, color: "text-amber-600" },
                  { label: "Risk", value: reputationIndex.risk_score, color: "text-red-600" },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Mention Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <MentionTrendChart data={trendData} />
            ) : (
              <EmptyState icon={BarChart3} title="No trend data" description="Data will appear after scans run" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <SentimentPieChart data={sentimentData} />
            ) : (
              <EmptyState icon={BarChart3} title="No data" description="Awaiting scan results" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Share of Voice</CardTitle>
          </CardHeader>
          <CardContent>
            {sovData.length > 0 ? (
              <SovPieChart data={sovData} />
            ) : (
              <EmptyState icon={BarChart3} title="No data" description="Add competitors to see SOV" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <PlatformBarChart data={platformData} />
            ) : (
              <EmptyState icon={BarChart3} title="No data" />
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {topSources.length > 0 ? (
              <SourceBarChart data={topSources} />
            ) : (
              <EmptyState icon={BarChart3} title="No data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Mentions */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMentions.length > 0 ? (
            <div className="space-y-3">
              {recentMentions.map((mention: any) => (
                <MentionCard key={mention.id} result={mention} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Newspaper} title="No mentions yet" description="Run a scan to collect media mentions" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
