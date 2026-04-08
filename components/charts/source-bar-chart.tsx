"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "Mentions", color: "#0093DD" },
} satisfies ChartConfig;

export function SourceBarChart({ data }: { data: { source: string; count: number }[] }) {
  if (!data?.length) return null;

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 100 }}>
        <YAxis
          dataKey="source"
          type="category"
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
