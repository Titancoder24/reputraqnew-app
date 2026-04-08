"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/media": "Media Monitoring",
  "/competitors": "Competitors",
  "/compare": "Compare",
  "/keywords": "Keywords",
  "/social": "Social Listening",
  "/hashtags": "Hashtags",
  "/trending": "Trending",
  "/chatbot": "AI Chatbot",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/crisis": "Crisis Center",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setOrg, setSubscription } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();

        if (!data.profile?.org_id) {
          router.push("/onboarding");
          return;
        }

        if (data.subscription?.status !== "active" && data.profile?.role !== "super_admin") {
          router.push("/pending-approval");
          return;
        }

        setUser(data.profile);
        setOrg(data.org);
        setSubscription(data.subscription);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [router, setUser, setOrg, setSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const title = pageTitles[pathname] || "Dashboard";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px] border-0">
          <div onClick={() => setMobileOpen(false)}>
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
