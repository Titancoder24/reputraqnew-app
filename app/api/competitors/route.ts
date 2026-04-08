import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    const { data: competitors, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ competitors }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, type, industry_tags } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    // Check plan limit
    const { count: existingCount, error: countError } = await supabase
      .from("competitors")
      .select("*", { count: "exact", head: true })
      .eq("org_id", profile.org_id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", profile.org_id)
      .single();

    if (
      subscription?.max_competitors &&
      (existingCount ?? 0) >= subscription.max_competitors
    ) {
      return NextResponse.json(
        {
          error: `Competitor limit reached. Your plan allows a maximum of ${subscription.max_competitors} competitors.`,
        },
        { status: 403 }
      );
    }

    const { data: competitor, error } = await supabase
      .from("competitors")
      .insert({
        org_id: profile.org_id,
        name,
        type,
        industry_tags: industry_tags || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ competitor }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
