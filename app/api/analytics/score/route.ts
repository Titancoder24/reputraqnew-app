import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateBrandScore } from "@/lib/scoring";

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

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo query params are required" },
        { status: 400 }
      );
    }

    // Look up the primary brand keyword for this org
    const { data: brandKeyword } = await supabase
      .from("keywords")
      .select("entity_name, entity_type")
      .eq("org_id", profile.org_id)
      .eq("entity_type", "brand")
      .limit(1)
      .single();

    const entityName = brandKeyword?.entity_name || "";
    const entityType = brandKeyword?.entity_type || "brand";

    const score = await calculateBrandScore(
      supabase,
      profile.org_id,
      entityName,
      entityType,
      dateFrom,
      dateTo
    );

    return NextResponse.json(score, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
