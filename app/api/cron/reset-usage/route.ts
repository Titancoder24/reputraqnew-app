import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/cron/reset-usage - Reset monthly SerpAPI usage counter    */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (
      !cronSecret ||
      (authHeader !== `Bearer ${cronSecret}` &&
        request.nextUrl.searchParams.get("secret") !== cronSecret)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Reset the usage counter
    const { error: usageError } = await admin
      .from("admin_settings")
      .upsert(
        { key: "serpapi_used_this_month", value: "0" },
        { onConflict: "key" }
      );

    if (usageError) {
      return NextResponse.json(
        { error: usageError.message },
        { status: 500 }
      );
    }

    // Update last reset timestamp
    const { error: resetError } = await admin
      .from("admin_settings")
      .upsert(
        { key: "serpapi_last_reset", value: now },
        { onConflict: "key" }
      );

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, reset_at: now },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
