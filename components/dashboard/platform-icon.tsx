"use client";

import { Globe, Newspaper, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const platformConfig: Record<string, { color: string; label: string }> = {
  reddit: { color: "#FF4500", label: "Reddit" },
  twitter: { color: "#1DA1F2", label: "Twitter/X" },
  youtube: { color: "#FF0000", label: "YouTube" },
  linkedin: { color: "#0A66C2", label: "LinkedIn" },
  quora: { color: "#B92B27", label: "Quora" },
  instagram: { color: "#E4405F", label: "Instagram" },
  facebook: { color: "#1877F2", label: "Facebook" },
  google_news: { color: "#0093DD", label: "Google News" },
  web: { color: "#64748B", label: "Web" },
};

export function PlatformIcon({ platform, size = "sm" }: { platform: string; size?: "sm" | "md" }) {
  const config = platformConfig[platform] || platformConfig.web;
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <div
      className={cn("rounded-full flex items-center justify-center text-white font-bold shrink-0", sizeClass)}
      style={{ backgroundColor: config.color }}
      title={config.label}
    >
      {platform === "web" ? (
        <Globe className="w-3 h-3" />
      ) : platform === "google_news" ? (
        <Newspaper className="w-3 h-3" />
      ) : (
        platform[0].toUpperCase()
      )}
    </div>
  );
}

export function getPlatformLabel(platform: string): string {
  return platformConfig[platform]?.label || platform;
}
