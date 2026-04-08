import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CONFIG } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/change-plan/[id] - Change org's plan                */
/* ------------------------------------------------------------------ */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;

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
    const { plan } = body as { plan: "starter" | "growth" | "pro" };

    if (!plan) {
      return NextResponse.json(
        { error: "plan is required" },
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

    const { data: subscription, error } = await admin
      .from("subscriptions")
      .update({
        plan,
        max_keywords: planConfig.max_keywords,
        max_competitors: planConfig.max_competitors,
        features: planConfig.features,
      })
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
