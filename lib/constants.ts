import { type ChartConfig } from "@/components/ui/chart";

export const PLAN_CONFIG = {
  starter: {
    max_keywords: 2,
    max_competitors: 1,
    features: {
      reports: ["weekly"],
      chatbot: false,
      alerts: ["email"],
      history_days: 30,
      custom_searches: 5,
    },
  },
  growth: {
    max_keywords: 5,
    max_competitors: 3,
    features: {
      reports: ["weekly", "monthly"],
      chatbot: true,
      alerts: ["email", "slack"],
      history_days: 90,
      custom_searches: 20,
    },
  },
  pro: {
    max_keywords: 8,
    max_competitors: 5,
    features: {
      reports: ["daily", "weekly", "monthly", "quarterly", "annually"],
      chatbot: true,
      alerts: ["email", "slack", "whatsapp", "sms"],
      history_days: 365,
      custom_searches: 50,
    },
  },
};

export const sentimentChartConfig = {
  positive: { label: "Positive", color: "#10B981" },
  negative: { label: "Negative", color: "#EF4444" },
  neutral: { label: "Neutral", color: "#64748B" },
  mixed: { label: "Mixed", color: "#F59E0B" },
} satisfies ChartConfig;

export const sovChartColors = [
  "#0093DD",
  "#004163",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
];

export const platformColors: Record<string, string> = {
  google_news: "#0093DD",
  reddit: "#FF4500",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  quora: "#B92B27",
  instagram: "#E4405F",
  web: "#64748B",
  facebook: "#1877F2",
};
