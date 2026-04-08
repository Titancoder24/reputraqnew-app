import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TRIGGER_TYPES = [
  "negative_article",
  "competitor_positive",
  "tier1_mention",
  "executive_mention",
  "crisis_keyword",
  "mention_spike",
] as const;

const VALID_CHANNELS = ["email", "slack", "whatsapp", "sms"] as const;

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

    const { data: alertRules, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert_rules: alertRules || [] }, { status: 200 });
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
    const { trigger_type, channel, recipients } = body;

    if (!trigger_type || !channel || !recipients) {
      return NextResponse.json(
        { error: "trigger_type, channel, and recipients are required" },
        { status: 400 }
      );
    }

    if (
      !VALID_TRIGGER_TYPES.includes(
        trigger_type as (typeof VALID_TRIGGER_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `trigger_type must be one of: ${VALID_TRIGGER_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      !VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])
    ) {
      return NextResponse.json(
        { error: `channel must be one of: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "recipients must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    const { data: alertRule, error } = await supabase
      .from("alert_rules")
      .insert({
        org_id: profile.org_id,
        trigger_type,
        channel,
        recipients,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert_rule: alertRule }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
