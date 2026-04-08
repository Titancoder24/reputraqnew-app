import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch profile with org_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { user, profile: null, org: null, subscription: null },
        { status: 200 }
      );
    }

    let org = null;
    let subscription = null;

    if (profile?.org_id) {
      // Fetch organization and subscription in parallel
      const [orgResult, subscriptionResult] = await Promise.all([
        supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.org_id)
          .single(),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("org_id", profile.org_id)
          .single(),
      ]);

      org = orgResult.data;
      subscription = subscriptionResult.data;
    }

    return NextResponse.json(
      { user, profile, org, subscription },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
