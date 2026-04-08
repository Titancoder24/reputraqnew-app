import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
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
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Verify the keyword belongs to the user's org
    const { data: existingKeyword } = await supabase
      .from("keywords")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    if (!existingKeyword) {
      return NextResponse.json(
        { error: "Keyword not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { keyword, type, entity_name, entity_type, is_active } = body;

    const updateFields: Record<string, unknown> = {};
    if (keyword !== undefined) updateFields.keyword = keyword;
    if (type !== undefined) updateFields.type = type;
    if (entity_name !== undefined) updateFields.entity_name = entity_name;
    if (entity_type !== undefined) updateFields.entity_type = entity_type;
    if (is_active !== undefined) updateFields.is_active = is_active;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updatedKeyword, error } = await supabase
      .from("keywords")
      .update(updateFields)
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keyword: updatedKeyword }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Verify the keyword belongs to the user's org
    const { data: existingKeyword } = await supabase
      .from("keywords")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    if (!existingKeyword) {
      return NextResponse.json(
        { error: "Keyword not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("keywords")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Keyword deleted successfully" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
