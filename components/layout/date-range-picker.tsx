"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const presets = [
  { label: "Today", value: "today" },
  { label: "7D", value: "7d" },
  { label: "14D", value: "14d" },
  { label: "30D", value: "30d" },
];

export function DateRangePicker() {
  const { dateRange, setPreset } = useAppStore();

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => setPreset(preset.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            dateRange.label === preset.value
              ? "bg-brand-sky text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
