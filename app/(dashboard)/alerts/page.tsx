"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertForm } from "@/components/forms/alert-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Bell, Trash2, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AlertRule {
  id: string;
  trigger_type: string;
  channel: string;
  recipients: string[];
  is_active: boolean;
  created_at?: string;
}

interface AlertLogEntry {
  id: string;
  alert_rule_id: string;
  trigger_type?: string;
  channel?: string;
  message?: string;
  sent_at?: string;
  created_at?: string;
}

const triggerTypeLabels: Record<string, string> = {
  negative_article: "Negative Article",
  competitor_positive: "Competitor Positive",
  tier1_mention: "Tier 1 Mention",
  executive_mention: "Executive Mention",
  crisis_keyword: "Crisis Keyword",
  mention_spike: "Mention Spike",
};

const channelColors: Record<string, string> = {
  email: "bg-blue-50 text-blue-700 border-blue-200",
  slack: "bg-purple-50 text-purple-700 border-purple-200",
  whatsapp: "bg-green-50 text-green-700 border-green-200",
  sms: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data) ? data : data.rules || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/alerts/log");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : data.logs || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, [fetchRules, fetchLogs]);

  const handleToggle = async (rule: AlertRule) => {
    setTogglingId(rule.id);
    try {
      const res = await fetch(`/api/alerts/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
        );
        toast.success(`Alert ${!rule.is_active ? "activated" : "deactivated"}`);
      } else {
        toast.error("Failed to update alert");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.success("Alert rule deleted");
      } else {
        toast.error("Failed to delete alert");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Alert Rule - Collapsible */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader
          className="cursor-pointer"
          onClick={() => setFormOpen(!formOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-sky" />
              Create Alert Rule
            </CardTitle>
            {formOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {formOpen && (
          <CardContent>
            <AlertForm
              onSuccess={() => {
                fetchRules();
                setFormOpen(false);
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* Existing Alert Rules */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No alert rules"
              description="Create your first alert rule to get notified about important reputation events"
              actionLabel="Create Alert"
              onAction={() => setFormOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-sm">
                      {triggerTypeLabels[rule.trigger_type] || rule.trigger_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${channelColors[rule.channel] || ""}`}
                      >
                        {rule.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rule.recipients || []).slice(0, 2).map((r, i) => (
                          <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {r}
                          </span>
                        ))}
                        {(rule.recipients || []).length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{rule.recipients.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggle(rule)}
                        disabled={togglingId === rule.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert Log */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Recent Alert Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No alerts sent yet"
              description="Alert logs will appear here when your rules are triggered"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">
                      {triggerTypeLabels[log.trigger_type || ""] || log.trigger_type?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.channel || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {log.message || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {log.sent_at || log.created_at
                        ? new Date(log.sent_at || log.created_at!).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
