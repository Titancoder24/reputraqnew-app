/* ------------------------------------------------------------------ */
/*  Plan configuration                                                 */
/* ------------------------------------------------------------------ */

export interface PlanFeatures {
  max_keywords: number;
  max_competitors: number;
  features: string[];
}

export const PLAN_CONFIG: Record<string, PlanFeatures> = {
  starter: {
    max_keywords: 5,
    max_competitors: 2,
    features: [
      "Basic sentiment analysis",
      "Weekly scans",
      "Email alerts",
      "Dashboard overview",
    ],
  },
  growth: {
    max_keywords: 15,
    max_competitors: 5,
    features: [
      "Advanced sentiment analysis",
      "Daily scans",
      "Email & webhook alerts",
      "Dashboard overview",
      "Competitor tracking",
      "Share of Voice",
      "CSV export",
    ],
  },
  pro: {
    max_keywords: 50,
    max_competitors: 15,
    features: [
      "AI-powered sentiment analysis",
      "Real-time scans",
      "All alert channels",
      "Full dashboard & analytics",
      "Advanced competitor tracking",
      "Share of Voice",
      "Brand Position Score",
      "Executive visibility tracking",
      "CSV & PDF export",
      "API access",
      "Custom reports",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Chart configuration                                                */
/* ------------------------------------------------------------------ */

export type ChartConfig = Record<
  string,
  { label: string; color: string }
>;

export const sentimentChartConfig: ChartConfig = {
  Positive: {
    label: "Positive",
    color: "#22c55e",
  },
  Negative: {
    label: "Negative",
    color: "#ef4444",
  },
  Neutral: {
    label: "Neutral",
    color: "#6b7280",
  },
  Mixed: {
    label: "Mixed",
    color: "#f59e0b",
  },
};

/* ------------------------------------------------------------------ */
/*  Share of Voice chart colors                                        */
/* ------------------------------------------------------------------ */

export const sovChartColors: string[] = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#3b82f6", // blue
];

/* ------------------------------------------------------------------ */
/*  Platform colors                                                    */
/* ------------------------------------------------------------------ */

export const platformColors: Record<string, string> = {
  reddit: "#FF4500",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  quora: "#B92B27",
  instagram: "#E4405F",
  facebook: "#1877F2",
  web: "#6B7280",
};
