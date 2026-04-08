"use client";

import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-sky/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-brand-sky" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-brand-charcoal mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-sm text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-brand-sky hover:bg-brand-sky/90 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
