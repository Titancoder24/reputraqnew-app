import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CONFIG } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  POST /api/admin/approve - Approve an organization                  */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { org_id, plan } = body as {
      org_id: string;
      plan: "starter" | "growth" | "pro";
    };

    if (!org_id || !plan) {
      return NextResponse.json(
        { error: "org_id and plan are required" },
        { status: 400 }
      );
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return NextResponse.json(
        { error: "Invalid plan. Must be starter, growth, or pro" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Update subscription
    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        plan,
        max_keywords: planConfig.max_keywords,
        max_competitors: planConfig.max_competitors,
        features: planConfig.features,
        approved_by: user.id,
        approved_at: now,
        started_at: now,
        expires_at: expiresAt,
      })
      .eq("org_id", org_id)
      .eq("status", "pending_approval")
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Update organization: monitoring_active = true
    const { error: orgError } = await admin
      .from("organizations")
      .update({ monitoring_active: true })
      .eq("id", org_id);

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, subscription },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
