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
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

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
  const [swot, setSwot] = useState<any>(null);
  const [loadingSwot, setLoadingSwot] = useState(false);

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
    setSwot(null); // Reset SWOT when competitor changes
  }, [fetchComparison]);

  const runSwotAnalysis = async () => {
    if (!selectedCompetitor) return;
    setLoadingSwot(true);
    try {
      const res = await fetch("/api/ai/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_name: selectedCompetitor,
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
        }),
      });
      if (res.ok) setSwot(await res.json());
      else toast.error("Failed to generate SWOT analysis");
    } catch { toast.error("SWOT analysis failed"); }
    finally { setLoadingSwot(false); }
  };

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
      {/* SWOT Analysis */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-sky" /> SWOT Analysis
            </CardTitle>
            <Button onClick={runSwotAnalysis} disabled={loadingSwot} size="sm" className="bg-brand-sky hover:bg-brand-sky/90 text-white">
              {loadingSwot ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Generate SWOT
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {swot ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-800 mb-2">Strengths</h4>
                <ul className="space-y-1">{swot.strengths?.map((s: string, i: number) => <li key={i} className="text-sm text-green-700">+ {s}</li>)}</ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Weaknesses</h4>
                <ul className="space-y-1">{swot.weaknesses?.map((s: string, i: number) => <li key={i} className="text-sm text-red-700">- {s}</li>)}</ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Opportunities</h4>
                <ul className="space-y-1">{swot.opportunities?.map((s: string, i: number) => <li key={i} className="text-sm text-blue-700">{s}</li>)}</ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Threats</h4>
                <ul className="space-y-1">{swot.threats?.map((s: string, i: number) => <li key={i} className="text-sm text-amber-700">{s}</li>)}</ul>
              </div>
              {swot.summary && <p className="text-sm text-gray-600 md:col-span-2 mt-2">{swot.summary}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click &quot;Generate SWOT&quot; to get an AI-powered SWOT analysis comparing your brand vs {selectedCompetitor}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
