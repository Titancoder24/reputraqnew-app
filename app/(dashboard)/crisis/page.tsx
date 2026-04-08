"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/dashboard/score-gauge";
import { MentionCard } from "@/components/dashboard/mention-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ShieldAlert, AlertTriangle, TrendingDown, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CrisisPage() {
  const { dateRange } = useAppStore();
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskMentions, setRiskMentions] = useState<any[]>([]);
  const [negativeMentions, setNegativeMentions] = useState<any[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingScore, setLoadingScore] = useState(true);
  const [assessingRisk, setAssessingRisk] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingScore(true);
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
      });
      try {
        const [riskRes, negRes, scoreRes] = await Promise.all([
          fetch(`/api/feed?${params}&risk_flag=true&limit=10`),
          fetch(`/api/feed?${params}&sentiment=Negative&limit=10`),
          fetch(`/api/analytics/score?${params}`),
        ]);
        if (riskRes.ok) {
          const d = await riskRes.json();
          setRiskMentions(d.results || []);
        }
        if (negRes.ok) {
          const d = await negRes.json();
          setNegativeMentions(d.results || []);
        }
        if (scoreRes.ok) {
          const d = await scoreRes.json();
          setRiskScore(d.score ?? d.reputation_score ?? null);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
        setLoadingScore(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const runRiskAssessment = async () => {
    setAssessingRisk(true);
    try {
      const res = await fetch("/api/ai/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
        }),
      });
      if (res.ok) setRiskAssessment(await res.json());
    } catch {
      toast.error("Failed to assess risk");
    } finally {
      setAssessingRisk(false);
    }
  };

  const riskLevelColor: Record<string, string> = {
    low: "text-green-600 bg-green-50 border-green-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    moderate: "text-amber-600 bg-amber-50 border-amber-200",
    high: "text-red-600 bg-red-50 border-red-200",
    critical: "text-red-800 bg-red-100 border-red-300",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row: Score Gauge + AI Risk Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Score Gauge */}
        <Card className="border border-red-200 rounded-xl shadow-sm bg-gradient-to-b from-red-50/50 to-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              Reputation Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            {loadingScore ? (
              <Skeleton className="w-32 h-32 rounded-full" />
            ) : riskScore != null ? (
              <div className="relative">
                <ScoreGauge score={riskScore} label="Reputation Score" size="lg" />
              </div>
            ) : (
              <p className="text-sm text-gray-500">Score unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* AI Risk Assessment */}
        <Card className="lg:col-span-2 border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-sky" /> AI Risk Assessment
              </CardTitle>
              <Button
                onClick={runRiskAssessment}
                disabled={assessingRisk}
                size="sm"
                className="bg-brand-sky hover:bg-brand-sky/90 text-white"
              >
                {assessingRisk ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <ShieldAlert className="w-4 h-4 mr-1" />
                )}
                Assess Risk
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {riskAssessment ? (
              <div className="space-y-4">
                {riskAssessment.risk_level && (
                  <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${
                      riskLevelColor[riskAssessment.risk_level] || riskLevelColor.low
                    }`}
                  >
                    Risk Level: {riskAssessment.risk_level?.toUpperCase()}
                  </div>
                )}
                {riskAssessment.summary && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{riskAssessment.summary}</p>
                )}
                {riskAssessment.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {riskAssessment.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Click &quot;Assess Risk&quot; for AI-powered risk analysis
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk-flagged mentions */}
      <Card className="border border-red-100 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Risk-Flagged Mentions (
            {riskMentions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskMentions.length > 0 ? (
            <div className="space-y-3">
              {riskMentions.map((r) => (
                <MentionCard key={r.id} result={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              title="No risk flags"
              description="Good news - no risk-flagged content detected"
            />
          )}
        </CardContent>
      </Card>

      {/* Negative mentions */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" /> Negative Mentions (
            {negativeMentions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {negativeMentions.length > 0 ? (
            <div className="space-y-3">
              {negativeMentions.map((r) => (
                <MentionCard key={r.id} result={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No negative mentions"
              description="All clear in this period"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
