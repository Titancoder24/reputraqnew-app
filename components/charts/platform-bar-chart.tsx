"use client";

import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { platformColors } from "@/lib/constants";

export function PlatformBarChart({ data }: { data: { platform: string; count: number }[] }) {
  if (!data?.length) return null;

  const config = Object.fromEntries(
    data.map((d) => [
      d.platform,
      { label: d.platform, color: platformColors[d.platform] || "#64748B" },
    ])
  );

  return (
    <ChartContainer config={config} className="min-h-[250px] w-full">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 80 }}>
        <YAxis dataKey="platform" type="category" tickLine={false} axisLine={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={4}>
          {data.map((entry, i) => (
            <Cell key={i} fill={platformColors[entry.platform] || "#64748B"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
