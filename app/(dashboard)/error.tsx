"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="p-4 lg:p-6">
      <Card className="border border-red-200 rounded-xl shadow-sm max-w-lg mx-auto mt-12">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-brand-charcoal mb-2">
            Failed to load this page
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            There was an error loading the dashboard. This could be a temporary issue.
          </p>
          <Button onClick={reset} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
