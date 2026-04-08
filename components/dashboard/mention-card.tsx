"use client";

import { ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SentimentBadge } from "./sentiment-badge";
import { PlatformIcon } from "./platform-icon";
import { truncate, formatDate } from "@/lib/utils";

interface MentionCardProps {
  result: {
    id: string;
    title: string;
    link: string;
    snippet?: string;
    source_name?: string;
    published_date?: string;
    platform: string;
    source_type: string;
    sentiment: string;
    sentiment_score?: number;
    themes?: string[];
    risk_flag?: boolean;
    reach_estimate?: string;
    entity_name?: string;
    entity_type?: string;
    collected_at?: string;
  };
}

export function MentionCard({ result }: MentionCardProps) {
  return (
    <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Platform icon */}
          <PlatformIcon platform={result.platform} size="md" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand-charcoal hover:text-brand-sky transition line-clamp-2 flex items-start gap-1"
            >
              {result.title}
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
            </a>

            {/* Snippet */}
            {result.snippet && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {truncate(result.snippet, 200)}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {result.source_name && (
                <span className="text-xs text-gray-400">{result.source_name}</span>
              )}
              {result.published_date && (
                <span className="text-xs text-gray-400">
                  {result.published_date}
                </span>
              )}
              {result.reach_estimate === "high" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand-sky text-brand-sky">
                  Tier 1
                </Badge>
              )}
              {result.risk_flag && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Risk
                </Badge>
              )}
              {result.entity_type === "competitor" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {result.entity_name}
                </Badge>
              )}
            </div>

            {/* Themes */}
            {result.themes && result.themes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.themes.slice(0, 3).map((theme) => (
                  <span
                    key={theme}
                    className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {theme.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sentiment */}
          <div className="shrink-0">
            <SentimentBadge sentiment={result.sentiment} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
