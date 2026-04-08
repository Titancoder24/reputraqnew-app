"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Building2, Users, UserPlus, Search, Plus, X, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

const steps = ["Brand Setup", "Key Spokespersons", "Add Competitors", "Configure Keywords"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Brand
  const [brandName, setBrandName] = useState("");
  const [parentCompany, setParentCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("IN");
  const [language, setLanguage] = useState("en");

  // Step 2: Spokespersons
  const [spokespersons, setSpokespersons] = useState<{ name: string; designation: string }[]>([]);
  const [spName, setSpName] = useState("");
  const [spDesignation, setSpDesignation] = useState("");

  // Step 3: Competitors
  const [competitors, setCompetitors] = useState<{ name: string; type: string }[]>([]);
  const [compName, setCompName] = useState("");

  // Step 4: Keywords
  const [keywords, setKeywords] = useState<{ keyword: string; type: string; entity_name: string; entity_type: string }[]>([]);
  const [kwText, setKwText] = useState("");
  const [kwType, setKwType] = useState("brand");

  const [orgId, setOrgId] = useState<string | null>(null);

  const industries = [
    "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
    "Education", "Media", "Real Estate", "Automotive", "FMCG",
    "Telecom", "Energy", "Travel", "Food & Beverage", "Other",
  ];

  const handleStep1 = async () => {
    if (!brandName.trim()) { toast.error("Brand name is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          parent_company: parentCompany,
          industry_category: industry,
          regions: [region],
          languages: [language],
        }),
      });
      if (!res.ok) throw new Error("Failed to create organization");
      const data = await res.json();
      setOrgId(data.id);

      // Auto-add brand name as keyword
      setKeywords([{ keyword: brandName, type: "brand", entity_name: brandName, entity_type: "brand" }]);
      if (parentCompany) {
        setKeywords(prev => [...prev, { keyword: parentCompany, type: "brand", entity_name: brandName, entity_type: "brand" }]);
      }

      setStep(1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addSpokesperson = () => {
    if (!spName.trim()) return;
    setSpokespersons(prev => [...prev, { name: spName, designation: spDesignation }]);
    setSpName("");
    setSpDesignation("");
  };

  const handleStep2 = async () => {
    setLoading(true);
    try {
      for (const sp of spokespersons) {
        await fetch("/api/spokespersons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sp),
        });
      }
      // Auto-add spokesperson names as keywords
      setKeywords(prev => [
        ...prev,
        ...spokespersons.map(sp => ({
          keyword: sp.name,
          type: "spokesperson",
          entity_name: sp.name,
          entity_type: "spokesperson",
        })),
      ]);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = () => {
    if (!compName.trim()) return;
    setCompetitors(prev => [...prev, { name: compName, type: "direct" }]);
    // Also add competitor as keyword
    setKeywords(prev => [...prev, { keyword: compName, type: "competitor", entity_name: compName, entity_type: "competitor" }]);
    setCompName("");
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      for (const comp of competitors) {
        await fetch("/api/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(comp),
        });
      }
      setStep(3);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (!kwText.trim()) return;
    setKeywords(prev => [...prev, {
      keyword: kwText,
      type: kwType,
      entity_name: brandName,
      entity_type: "brand",
    }]);
    setKwText("");
  };

  const handleStep4 = async () => {
    setLoading(true);
    try {
      if (keywords.length > 0) {
        await fetch("/api/keywords/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords }),
        });
      }
      toast.success("Onboarding complete! Waiting for admin approval.");
      router.push("/pending-approval");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-brand-sky flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal">Reputraq</h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-brand-sky text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? "text-brand-charcoal font-medium" : "text-gray-400"}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-brand-charcoal">{steps[step]}</h2>
          </CardHeader>
          <CardContent>
            {/* Step 1: Brand Setup */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label>Brand Name *</Label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" className="mt-1" />
                </div>
                <div>
                  <Label>Parent Company</Label>
                  <Input value={parentCompany} onChange={e => setParentCompany(e.target.value)} placeholder="Optional" className="mt-1" />
                </div>
                <div>
                  <Label>Industry</Label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select industry...</option>
                    {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Region</Label>
                    <select value={region} onChange={e => setRegion(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="IN">India</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <Label>Language</Label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleStep1} disabled={loading} className="w-full bg-brand-sky hover:bg-brand-sky/90 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2: Spokespersons */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Add key spokespersons for your brand. Their names will be auto-tracked as keywords.</p>
                <div className="flex gap-2">
                  <Input value={spName} onChange={e => setSpName(e.target.value)} placeholder="Name" className="flex-1" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSpokesperson())} />
                  <Input value={spDesignation} onChange={e => setSpDesignation(e.target.value)} placeholder="Designation" className="flex-1" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSpokesperson())} />
                  <Button type="button" variant="outline" onClick={addSpokesperson}><Plus className="w-4 h-4" /></Button>
                </div>
                {spokespersons.length > 0 && (
                  <div className="space-y-2">
                    {spokespersons.map((sp, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{sp.name}</span>
                          {sp.designation && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600">{sp.designation}</span>}
                        </div>
                        <button onClick={() => setSpokespersons(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Skip</Button>
                  <Button onClick={handleStep2} disabled={loading} className="flex-1 bg-brand-sky hover:bg-brand-sky/90 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Competitors */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Add your main competitors for comparison tracking.</p>
                <div className="flex gap-2">
                  <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Competitor name" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCompetitor())} />
                  <Button type="button" variant="outline" onClick={addCompetitor}><Plus className="w-4 h-4" /></Button>
                </div>
                {competitors.length > 0 && (
                  <div className="space-y-2">
                    {competitors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{c.name}</span>
                        </div>
                        <button onClick={() => setCompetitors(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Skip</Button>
                  <Button onClick={handleStep3} disabled={loading} className="flex-1 bg-brand-sky hover:bg-brand-sky/90 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Keywords */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Add keywords to monitor. We&apos;ve auto-added your brand name.</p>
                <div className="flex gap-2">
                  <Input value={kwText} onChange={e => setKwText(e.target.value)} placeholder="Add keyword" className="flex-1" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                  <select value={kwType} onChange={e => setKwType(e.target.value)} className="w-32 h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="brand">Brand</option>
                    <option value="product">Product</option>
                    <option value="spokesperson">Spokesperson</option>
                    <option value="hashtag">Hashtag</option>
                    <option value="campaign">Campaign</option>
                  </select>
                  <Button type="button" variant="outline" onClick={addKeyword}><Plus className="w-4 h-4" /></Button>
                </div>
                {keywords.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {keywords.map((kw, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{kw.keyword}</span>
                          <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600">{kw.type}</span>
                        </div>
                        <button onClick={() => setKeywords(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleStep4} disabled={loading} className="w-full bg-brand-sky hover:bg-brand-sky/90 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Complete Setup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          By Orion Digital &middot; Your Reputation Matters
        </p>
      </div>
    </div>
  );
}
