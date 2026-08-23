// ============================================================================
// Track API — first-party event collector for the admin dashboard.
//
// POST /api/track  { type, path?, meta? }
// Types: page_view | preview_register | preview_click
//
// Fire-and-forget from the client (sendBeacon). No cookies, no PII beyond
// what callers explicitly put in `meta`. Permissive CORS because sendBeacon
// does not always send Origin on keepalive.
// ============================================================================

import { getSupabase, json, corsResponse } from "./_lib.js";

export const config = { maxDuration: 10 };

const ALLOWED_TYPES = new Set(["page_view", "preview_register", "preview_click"]);
let hits = 0;
let windowStart = Date.now();

function rateOk() {
  const now = Date.now();
  if (now - windowStart > 60000) { hits = 0; windowStart = now; }
  return ++hits <= 600; // per warm instance
}

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!rateOk()) return json({ ok: false }, 429);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const type = String(body.type || "");
  if (!ALLOWED_TYPES.has(type)) return json({ ok: false, error: "Unknown event type" }, 400);

  // Ignore obvious bots that fire page views with no referrer AND no UA.
  const ua = req.headers.get("user-agent") || "";
  if (!ua && type === "page_view" && !req.headers.get("referer")) {
    return json({ ok: true });
  }

  const { error } = await getSupabase()
    .from("events")
    .insert({
      type,
      path: String(body.path || "/").slice(0, 300),
      meta: typeof body.meta === "object" && body.meta !== null ? body.meta : {},
    });
  if (error) {
    console.error("track insert:", error.message);
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
}

export { handler as POST };
