import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  GET /api/feed — The Main Data Endpoint                             */
/*  Returns filtered, paginated search results                         */
/* ------------------------------------------------------------------ */

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
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const orgId = profile.org_id;
    const searchParams = request.nextUrl.searchParams;

    // Required params
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo are required" },
        { status: 400 }
      );
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    // Optional filters
    const sentiment = searchParams.get("sentiment");
    const sourceType = searchParams.get("source_type");
    const platform = searchParams.get("platform");
    const entityType = searchParams.get("entity_type");
    const entityName = searchParams.get("entity_name");
    const search = searchParams.get("search");
    const region = searchParams.get("region");
    const language = searchParams.get("language");
    const riskFlag = searchParams.get("risk_flag");
    const sort = searchParams.get("sort") || "collected_at";

    // Build count query
    let countQuery = supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    // Build data query
    let dataQuery = supabase
      .from("search_results")
      .select("*")
      .eq("org_id", orgId)
      .gte("collected_at", dateFrom)
      .lte("collected_at", dateTo);

    // Apply optional filters to both queries
    if (sentiment) {
      countQuery = countQuery.eq("sentiment", sentiment);
      dataQuery = dataQuery.eq("sentiment", sentiment);
    }

    if (sourceType) {
      countQuery = countQuery.eq("source_type", sourceType);
      dataQuery = dataQuery.eq("source_type", sourceType);
    }

    if (platform) {
      countQuery = countQuery.eq("platform", platform);
      dataQuery = dataQuery.eq("platform", platform);
    }

    if (entityType) {
      countQuery = countQuery.eq("entity_type", entityType);
      dataQuery = dataQuery.eq("entity_type", entityType);
    }

    if (entityName) {
      countQuery = countQuery.eq("entity_name", entityName);
      dataQuery = dataQuery.eq("entity_name", entityName);
    }

    if (region) {
      countQuery = countQuery.eq("region", region);
      dataQuery = dataQuery.eq("region", region);
    }

    if (language) {
      countQuery = countQuery.eq("language", language);
      dataQuery = dataQuery.eq("language", language);
    }

    if (search) {
      const searchFilter = `title.ilike.%${search}%,snippet.ilike.%${search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    if (riskFlag === "true") {
      countQuery = countQuery.eq("risk_flag", true);
      dataQuery = dataQuery.eq("risk_flag", true);
    }

    // Get total count
    const { count: total, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      );
    }

    // Apply sorting
    switch (sort) {
      case "sentiment_score":
        dataQuery = dataQuery.order("sentiment_score", { ascending: false });
        break;
      case "title":
        dataQuery = dataQuery.order("title", { ascending: true });
        break;
      case "collected_at":
      default:
        dataQuery = dataQuery.order("collected_at", { ascending: false });
        break;
    }

    // Apply pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data: results, error: dataError } = await dataQuery;

    if (dataError) {
      return NextResponse.json(
        { error: dataError.message },
        { status: 500 }
      );
    }

    const totalCount = total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        results: results || [],
        total: totalCount,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
