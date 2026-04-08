"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keywordSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";

type KeywordFormData = z.infer<typeof keywordSchema>;

interface KeywordFormProps {
  entityName: string;
  entityType: "brand" | "competitor";
  onSuccess?: () => void;
}

export function KeywordForm({ entityName, entityType, onSuccess }: KeywordFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KeywordFormData>({
    resolver: zodResolver(keywordSchema),
    defaultValues: { entity_name: entityName, entity_type: entityType, type: "brand" },
  });

  const onSubmit = async (data: KeywordFormData) => {
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add keyword");
      }
      toast.success("Keyword added successfully");
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="keyword" className="text-sm">Keyword</Label>
        <Input
          id="keyword"
          placeholder="e.g., brand name, product..."
          {...register("keyword")}
          className="mt-1"
        />
        {errors.keyword && <p className="text-xs text-red-500 mt-1">{errors.keyword.message}</p>}
      </div>
      <div className="w-40">
        <Label htmlFor="type" className="text-sm">Type</Label>
        <select
          id="type"
          {...register("type")}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="brand">Brand</option>
          <option value="product">Product</option>
          <option value="spokesperson">Spokesperson</option>
          <option value="campaign">Campaign</option>
          <option value="hashtag">Hashtag</option>
          <option value="competitor">Competitor</option>
        </select>
      </div>
      <input type="hidden" {...register("entity_name")} />
      <input type="hidden" {...register("entity_type")} />
      <Button type="submit" disabled={isSubmitting} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </form>
  );
}
