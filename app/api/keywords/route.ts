import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_KEYWORD_TYPES = [
  "brand",
  "product",
  "spokesperson",
  "campaign",
  "hashtag",
  "competitor",
] as const;

const VALID_ENTITY_TYPES = ["brand", "competitor"] as const;

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
    const isActive = searchParams.get("is_active");

    let query = supabase
      .from("keywords")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: keywords, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keywords }, { status: 200 });
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
    const { keyword, type, entity_name, entity_type } = body;

    if (!keyword || !type || !entity_name || !entity_type) {
      return NextResponse.json(
        { error: "keyword, type, entity_name, and entity_type are required" },
        { status: 400 }
      );
    }

    if (
      !VALID_KEYWORD_TYPES.includes(
        type as (typeof VALID_KEYWORD_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `type must be one of: ${VALID_KEYWORD_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      !VALID_ENTITY_TYPES.includes(
        entity_type as (typeof VALID_ENTITY_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check plan limit
    const { count: existingCount, error: countError } = await supabase
      .from("keywords")
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
      subscription?.max_keywords &&
      (existingCount ?? 0) >= subscription.max_keywords
    ) {
      return NextResponse.json(
        {
          error: `Keyword limit reached. Your plan allows a maximum of ${subscription.max_keywords} keywords.`,
        },
        { status: 403 }
      );
    }

    const { data: newKeyword, error } = await supabase
      .from("keywords")
      .insert({
        org_id: profile.org_id,
        keyword,
        type,
        entity_name,
        entity_type,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keyword: newKeyword }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
