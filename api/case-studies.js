// ============================================================================
// Public Case Studies API — feeds the /cases listing grid.
//
// GET /api/case-studies → published studies ordered by sort_order.
// ============================================================================

import { getSupabase, json, corsResponse } from "./_lib.js";

export const config = { maxDuration: 10 };

let cache = { at: 0, data: null };
const CACHE_MS = 30_000;

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return json({ ok: true, caseStudies: cache.data });
  }

  const { data, error } = await getSupabase()
    .from("case_studies")
    .select(
      "client_name, category, summary_en, summary_ms, image_url, metrics, outcomes, tags, detail_url, sort_order"
    )
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");

  if (error) {
    console.error("public case-studies:", error);
    return json({ ok: false, error: "Failed to load case studies" }, 500);
  }

  cache = { at: Date.now(), data: data || [] };
  return json({ ok: true, caseStudies: cache.data });
}

export { handler as GET };
