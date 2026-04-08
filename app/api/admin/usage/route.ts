import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/usage - Get SerpAPI usage stats                     */
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

    // Get SerpAPI usage settings
    const { data: settingsRows } = await admin
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "serpapi_used_this_month",
        "serpapi_monthly_limit",
        "serpapi_last_reset",
      ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows || []) {
      settings[row.key] = row.value;
    }

    // Get scan counts this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: scansThisMonth } = await admin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .gte("started_at", startOfMonth.toISOString());

    // Get total results this month
    const { count: resultsThisMonth } = await admin
      .from("search_results")
      .select("id", { count: "exact", head: true })
      .gte("collected_at", startOfMonth.toISOString());

    return NextResponse.json(
      {
        serpapi: {
          used_this_month: parseInt(
            settings.serpapi_used_this_month || "0",
            10
          ),
          monthly_limit: parseInt(
            settings.serpapi_monthly_limit || "10000",
            10
          ),
          last_reset: settings.serpapi_last_reset || null,
        },
        scans_this_month: scansThisMonth || 0,
        results_this_month: resultsThisMonth || 0,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
