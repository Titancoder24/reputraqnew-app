import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/pending - Get all pending approvals                 */
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

    // Get subscriptions with pending_approval status, joined with org data
    const { data: pendingSubs, error: subError } = await admin
      .from("subscriptions")
      .select("*, organizations(id, brand_name, industry_category, created_at, created_by)")
      .eq("status", "pending_approval");

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Enrich each pending item with creator profile, keywords count, competitors count
    const enriched = await Promise.all(
      (pendingSubs || []).map(async (sub: any) => {
        const org = sub.organizations;
        if (!org) return null;

        // Get creator profile
        const { data: creator } = await admin
          .from("profiles")
          .select("email, full_name")
          .eq("id", org.created_by)
          .single();

        // Get keywords count
        const { count: keywordsCount } = await admin
          .from("keywords")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id);

        // Get competitors count
        const { count: competitorsCount } = await admin
          .from("competitors")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id);

        return {
          subscription_id: sub.id,
          org_id: org.id,
          brand_name: org.brand_name,
          industry_category: org.industry_category,
          created_at: org.created_at,
          creator_email: creator?.email || null,
          creator_name: creator?.full_name || null,
          keywords_count: keywordsCount || 0,
          competitors_count: competitorsCount || 0,
        };
      })
    );

    return NextResponse.json(
      { pending: enriched.filter(Boolean) },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
