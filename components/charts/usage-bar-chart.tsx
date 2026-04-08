"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  used: { label: "API Calls Used", color: "#0093DD" },
  limit: { label: "Monthly Limit", color: "#E2E8F0" },
} satisfies ChartConfig;

export function UsageBarChart({ data }: { data: { label: string; used: number; limit: number }[] }) {
  if (!data?.length) return null;

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="limit" fill="var(--color-limit)" radius={4} />
        <Bar dataKey="used" fill="var(--color-used)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
