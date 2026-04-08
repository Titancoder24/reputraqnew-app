"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  GitCompare,
  Search,
  MessageCircle,
  Hash,
  TrendingUp,
  Bot,
  Bell,
  FileText,
  ShieldAlert,
  Settings,
  Shield,
  LogOut,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/media", label: "Media Monitoring", icon: Newspaper },
  { href: "/competitors", label: "Competitors", icon: Building2 },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/keywords", label: "Keywords", icon: Search },
  { href: "/social", label: "Social Listening", icon: MessageCircle },
  { href: "/hashtags", label: "Hashtags", icon: Hash },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/chatbot", label: "AI Chatbot", icon: Bot },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/crisis", label: "Crisis Center", icon: ShieldAlert },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAppStore();
  const router = useRouter();

  const isAdmin = user?.role === "super_admin";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-[260px] min-h-screen fixed left-0 top-0 z-40"
      style={{ background: "linear-gradient(180deg, #0093DD 0%, #004163 100%)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Reputraq</h1>
          <p className="text-white/60 text-[10px] tracking-wider uppercase">Your Reputation Matters</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-white border-l-[3px] border-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "opacity-100" : "opacity-70")} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-white/15" />

        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-white border-l-[3px] border-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "opacity-100" : "opacity-70")} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              pathname === "/admin"
                ? "bg-white/15 text-white border-l-[3px] border-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Shield className={cn("w-5 h-5", pathname === "/admin" ? "opacity-100" : "opacity-70")} />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name || "User"}</p>
            <p className="text-white/50 text-xs truncate">{user?.role?.replace("_", " ") || "Brand Manager"}</p>
          </div>
          <button onClick={handleLogout} className="text-white/50 hover:text-white transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
