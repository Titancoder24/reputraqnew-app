"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Clock, Loader2 } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data.subscription?.status === "active") {
          router.push("/");
          router.refresh();
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    };

    checkApproval();
    const interval = setInterval(checkApproval, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0 text-center">
        <CardContent className="pt-10 pb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-brand-charcoal mb-2">Account Under Review</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Your account is being reviewed by our team. You&apos;ll be automatically redirected once approved. This usually takes less than 24 hours.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            Checking status...
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Reputraq by Orion Digital</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
