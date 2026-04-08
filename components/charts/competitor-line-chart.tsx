"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

export function CompetitorLineChart({
  data,
  brandName,
  competitorName,
}: {
  data: any[];
  brandName: string;
  competitorName: string;
}) {
  if (!data?.length) return null;

  const config = {
    brand: { label: brandName, color: "#0093DD" },
    competitor: { label: competitorName, color: "#004163" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="brand"
          stroke="var(--color-brand)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="competitor"
          stroke="var(--color-competitor)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
