"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { sentimentChartConfig } from "@/lib/constants";

const colors: Record<string, string> = {
  Positive: "#10B981",
  Negative: "#EF4444",
  Neutral: "#64748B",
  Mixed: "#F59E0B",
};

export function SentimentPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data?.length) return null;

  return (
    <ChartContainer config={sentimentChartConfig} className="min-h-[200px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={colors[d.name] || "#64748B"} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
