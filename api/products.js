// ============================================================================
// Public Products API — feeds the Work page.
//
// GET /api/products   → published products ordered by sort_order.
// Open origin by design; RLS on `products` already restricts reads to
// status = 'published'.
// ============================================================================

import { getSupabase, json, corsResponse } from "./_lib.js";

export const config = { maxDuration: 10 };

let cache = { at: 0, data: null };
const CACHE_MS = 30_000;

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return json({ ok: true, products: cache.data });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(
      "name, tagline, category, description_en, description_ms, tags, metrics, preview_url, image_url, contact_cta_en, contact_cta_ms, sort_order"
    )
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");

  if (error) {
    console.error("public products:", error);
    return json({ ok: false, error: "Failed to load products" }, 500);
  }

  cache = { at: Date.now(), data: data || [] };
  return json({ ok: true, products: cache.data });
}

export { handler as GET };
