import { urlHash } from "./serpapi";

export async function filterNewResults(
  supabase: any,
  orgId: string,
  results: any[]
): Promise<any[]> {
  if (!results.length) return [];

  const hashes = results.map((r) => urlHash(r.link));

  const { data: existing } = await supabase
    .from("search_results")
    .select("url_hash")
    .eq("org_id", orgId)
    .in("url_hash", hashes);

  const existingSet = new Set(
    (existing || []).map((e: any) => e.url_hash)
  );

  return results.filter((r) => !existingSet.has(urlHash(r.link)));
}
