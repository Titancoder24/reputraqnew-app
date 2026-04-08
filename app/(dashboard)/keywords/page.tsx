"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeywordForm } from "@/components/forms/keyword-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Trash2, Key } from "lucide-react";
import { toast } from "sonner";

interface Keyword {
  id: string;
  keyword: string;
  type: string;
  entity_name: string;
  entity_type: string;
  is_active: boolean;
  total_results: number;
  last_scanned_at: string | null;
}

export default function KeywordsPage() {
  const { org, subscription } = useAppStore();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  const brandName = org?.brand_name || "My Brand";
  const maxKeywords = (subscription as any)?.max_keywords ?? 50;
  const usedKeywords = keywords.length;
  const usagePercent = maxKeywords > 0 ? Math.min((usedKeywords / maxKeywords) * 100, 100) : 0;

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keywords");
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/keywords/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setKeywords((prev) =>
          prev.map((k) =>
            k.id === id ? { ...k, is_active: !currentActive } : k
          )
        );
        toast.success(`Keyword ${!currentActive ? "activated" : "deactivated"}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update keyword");
      }
    } catch {
      toast.error("Failed to update keyword");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this keyword?")) return;

    try {
      const res = await fetch(`/api/keywords/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Keyword deleted");
        fetchKeywords();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete keyword");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "brand":
        return "default" as const;
      case "product":
        return "secondary" as const;
      case "competitor":
        return "destructive" as const;
      case "hashtag":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage meter */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Keyword Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Using <span className="font-semibold">{usedKeywords}</span> of{" "}
                <span className="font-semibold">{maxKeywords}</span> keywords
              </span>
              <span className="text-gray-500">{Math.round(usagePercent)}%</span>
            </div>
            <Progress value={usagePercent} />
          </div>
        </CardContent>
      </Card>

      {/* Add keyword form */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Add Keyword</CardTitle>
        </CardHeader>
        <CardContent>
          <KeywordForm
            entityName={brandName}
            entityType="brand"
            onSuccess={fetchKeywords}
          />
        </CardContent>
      </Card>

      {/* Keywords table */}
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Keywords ({keywords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {keywords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead>Last Scanned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                    <TableCell>
                      <Badge variant={typeColor(keyword.type)}>{keyword.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{keyword.entity_name}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={keyword.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(keyword.id, keyword.is_active)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {keyword.total_results ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(keyword.last_scanned_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(keyword.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Key}
              title="No keywords yet"
              description="Add keywords to start scanning for media mentions"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
