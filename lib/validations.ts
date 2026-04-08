import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const orgSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required"),
  parent_company: z.string().optional(),
  industry_category: z.string().optional(),
  regions: z.array(z.string()).min(1, "At least one region is required"),
  languages: z.array(z.string()).min(1, "At least one language is required"),
});

export const keywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  type: z.enum(["brand", "product", "spokesperson", "campaign", "hashtag", "competitor"]),
  entity_name: z.string().min(1, "Entity name is required"),
  entity_type: z.enum(["brand", "competitor"]),
});

export const competitorSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  type: z.enum(["direct", "indirect", "benchmark"]),
  industry_tags: z.array(z.string()).optional(),
});

export const alertSchema = z.object({
  trigger_type: z.enum([
    "negative_article",
    "competitor_positive",
    "tier1_mention",
    "executive_mention",
    "crisis_keyword",
    "mention_spike",
  ]),
  channel: z.enum(["email", "slack", "whatsapp", "sms"]),
  recipients: z.array(z.string().email("Invalid email")).min(1, "At least one recipient is required"),
});

export const approveSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  plan: z.enum(["starter", "growth", "pro"]),
});
