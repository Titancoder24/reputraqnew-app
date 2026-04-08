import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  GET /api/scans/[id] — Scan Details                                 */
/* ------------------------------------------------------------------ */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Get scan by id, ensuring it belongs to the user's org
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: "Scan not found" },
        { status: 404 }
      );
    }

    // Get result counts for this scan
    const { count: totalResults } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("scan_id", id);

    // Get sentiment breakdown
    const { data: sentimentCounts } = await supabase
      .from("search_results")
      .select("sentiment")
      .eq("scan_id", id);

    const sentimentBreakdown: Record<string, number> = {};
    if (sentimentCounts) {
      for (const row of sentimentCounts) {
        const s = row.sentiment || "Neutral";
        sentimentBreakdown[s] = (sentimentBreakdown[s] || 0) + 1;
      }
    }

    return NextResponse.json(
      {
        scan,
        result_counts: {
          total: totalResults || 0,
          by_sentiment: sentimentBreakdown,
        },
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
