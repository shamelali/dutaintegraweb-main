// ============================================================================
// Public Report API — fetch a stored brand-audit report by its share slug.
//
// GET /api/report?slug=abc123   → { ok, report }
//
// Slugs are unguessable 10-char ids; reports contain no credentials, only the
// data the owner already saw on screen. Cached briefly per instance.
// ============================================================================

import { getSupabase, json, corsResponse } from "./_lib.js";

export const config = { maxDuration: 10 };

let cache = { slug: null, at: 0, payload: null };
const CACHE_MS = 60_000;

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const slug = String(new URL(req.url).searchParams.get("slug") || "").trim();
  if (!slug || !/^[a-z0-9]{6,16}$/i.test(slug)) {
    return json({ ok: false, error: "Invalid report link." }, 400);
  }

  if (cache.slug === slug && Date.now() - cache.at < CACHE_MS) {
    return json(cache.payload);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("report")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("report lookup:", error.message);
    return json({ ok: false, error: "Could not load that report." }, 500);
  }
  if (!data) {
    return json({ ok: false, error: "Report not found — the link may have expired." }, 404);
  }

  cache = { slug, at: Date.now(), payload: { ok: true, report: data.report } };
  return json(cache.payload);
}

export { handler as GET };
