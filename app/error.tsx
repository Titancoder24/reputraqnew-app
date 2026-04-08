"use client";

import { useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Activity className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-brand-charcoal mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        <Button onClick={reset} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
