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

    const { data: organization, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.org_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organization }, { status: 200 });
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

    const body = await request.json();
    const { brand_name, parent_company, industry_category, regions, languages } =
      body;

    if (!brand_name) {
      return NextResponse.json(
        { error: "brand_name is required" },
        { status: 400 }
      );
    }

    // Create the organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        brand_name,
        parent_company: parent_company || null,
        industry_category: industry_category || null,
        regions: regions || null,
        languages: languages || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Update the user's profile with the new org_id
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ org_id: organization.id })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // Create a subscription with pending_approval status
    const { error: subError } = await supabase.from("subscriptions").insert({
      org_id: organization.id,
      status: "pending_approval",
    });

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    return NextResponse.json({ organization }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
