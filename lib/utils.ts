import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "MMM d, yyyy") {
  try {
    return format(new Date(date), fmt);
  } catch {
    return String(date);
  }
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function toIST(date: Date): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export function sentimentColor(s: string): string {
  const map: Record<string, string> = {
    Positive: "text-sentiment-positive",
    Negative: "text-sentiment-negative",
    Neutral: "text-sentiment-neutral",
    Mixed: "text-sentiment-mixed",
  };
  return map[s] || "text-gray-500";
}

export function sentimentBg(s: string): string {
  const map: Record<string, string> = {
    Positive: "bg-green-50 text-green-700 border-green-200",
    Negative: "bg-red-50 text-red-700 border-red-200",
    Neutral: "bg-gray-50 text-gray-700 border-gray-200",
    Mixed: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[s] || "bg-gray-50 text-gray-700 border-gray-200";
}

export function truncate(str: string, len: number): string {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}
