"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  positive: { label: "Positive", color: "#10B981" },
  negative: { label: "Negative", color: "#EF4444" },
  neutral: { label: "Neutral", color: "#64748B" },
} satisfies ChartConfig;

export function MentionTrendChart({ data }: { data: any[] }) {
  if (!data?.length) return null;

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
      <AreaChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="positive"
          stackId="a"
          fill="var(--color-positive)"
          fillOpacity={0.4}
          stroke="var(--color-positive)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="neutral"
          stackId="a"
          fill="var(--color-neutral)"
          fillOpacity={0.2}
          stroke="var(--color-neutral)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="negative"
          stackId="a"
          fill="var(--color-negative)"
          fillOpacity={0.4}
          stroke="var(--color-negative)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
