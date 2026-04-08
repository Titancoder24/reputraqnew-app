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

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo query params are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("search_results")
      .select("collected_at, sentiment")
      .eq("org_id", profile.org_id)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dayMap: Record<
      string,
      { positive: number; negative: number; neutral: number; mixed: number }
    > = {};

    (data || []).forEach((r) => {
      const day = new Date(r.collected_at).toISOString().split("T")[0];
      if (!dayMap[day]) {
        dayMap[day] = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
      }
      const key = r.sentiment?.toLowerCase() as keyof (typeof dayMap)[string];
      if (key && dayMap[day][key] !== undefined) {
        dayMap[day][key]++;
      }
    });

    const trend = Object.keys(dayMap)
      .sort()
      .map((day) => ({
        date: format(new Date(day), "MMM d"),
        ...dayMap[day],
      }));

    return NextResponse.json(trend, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
