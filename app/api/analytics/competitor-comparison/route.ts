import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    let competitorName = searchParams.get("competitor_name");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo query params are required" },
        { status: 400 }
      );
    }

    // If no competitor specified, find the first competitor keyword for the org
    if (!competitorName) {
      const { data: competitorKeyword } = await supabase
        .from("keywords")
        .select("entity_name")
        .eq("org_id", profile.org_id)
        .eq("entity_type", "competitor")
        .limit(1)
        .single();

      competitorName = competitorKeyword?.entity_name || null;
    }

    const { data, error } = await supabase
      .from("search_results")
      .select("collected_at, entity_type, entity_name")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dayMap: Record<string, { brand: number; competitor: number }> = {};

    (data || []).forEach((r) => {
      const day = new Date(r.collected_at).toISOString().split("T")[0];
      if (!dayMap[day]) {
        dayMap[day] = { brand: 0, competitor: 0 };
      }

      if (r.entity_type === "brand") {
        dayMap[day].brand++;
      } else if (
        r.entity_type === "competitor" &&
        competitorName &&
        r.entity_name?.toLowerCase() === competitorName.toLowerCase()
      ) {
        dayMap[day].competitor++;
      }
    });

    const comparison = Object.keys(dayMap)
      .sort()
      .map((day) => ({
        date: format(new Date(day), "MMM d"),
        brand: dayMap[day].brand,
        competitor: dayMap[day].competitor,
      }));

    return NextResponse.json(comparison, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
