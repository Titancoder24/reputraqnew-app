"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  change?: number;
  changeLabel?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-brand-sky",
  iconBg = "bg-brand-sky/10",
  change,
  changeLabel,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 animate-slide-up">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-brand-charcoal">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                {isNegative && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                <span
                  className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change}% {changeLabel || ""}
                </span>
              </div>
            )}
          </div>
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
