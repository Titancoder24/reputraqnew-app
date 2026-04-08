"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompetitorForm } from "@/components/forms/competitor-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Trash2, Edit2, Users } from "lucide-react";
import { toast } from "sonner";

interface Competitor {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface OverviewData {
  total_mentions?: number;
  [key: string]: any;
}

export default function CompetitorsPage() {
  const { dateRange } = useAppStore();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMentionCounts = useCallback(async () => {
    const params = new URLSearchParams({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
      entity_type: "competitor",
    });

    try {
      const res = await fetch(`/api/analytics/overview?${params}`);
      if (res.ok) {
        const data: OverviewData = await res.json();
        if (data && typeof data === "object") {
          setMentionCounts((data as any).competitor_counts || {});
        }
      }
    } catch {
      // silently fail
    }
  }, [dateRange]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  useEffect(() => {
    fetchMentionCounts();
  }, [fetchMentionCounts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this competitor?")) return;

    try {
      const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Competitor deleted");
        fetchCompetitors();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete competitor");
    }
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingId(competitor.id);
    setEditName(competitor.name);
    setEditType(competitor.type);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, type: editType }),
      });
      if (res.ok) {
        toast.success("Competitor updated");
        setEditingId(null);
        fetchCompetitors();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update competitor");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
  };

  const typeVariant = (type: string) => {
    switch (type) {
      case "direct":
        return "default" as const;
      case "indirect":
        return "secondary" as const;
      case "benchmark":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add competitor form */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Add Competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <CompetitorForm onSuccess={fetchCompetitors} />
        </CardContent>
      </Card>

      {/* Competitors table */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Competitors ({competitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell className="font-medium">
                      {editingId === competitor.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        />
                      ) : (
                        competitor.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === competitor.id ? (
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="direct">Direct</option>
                          <option value="indirect">Indirect</option>
                          <option value="benchmark">Benchmark</option>
                        </select>
                      ) : (
                        <Badge variant={typeVariant(competitor.type)}>
                          {competitor.type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mentionCounts[competitor.name] ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === competitor.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(competitor.id)}
                            className="bg-brand-sky hover:bg-brand-sky/90 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(competitor)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(competitor.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Users}
              title="No competitors yet"
              description="Add competitors above to track their media mentions alongside your brand"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
