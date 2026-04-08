import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  GET /api/cron/scan - Scheduled scan trigger (every 6 hours)        */
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

    // Get all active orgs with active subscriptions
    const { data: orgs, error: orgsError } = await admin
      .from("organizations")
      .select("id, last_scan_at, scan_frequency_hours, subscriptions!inner(status)")
      .eq("monitoring_active", true)
      .eq("subscriptions.status", "active");

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { triggered: true, message: "No active organizations to scan" },
        { status: 200 }
      );
    }

    // Filter orgs that are due for scanning
    const now = Date.now();
    const dueOrgs = orgs.filter((org: any) => {
      const frequencyHours = org.scan_frequency_hours || 24;
      const frequencyMs = frequencyHours * 60 * 60 * 1000;

      if (!org.last_scan_at) return true; // Never scanned
      const lastScan = new Date(org.last_scan_at).getTime();
      return now - lastScan >= frequencyMs;
    });

    if (dueOrgs.length === 0) {
      return NextResponse.json(
        { triggered: true, message: "No organizations due for scanning" },
        { status: 200 }
      );
    }

    // Trigger scan via internal API
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/scans/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ scan_type: "scheduled" }),
    });

    const result = await response.json();

    return NextResponse.json(
      {
        triggered: true,
        due_orgs: dueOrgs.length,
        scan_result: result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Cron scan error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
