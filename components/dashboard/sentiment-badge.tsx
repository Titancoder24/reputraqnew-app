"use client";

import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Positive: "bg-green-50 text-green-700 border-green-200",
  Negative: "bg-red-50 text-red-700 border-red-200",
  Neutral: "bg-gray-50 text-gray-700 border-gray-200",
  Mixed: "bg-amber-50 text-amber-700 border-amber-200",
};

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", styles[sentiment] || styles.Neutral)}>
      {sentiment}
    </span>
  );
}
