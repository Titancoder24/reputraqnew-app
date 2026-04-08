"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileText, Download, Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { dateRange } = useAppStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState("weekly");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) setReports(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      toast.success("Report generated!");
      fetchReports();
    } catch (e: any) { toast.error(e.message); } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      {/* Generate */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Generate Report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              <Calendar className="w-4 h-4 inline mr-1" />
              {dateRange.from.toLocaleDateString()} — {dateRange.to.toLocaleDateString()}
            </div>
            <Button onClick={generateReport} disabled={generating} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Generated Reports</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} title="No reports yet" description="Generate your first report above" />
          ) : (
            <div className="space-y-3">
              {reports.map((r: any) => (
                <Card key={r.id} className="border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-brand-sky" />
                        <div>
                          <p className="font-medium text-sm capitalize">{r.period} Report</p>
                          <p className="text-xs text-gray-400">
                            {new Date(r.date_from).toLocaleDateString()} — {new Date(r.date_to).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <Badge className="bg-green-50 text-green-700 border-green-200">{r.positive_count || 0} positive</Badge>
                          <Badge className="bg-red-50 text-red-700 border-red-200">{r.negative_count || 0} negative</Badge>
                          <Badge variant="secondary">{r.total_mentions || 0} total</Badge>
                        </div>
                        {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {expandedId === r.id && r.ai_summary && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2">AI Summary</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.ai_summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
