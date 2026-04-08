"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { competitorSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";

type CompetitorFormData = z.infer<typeof competitorSchema>;

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

  const onSubmit = async (data: CompetitorFormData) => {
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add competitor");
      }
      toast.success("Competitor added successfully");
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
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
      <Button type="submit" disabled={isSubmitting} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </form>
  );
}
