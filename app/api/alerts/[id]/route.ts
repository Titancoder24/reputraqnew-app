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

    // Verify the alert rule belongs to the user's org
    const { data: existingRule } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    if (!existingRule) {
      return NextResponse.json(
        { error: "Alert rule not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { is_active, recipients, trigger_type, channel } = body;

    const updateFields: Record<string, unknown> = {};
    if (is_active !== undefined) updateFields.is_active = is_active;
    if (recipients !== undefined) updateFields.recipients = recipients;
    if (trigger_type !== undefined) updateFields.trigger_type = trigger_type;
    if (channel !== undefined) updateFields.channel = channel;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: alertRule, error } = await supabase
      .from("alert_rules")
      .update(updateFields)
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert_rule: alertRule }, { status: 200 });
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

    // Verify the alert rule belongs to the user's org
    const { data: existingRule } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    if (!existingRule) {
      return NextResponse.json(
        { error: "Alert rule not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Alert rule deleted successfully" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
