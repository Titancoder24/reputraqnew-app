"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompetitorLineChart } from "@/components/charts/competitor-line-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { BarChart3, Users } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  type: string;
}

interface ComparisonData {
  chart: { date: string; brand: number; competitor: number }[];
  brand_total: number;
  competitor_total: number;
}

export default function ComparePage() {
  const { dateRange, org } = useAppStore();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const brandName = org?.brand_name || "Your Brand";

  const fetchCompetitors = useCallback(async () => {
    setLoadingCompetitors(true);
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data);
        if (data.length > 0 && !selectedCompetitor) {
          setSelectedCompetitor(data[0].name);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCompetitors(false);
    }
  }, []);

  const fetchComparison = useCallback(async () => {
    if (!selectedCompetitor) return;

    setLoadingComparison(true);
    const params = new URLSearchParams({
      competitor_name: selectedCompetitor,
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
    });

    try {
      const res = await fetch(`/api/analytics/competitor-comparison?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingComparison(false);
    }
  }, [selectedCompetitor, dateRange]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loadingCompetitors) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardContent>
          <EmptyState
            icon={Users}
            title="No competitors to compare"
            description="Add competitors first from the Competitors page to compare mention data"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitor selector */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compare Brand vs Competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Compare</span>
            <span className="text-sm font-semibold text-brand-sky">{brandName}</span>
            <span className="text-sm text-gray-500">vs</span>
            <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select competitor" />
              </SelectTrigger>
              <SelectContent>
                {competitors.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Your Brand Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComparison ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-3xl font-bold text-brand-sky">
                {comparisonData?.brand_total ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              {selectedCompetitor} Mentions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComparison ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-3xl font-bold text-gray-700">
                {comparisonData?.competitor_total ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Daily Mention Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingComparison ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : comparisonData?.chart && comparisonData.chart.length > 0 ? (
            <CompetitorLineChart
              data={comparisonData.chart}
              brandName={brandName}
              competitorName={selectedCompetitor}
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No comparison data"
              description="Data will appear once scans have collected mention data for both entities"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
