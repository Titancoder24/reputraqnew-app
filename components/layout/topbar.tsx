"use client";

import { Bell, RefreshCw, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "./date-range-picker";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const { isScanning, setScanning, org } = useAppStore();
  const [alertCount] = useState(0);

  const handleRunScan = async () => {
    if (isScanning) return;
    setScanning(true);
    try {
      const res = await fetch("/api/scans/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_type: "manual" }),
      });
      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();
      toast.success(`Scan complete! Found ${data.total_new_results || 0} new results.`);
    } catch {
      toast.error("Failed to run scan. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-brand-charcoal">{title}</h1>
      </div>

      {/* Center: Date Range */}
      <div className="hidden md:flex items-center">
        <DateRangePicker />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRunScan}
          disabled={isScanning}
          size="sm"
          className="bg-brand-sky hover:bg-brand-sky/90 text-white hidden sm:flex"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning..." : "Run Scan"}
        </Button>
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
          <Bell className="w-5 h-5 text-gray-500" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-sky/10 flex items-center justify-center text-brand-sky font-semibold text-sm lg:hidden">
          {org?.brand_name?.[0] || "R"}
        </div>
      </div>
    </header>
  );
}
