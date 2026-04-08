"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orgSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

type OrgFormData = z.infer<typeof orgSchema>;

interface OrgSetupFormProps {
  onSubmit: (data: OrgFormData) => Promise<void>;
  defaultValues?: Partial<OrgFormData>;
  submitLabel?: string;
}

const industries = [
  "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
  "Education", "Media", "Real Estate", "Automotive", "FMCG",
  "Telecom", "Energy", "Travel", "Food & Beverage", "Other",
];

export function OrgSetupForm({ onSubmit, defaultValues, submitLabel = "Continue" }: OrgSetupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      regions: ["IN"],
      languages: ["en"],
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="brand_name">Brand Name *</Label>
        <Input id="brand_name" placeholder="Your brand or company name" {...register("brand_name")} className="mt-1" />
        {errors.brand_name && <p className="text-xs text-red-500 mt-1">{errors.brand_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="parent_company">Parent Company</Label>
        <Input id="parent_company" placeholder="Optional" {...register("parent_company")} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="industry_category">Industry</Label>
        <select
          id="industry_category"
          {...register("industry_category")}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select industry...</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Region</Label>
          <select
            {...register("regions.0")}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="SG">Singapore</option>
          </select>
        </div>
        <div>
          <Label>Language</Label>
          <select
            {...register("languages.0")}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-sky hover:bg-brand-sky/90 text-white">
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
