import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/customers - List all organizations with sub info    */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "super_admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();

    const { data: organizations, error: orgError } = await admin
      .from("organizations")
      .select("id, brand_name, industry_category, monitoring_active, last_scan_at, created_at, subscriptions(id, plan, status, started_at, expires_at)")
      .order("created_at", { ascending: false });

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Enrich with keywords count for each org
    const enriched = await Promise.all(
      (organizations || []).map(async (org: any) => {
        const { count: keywordsCount } = await admin
          .from("keywords")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id);

        const sub = Array.isArray(org.subscriptions)
          ? org.subscriptions[0]
          : org.subscriptions;

        return {
          id: org.id,
          brand_name: org.brand_name,
          industry_category: org.industry_category,
          monitoring_active: org.monitoring_active,
          last_scan_at: org.last_scan_at,
          created_at: org.created_at,
          plan: sub?.plan || null,
          status: sub?.status || null,
          subscription_started_at: sub?.started_at || null,
          subscription_expires_at: sub?.expires_at || null,
          keywords_count: keywordsCount || 0,
        };
      })
    );

    return NextResponse.json({ customers: enriched }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
