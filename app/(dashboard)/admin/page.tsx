"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Check,
  X,
  Users,
  Key,
  BarChart3,
  Loader2,
  Ban,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function AdminPage() {
  const { user } = useAppStore();
  const router = useRouter();
  const [tab, setTab] = useState("pending");

  // Pending approvals
  const [pending, setPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // API Settings
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Usage
  const [usage, setUsage] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role !== "super_admin") {
      router.push("/");
      return;
    }
    fetchPending();
  }, [user, router]);

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/admin/pending");
      if (res.ok) setPending(await res.json());
    } catch {} finally { setPendingLoading(false); }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      if (res.ok) setCustomers(await res.json());
    } catch {} finally { setCustomersLoading(false); }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch {} finally { setSettingsLoading(false); }
  };

  const fetchUsage = async () => {
    setUsageLoading(true);
    try {
      const res = await fetch("/api/admin/usage");
      if (res.ok) setUsage(await res.json());
    } catch {} finally { setUsageLoading(false); }
  };

  const handleTabChange = (t: string) => {
    setTab(t);
    if (t === "customers" && customers.length === 0) fetchCustomers();
    if (t === "keys" && !settings.serpapi_key) fetchSettings();
    if (t === "usage" && !usage) fetchUsage();
  };

  const handleApprove = async (orgId: string) => {
    const plan = selectedPlan[orgId] || "starter";
    setApprovingId(orgId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, plan }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Organization approved!");
      setPending(prev => prev.filter(p => p.org_id !== orgId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (orgId: string) => {
    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, reason: "Application rejected by admin" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Organization rejected");
      setPending(prev => prev.filter(p => p.org_id !== orgId));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSuspend = async (orgId: string) => {
    try {
      const res = await fetch(`/api/admin/suspend/${orgId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to suspend");
      toast.success("Organization suspended");
      fetchCustomers();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReactivate = async (orgId: string) => {
    try {
      const res = await fetch(`/api/admin/reactivate/${orgId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reactivate");
      toast.success("Organization reactivated");
      fetchCustomers();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: entries }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (user?.role !== "super_admin") return null;

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="pending" className="gap-1.5">
            <Shield className="w-4 h-4" /> Pending Approvals
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="w-4 h-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5">
            <Key className="w-4 h-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Usage
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals */}
        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : pending.length === 0 ? (
            <EmptyState icon={Check} title="No pending approvals" description="All caught up!" />
          ) : (
            <div className="space-y-3">
              {pending.map((item: any) => (
                <Card key={item.org_id} className="border border-gray-200 rounded-xl shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-brand-charcoal">{item.brand_name}</h3>
                        <p className="text-sm text-gray-500">{item.email} &middot; {item.full_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Industry: {item.industry_category || "N/A"} &middot; Keywords: {item.keywords_count || 0} &middot; Competitors: {item.competitors_count || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedPlan[item.org_id] || "starter"}
                          onChange={(e) => setSelectedPlan(prev => ({ ...prev, [item.org_id]: e.target.value }))}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="starter">Starter</option>
                          <option value="growth">Growth</option>
                          <option value="pro">Pro</option>
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.org_id)}
                          disabled={approvingId === item.org_id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {approvingId === item.org_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(item.org_id)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <X className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers" className="mt-4">
          {customersLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : customers.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" />
          ) : (
            <Card className="border border-gray-200 rounded-xl shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Last Scan</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.brand_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{c.plan || "None"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "destructive"}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{c.industry_category || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.last_scan_at ? new Date(c.last_scan_at).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.status === "active" ? (
                              <Button size="sm" variant="outline" onClick={() => handleSuspend(c.id)} className="text-xs">
                                <Ban className="w-3 h-3 mr-1" /> Suspend
                              </Button>
                            ) : c.status === "suspended" ? (
                              <Button size="sm" variant="outline" onClick={() => handleReactivate(c.id)} className="text-xs">
                                <RefreshCw className="w-3 h-3 mr-1" /> Reactivate
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="keys" className="mt-4">
          {settingsLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <Card className="border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>SerpAPI Key</Label>
                  <Input
                    value={settings.serpapi_key || ""}
                    onChange={(e) => setSettings({ ...settings, serpapi_key: e.target.value })}
                    className="mt-1 font-mono text-sm"
                    type="password"
                  />
                </div>
                <div>
                  <Label>Gemini API Key</Label>
                  <Input
                    value={settings.gemini_key || ""}
                    onChange={(e) => setSettings({ ...settings, gemini_key: e.target.value })}
                    className="mt-1 font-mono text-sm"
                    type="password"
                  />
                </div>
                <div>
                  <Label>Gemini Model</Label>
                  <select
                    value={settings.gemini_model || "gemini-2.5-flash"}
                    onChange={(e) => setSettings({ ...settings, gemini_model: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SerpAPI Monthly Limit</Label>
                    <Input
                      value={settings.serpapi_monthly_limit || "5000"}
                      onChange={(e) => setSettings({ ...settings, serpapi_monthly_limit: e.target.value })}
                      className="mt-1"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>SerpAPI Plan</Label>
                    <select
                      value={settings.serpapi_plan || "developer"}
                      onChange={(e) => setSettings({ ...settings, serpapi_plan: e.target.value })}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="developer">Developer</option>
                      <option value="business">Business</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <Button onClick={saveSettings} disabled={savingSettings} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage */}
        <TabsContent value="usage" className="mt-4">
          {usageLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : usage ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">SerpAPI Calls This Month</p>
                  <p className="text-3xl font-bold text-brand-charcoal mt-1">{usage.serpapi_used || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">of {usage.serpapi_limit || 5000} limit</p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-brand-sky h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(((usage.serpapi_used || 0) / (usage.serpapi_limit || 5000)) * 100, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Total Scans This Month</p>
                  <p className="text-3xl font-bold text-brand-charcoal mt-1">{usage.total_scans || 0}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Total Results Collected</p>
                  <p className="text-3xl font-bold text-brand-charcoal mt-1">{usage.total_results || 0}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="No usage data" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
