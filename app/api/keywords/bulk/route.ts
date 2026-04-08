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
    const { keywords } = body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "keywords must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each keyword entry
    for (const entry of keywords) {
      if (
        !entry.keyword ||
        !entry.type ||
        !entry.entity_name ||
        !entry.entity_type
      ) {
        return NextResponse.json(
          {
            error:
              "Each keyword must have keyword, type, entity_name, and entity_type",
          },
          { status: 400 }
        );
      }

      if (
        !VALID_KEYWORD_TYPES.includes(
          entry.type as (typeof VALID_KEYWORD_TYPES)[number]
        )
      ) {
        return NextResponse.json(
          {
            error: `type must be one of: ${VALID_KEYWORD_TYPES.join(", ")}. Got "${entry.type}" for keyword "${entry.keyword}"`,
          },
          { status: 400 }
        );
      }

      if (
        !VALID_ENTITY_TYPES.includes(
          entry.entity_type as (typeof VALID_ENTITY_TYPES)[number]
        )
      ) {
        return NextResponse.json(
          {
            error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}. Got "${entry.entity_type}" for keyword "${entry.keyword}"`,
          },
          { status: 400 }
        );
      }
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

    const totalAfterInsert = (existingCount ?? 0) + keywords.length;
    if (subscription?.max_keywords && totalAfterInsert > subscription.max_keywords) {
      return NextResponse.json(
        {
          error: `Keyword limit would be exceeded. Your plan allows ${subscription.max_keywords} keywords. You currently have ${existingCount ?? 0} and are trying to add ${keywords.length}.`,
        },
        { status: 403 }
      );
    }

    // Prepare rows for insertion
    const rows = keywords.map(
      (entry: {
        keyword: string;
        type: string;
        entity_name: string;
        entity_type: string;
      }) => ({
        org_id: profile.org_id,
        keyword: entry.keyword,
        type: entry.type,
        entity_name: entry.entity_name,
        entity_type: entry.entity_type,
      })
    );

    const { data: insertedKeywords, error } = await supabase
      .from("keywords")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keywords: insertedKeywords }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
