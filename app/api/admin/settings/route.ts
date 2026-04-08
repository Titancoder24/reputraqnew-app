import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/settings - Get all admin settings                   */
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
    const { data: rows, error } = await admin
      .from("admin_settings")
      .select("key, value");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    for (const row of rows || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/admin/settings - Update settings                          */
/* ------------------------------------------------------------------ */

export async function PUT(request: NextRequest) {
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
    const admin = createAdminClient();

    // Support single { key, value } or bulk { settings: [{ key, value }] }
    const entries: { key: string; value: string }[] = [];

    if (body.settings && Array.isArray(body.settings)) {
      entries.push(...body.settings);
    } else if (body.key && body.value !== undefined) {
      entries.push({ key: body.key, value: body.value });
    } else {
      return NextResponse.json(
        { error: "Provide { key, value } or { settings: [{ key, value }] }" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("admin_settings")
      .upsert(
        entries.map((e) => ({ key: e.key, value: String(e.value) })),
        { onConflict: "key" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: entries.length }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
