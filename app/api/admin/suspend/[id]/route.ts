import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  POST /api/admin/suspend/[id] - Suspend an organization             */
/* ------------------------------------------------------------------ */

export async function POST(
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

    const admin = createAdminClient();

    // Update subscription status to suspended
    const { error: subError } = await admin
      .from("subscriptions")
      .update({ status: "suspended" })
      .eq("org_id", orgId);

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Disable monitoring
    const { error: orgError } = await admin
      .from("organizations")
      .update({ monitoring_active: false })
      .eq("id", orgId);

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
