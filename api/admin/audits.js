// ============================================================================
// Admin Audits API — list stored audit reports + aggregate stats.
//
// GET /api/admin/audits   (auth) → recent audit_reports + 30-day stats
// ============================================================================

import { getSupabase, json, corsResponse, getAuthUser } from "../_lib.js";

export const config = { maxDuration: 15 };

async function buildStats(supabase) {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [auditsRes, leadsRes, eventsRes] = await Promise.all([
    supabase.from("audit_reports").select("score, email, followup_sent_at, created_at").gte("created_at", since30),
    supabase.from("leads").select("source").gte("created_at", since30),
    supabase.from("events").select("type").gte("created_at", since30),
  ]);

  const audits = auditsRes.data || [];
  const scores = audits.map((a) => a.score).filter((n) => typeof n === "number");

  const events = {};
  (eventsRes.data || []).forEach((e) => {
    events[e.type] = (events[e.type] || 0) + 1;
  });

  return {
    window: "30d",
    audits30d: audits.length,
    leadsFromAudit: (leadsRes.data || []).filter((l) => l.source === "free-audit").length,
    avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
    followupsSent: audits.filter((a) => a.followup_sent_at).length,
    events,
  };
}

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (!getAuthUser(req)) return json({ ok: false, error: "Unauthorized" }, 401);

  const supabase = getSupabase();
  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from("audit_reports")
      .select("id, share_slug, domain, brand_name, industry, email, score, grade, followup_sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    buildStats(supabase),
  ]);

  if (error) return json({ ok: false, error: "Failed to fetch audits" }, 500);
  return json({ ok: true, audits: data || [], stats });
}

export { handler as GET };
