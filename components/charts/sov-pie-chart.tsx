"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { sovChartColors } from "@/lib/constants";

export function SovPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data?.length) return null;

  const config = Object.fromEntries(
    data.map((d, i) => [
      d.name,
      { label: d.name, color: sovChartColors[i % sovChartColors.length] },
    ])
  );

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={sovChartColors[i % sovChartColors.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}
