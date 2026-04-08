"use client";

import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const radius = size === "lg" ? 50 : size === "md" ? 40 : 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return "#10B981";
    if (s >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const svgSize = (radius + 8) * 2;
  const center = radius + 8;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={svgSize} height={svgSize} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={size === "sm" ? 6 : 8}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={size === "sm" ? 6 : 8}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ transform: "translateY(0)" }}>
        <span className={cn("font-bold text-brand-charcoal", size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg")}>
          {score}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
    </div>
  );
}
