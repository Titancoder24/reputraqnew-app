"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, Edit2, Users, ChevronDown, ChevronRight, Plus, X, Tag } from "lucide-react";
import { toast } from "sonner";

interface Competitor {
  id: string;
  name: string;
  type: string;
  industry_tags: string[] | null;
  created_at: string;
}

interface Keyword {
  id: string;
  keyword: string;
  type: string;
  entity_name: string;
  entity_type: string;
  is_active: boolean;
  created_at: string;
}

interface OverviewData {
  total_mentions?: number;
  [key: string]: any;
}

const KEYWORD_TYPE_LABELS: Record<string, string> = {
  product: "Product/Service",
  spokesperson: "Key Executive",
  campaign: "Campaign",
  hashtag: "Hashtag",
  competitor: "Other",
  brand: "Brand",
};

export default function CompetitorsPage() {
  const { dateRange } = useAppStore();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  // Keyword tracking
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const [newKwValue, setNewKwValue] = useState("");
  const [newKwType, setNewKwType] = useState("product");
  const [addingKeyword, setAddingKeyword] = useState(false);

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitors");
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/keywords");
      if (res.ok) {
        const data = await res.json();
        setAllKeywords(data.keywords || data);
      }
    } catch {
      // silently fail
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
    fetchKeywords();
  }, [fetchCompetitors, fetchKeywords]);

  useEffect(() => {
    fetchMentionCounts();
  }, [fetchMentionCounts]);

  const handleRefresh = () => {
    fetchCompetitors();
    fetchKeywords();
  };

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

  const toggleExpanded = (competitorId: string) => {
    setExpandedCompetitor((prev) => (prev === competitorId ? null : competitorId));
    setNewKwValue("");
    setNewKwType("product");
  };

  const getCompetitorKeywords = (competitorName: string) => {
    return allKeywords.filter(
      (kw) => kw.entity_type === "competitor" && kw.entity_name === competitorName
    );
  };

  const handleAddCompetitorKeyword = async (competitorName: string) => {
    const trimmed = newKwValue.trim();
    if (!trimmed) return;
    setAddingKeyword(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          type: newKwType,
          entity_name: competitorName,
          entity_type: "competitor",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add keyword");
      }
      toast.success("Keyword added");
      setNewKwValue("");
      fetchKeywords();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      const res = await fetch(`/api/keywords/${keywordId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Keyword deleted");
        fetchKeywords();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete keyword");
      }
    } catch {
      toast.error("Failed to delete keyword");
    }
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
          <CompetitorForm onSuccess={handleRefresh} />
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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Industry Tags</TableHead>
                  <TableHead className="text-center">Keywords</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor) => {
                  const competitorKws = getCompetitorKeywords(competitor.name);
                  const isExpanded = expandedCompetitor === competitor.id;

                  return (
                    <Fragment key={competitor.id}>
                      <TableRow>
                        <TableCell className="w-8 pr-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => toggleExpanded(competitor.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
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
                        <TableCell>
                          {competitor.industry_tags && competitor.industry_tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {competitor.industry_tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="cursor-pointer" onClick={() => toggleExpanded(competitor.id)}>
                            <Tag className="w-3 h-3 mr-1" />
                            {competitorKws.length}
                          </Badge>
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

                      {/* Expanded keyword row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Tag className="w-4 h-4" />
                                Keywords for &quot;{competitor.name}&quot;
                              </div>

                              {/* Existing keywords */}
                              {competitorKws.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {competitorKws.map((kw) => (
                                    <Badge key={kw.id} variant="secondary" className="flex items-center gap-1 py-1">
                                      <span className="text-xs opacity-70">
                                        {KEYWORD_TYPE_LABELS[kw.type] || kw.type}:
                                      </span>
                                      {kw.keyword}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteKeyword(kw.id)}
                                        className="ml-1 hover:text-red-500"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No keywords yet. Add product names, executive names, campaigns, or hashtags below.</p>
                              )}

                              {/* Add keyword form */}
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <Label htmlFor={`kw-${competitor.id}`} className="text-xs">New Keyword</Label>
                                  <Input
                                    id={`kw-${competitor.id}`}
                                    placeholder="e.g., Product X, CEO Name, #Campaign"
                                    value={newKwValue}
                                    onChange={(e) => setNewKwValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddCompetitorKeyword(competitor.name);
                                      }
                                    }}
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div className="w-40">
                                  <Label htmlFor={`kw-type-${competitor.id}`} className="text-xs">Type</Label>
                                  <select
                                    id={`kw-type-${competitor.id}`}
                                    value={newKwType}
                                    onChange={(e) => setNewKwType(e.target.value)}
                                    className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                                  >
                                    <option value="product">Product/Service</option>
                                    <option value="spokesperson">Key Executive</option>
                                    <option value="campaign">Campaign</option>
                                    <option value="hashtag">Hashtag</option>
                                    <option value="competitor">Other</option>
                                  </select>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={addingKeyword || !newKwValue.trim()}
                                  onClick={() => handleAddCompetitorKeyword(competitor.name)}
                                  className="bg-brand-sky hover:bg-brand-sky/90 text-white h-8"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {addingKeyword ? "Adding..." : "Add"}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
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
