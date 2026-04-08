"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Users, Bell, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { org, setOrg } = useAppStore();
  const orgAny = org as any;
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState(orgAny?.brand_name || "");
  const [parentCompany, setParentCompany] = useState(orgAny?.parent_company || "");
  const [industry, setIndustry] = useState(orgAny?.industry_category || "");
  const [regions, setRegions] = useState(
    Array.isArray(orgAny?.regions) ? orgAny.regions.join(", ") : orgAny?.regions || ""
  );
  const [languages, setLanguages] = useState(
    Array.isArray(orgAny?.languages) ? orgAny.languages.join(", ") : orgAny?.languages || ""
  );

  const saveOrg = async () => {
    if (!org?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          parent_company: parentCompany || null,
          industry_category: industry || null,
          regions: regions ? regions.split(",").map((r: string) => r.trim()).filter(Boolean) : [],
          languages: languages ? languages.split(",").map((l: string) => l.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setOrg({ ...org, brand_name: brandName, industry_category: industry } as any);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="general">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="w-4 h-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Organization Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Brand Name</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your brand name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Parent Company</Label>
                <Input
                  value={parentCompany}
                  onChange={(e) => setParentCompany(e.target.value)}
                  placeholder="Parent company (optional)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Industry Category</Label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select...</option>
                  {[
                    "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
                    "Education", "Media", "Real Estate", "Automotive", "FMCG",
                    "Telecom", "Energy", "Travel", "Food & Beverage", "Other",
                  ].map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Regions</Label>
                <Input
                  value={regions}
                  onChange={(e) => setRegions(e.target.value)}
                  placeholder="Comma-separated, e.g. US, UK, India"
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Separate multiple regions with commas</p>
              </div>
              <div>
                <Label>Languages</Label>
                <Input
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Comma-separated, e.g. English, Hindi"
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Separate multiple languages with commas</p>
              </div>
              <Button
                onClick={saveOrg}
                disabled={saving || !brandName.trim()}
                className="bg-brand-sky hover:bg-brand-sky/90 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Team management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="py-16 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Notification preferences coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
