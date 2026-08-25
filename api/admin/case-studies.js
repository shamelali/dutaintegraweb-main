// ============================================================================
// Admin Case Studies API — CRUD for the /cases listing cards.
//
// GET    /api/admin/case-studies            → all studies (any status)
// POST   /api/admin/case-studies            → create      (JSON body)
// PATCH  /api/admin/case-studies?id=<uuid>  → update
// DELETE /api/admin/case-studies?id=<uuid>  → delete
//
// Image uploads reuse POST /api/admin/products?upload=1 (same storage bucket).
// ============================================================================

import { getSupabase, json, corsResponse, getAuthUser, sanitize } from "../_lib.js";

export const config = { maxDuration: 15 };

function cleanTags(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => sanitize(t, 40))
    .filter(Boolean)
    .slice(0, 8);
}

function cleanMetrics(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m) => m && typeof m === "object")
    .slice(0, 4)
    .map((m) => ({ value: sanitize(m.value, 24), label: sanitize(m.label, 60) }))
    .filter((m) => m.value && m.label);
}

function cleanOutcomes(v) {
  if (!Array.isArray(v)) return [];
  return v.map((s) => sanitize(s, 140)).filter(Boolean).slice(0, 6);
}

function pick(body) {
  return {
    client_name: sanitize(body.client_name, 80),
    category: sanitize(body.category, 120),
    summary_en: sanitize(body.summary_en, 600),
    summary_ms: sanitize(body.summary_ms, 600),
    image_url: sanitize(body.image_url, 500),
    metrics: cleanMetrics(body.metrics),
    outcomes: cleanOutcomes(body.outcomes),
    tags: cleanTags(body.tags),
    detail_url: sanitize(body.detail_url, 300),
    status: body.status === "published" ? "published" : "draft",
    sort_order: Number.isFinite(+body.sort_order) ? Math.trunc(+body.sort_order) : 0,
  };
}

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  const user = await getAuthUser(req);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

  const supabase = getSupabase();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("case_studies")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) return json({ ok: false, error: "Failed to fetch case studies" }, 500);
    return json({ ok: true, caseStudies: data || [] });
  }

  let body = {};
  try { body = await req.json(); } catch { /* empty */ }

  if (req.method === "POST") {
    const row = pick(body);
    if (!row.client_name) return json({ ok: false, error: "Client name is required" }, 400);
    const { data, error } = await supabase
      .from("case_studies")
      .insert(row)
      .select("id")
      .single();
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, id: data.id });
  }

  if (req.method === "PATCH") {
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    // status-only toggle support
    const patch =
      Object.keys(body).length === 1 && "status" in body
        ? { status: body.status === "published" ? "published" : "draft" }
        : pick(body);
    const { error } = await supabase
      .from("case_studies")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    const { error } = await supabase.from("case_studies").delete().eq("id", id);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
