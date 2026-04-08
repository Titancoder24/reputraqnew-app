"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { competitorSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, X, Tag } from "lucide-react";
import { useState, useCallback } from "react";

type CompetitorFormData = z.infer<typeof competitorSchema>;

interface CompetitorKeyword {
  keyword: string;
  type: "product" | "spokesperson" | "campaign" | "hashtag" | "competitor";
}

interface CompetitorFormProps {
  onSuccess?: () => void;
}

export function CompetitorForm({ onSuccess }: CompetitorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompetitorFormData>({
    resolver: zodResolver(competitorSchema),
    defaultValues: { type: "direct" },
  });

  const [industryTagsInput, setIndustryTagsInput] = useState("");
  const [lastAddedCompetitor, setLastAddedCompetitor] = useState<string | null>(null);
  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordType, setNewKeywordType] = useState<CompetitorKeyword["type"]>("product");
  const [savingKeywords, setSavingKeywords] = useState(false);

  const onSubmit = async (data: CompetitorFormData) => {
    try {
      // Parse industry tags from comma-separated input
      const industry_tags = industryTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          industry_tags: industry_tags.length > 0 ? industry_tags : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add competitor");
      }
      toast.success("Competitor added successfully");
      setLastAddedCompetitor(data.name);
      setCompetitorKeywords([]);
      reset();
      setIndustryTagsInput("");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddKeyword = useCallback(() => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (competitorKeywords.some((k) => k.keyword === trimmed && k.type === newKeywordType)) {
      toast.error("This keyword already exists");
      return;
    }
    setCompetitorKeywords((prev) => [...prev, { keyword: trimmed, type: newKeywordType }]);
    setNewKeyword("");
  }, [newKeyword, newKeywordType, competitorKeywords]);

  const handleRemoveKeyword = useCallback((index: number) => {
    setCompetitorKeywords((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveKeywords = async () => {
    if (!lastAddedCompetitor || competitorKeywords.length === 0) return;
    setSavingKeywords(true);
    try {
      const payload = competitorKeywords.map((k) => ({
        keyword: k.keyword,
        type: k.type,
        entity_name: lastAddedCompetitor,
        entity_type: "competitor" as const,
      }));

      const res = await fetch("/api/keywords/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save keywords");
      }

      toast.success(`${competitorKeywords.length} keyword(s) saved for ${lastAddedCompetitor}`);
      setCompetitorKeywords([]);
      setLastAddedCompetitor(null);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingKeywords(false);
    }
  };

  const handleDismissKeywords = () => {
    setLastAddedCompetitor(null);
    setCompetitorKeywords([]);
  };

  const keywordTypeLabels: Record<CompetitorKeyword["type"], string> = {
    product: "Product/Service",
    spokesperson: "Key Executive",
    campaign: "Campaign",
    hashtag: "Hashtag",
    competitor: "Other",
  };

  const keywordTypeBadgeVariant = (type: CompetitorKeyword["type"]) => {
    switch (type) {
      case "product":
        return "default" as const;
      case "spokesperson":
        return "secondary" as const;
      case "campaign":
        return "outline" as const;
      case "hashtag":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="comp-name" className="text-sm">Competitor Name</Label>
            <Input id="comp-name" placeholder="e.g., Competitor Inc." {...register("name")} className="mt-1" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="w-36">
            <Label htmlFor="comp-type" className="text-sm">Type</Label>
            <select
              id="comp-type"
              {...register("type")}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="direct">Direct</option>
              <option value="indirect">Indirect</option>
              <option value="benchmark">Benchmark</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="comp-tags" className="text-sm">Industry Tags (comma-separated)</Label>
          <Input
            id="comp-tags"
            placeholder="e.g., SaaS, Fintech, Healthcare"
            value={industryTagsInput}
            onChange={(e) => setIndustryTagsInput(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Optional. Separate multiple tags with commas.</p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Competitor
          </Button>
        </div>
      </form>

      {/* Post-add keyword section */}
      {lastAddedCompetitor && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Add keywords for &quot;{lastAddedCompetitor}&quot;
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismissKeywords}
              className="text-blue-600 hover:text-blue-800"
            >
              Skip
            </Button>
          </div>
          <p className="text-xs text-blue-700">
            Add product names, executive names, campaigns, and hashtags to track for this competitor.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="kw-value" className="text-xs text-blue-800">Keyword</Label>
              <Input
                id="kw-value"
                placeholder="e.g., Product X, #CompetitorCampaign, CEO Name"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                className="mt-1"
              />
            </div>
            <div className="w-40">
              <Label htmlFor="kw-type" className="text-xs text-blue-800">Type</Label>
              <select
                id="kw-type"
                value={newKeywordType}
                onChange={(e) => setNewKeywordType(e.target.value as CompetitorKeyword["type"])}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="product">Product/Service</option>
                <option value="spokesperson">Key Executive</option>
                <option value="campaign">Campaign</option>
                <option value="hashtag">Hashtag</option>
                <option value="competitor">Other</option>
              </select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddKeyword}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {competitorKeywords.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {competitorKeywords.map((kw, idx) => (
                  <Badge key={idx} variant={keywordTypeBadgeVariant(kw.type)} className="flex items-center gap-1 py-1">
                    <span className="text-xs opacity-70">{keywordTypeLabels[kw.type]}:</span>
                    {kw.keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(idx)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingKeywords}
                  onClick={handleSaveKeywords}
                  className="bg-brand-sky hover:bg-brand-sky/90 text-white"
                >
                  {savingKeywords ? "Saving..." : `Save ${competitorKeywords.length} Keyword(s)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
