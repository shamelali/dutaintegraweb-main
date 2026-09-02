// ============================================================================
// Cron router — consolidates 4 former cron functions into 1 to stay under
// Vercel Hobby 12-function limit. Rewrites in vercel.json map old paths:
//   /api/cron/followup     -> /api/cron?job=followup
//   /api/cron/daily-tasks  -> /api/cron?job=daily-tasks
//   /api/cron/digest       -> /api/cron?job=digest
//   /api/cron/stale-leads  -> /api/cron?job=stale-leads
// ============================================================================

import { Resend } from "resend";
import { getSupabase, cronJson, postToSlack } from "./_lib.js";
import { isCronAuthorized } from "../lib/auth.js";
import { config as appConfig } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { DAILY_TASKS, checklistMessage } from "./_tasks.js";
import { createFsVaultWriter, createSupabaseVaultWriter, synthesizeBatch } from "../lib/memory.js";
import fs from "node:fs/promises";
import path from "node:path";

export const config = { maxDuration: 60 };

// ---------------------------------------------------------------------------
// Followup — 24h nudge
// ---------------------------------------------------------------------------
async function handleFollowup(req) {
  if (!isCronAuthorized(req)) return cronJson({ ok: false, error: "Unauthorized" }, 401);
  if (!appConfig.resendApiKey) return cronJson({ ok: false, error: "RESEND_API_KEY not set" }, 503);
  const supabase = getSupabase();
  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: reports, error } = await supabase
    .from("audit_reports")
    .select("id, share_slug, domain, brand_name, score, grade, report, created_at")
    .is("followup_sent_at", null)
    .not("email", "is", null)
    .gte("created_at", cutoff)
    .lte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return cronJson({ ok: false, error: error.message }, 500);
  const from = appConfig.emailFrom;
  const resend = new Resend(appConfig.resendApiKey);
  let sent = 0;
  const failures = [];
  for (const r of reports || []) {
    const report = typeof r.report === "string" ? JSON.parse(r.report) : r.report;
    const topFixes = (report?.recommendations || []).slice(0, 2).map((f) => `<li style="margin-bottom:6px"><b>${f.title}</b></li>`).join("");
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#F8F9FB;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e9ef;padding:28px">
        <div style="color:#C9A227;font-size:11px;font-weight:bold;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px">Follow-up · ${r.domain}</div>
        <h1 style="color:#1E2D3D;font-size:20px;margin:0 0 12px">${r.brand_name} scored ${r.score}/100 — the fixes are easier than they look</h1>
        <p style="color:#333;line-height:1.6">Yesterday we audited <b>${r.domain}</b>. Most sites your size close their top gaps in one focused week. Your two highest-impact fixes:</p>
        <ul style="color:#333;line-height:1.55;padding-left:18px">${topFixes || "<li>Review your full report</li>"}</ul>
        <p style="text-align:center;margin:24px 0"><a href="https://dutaintegra.my/audit?r=${r.share_slug}" style="display:inline-block;background:#C9A227;color:#1E2D3D;text-decoration:none;font-weight:bold;padding:11px 26px;border-radius:4px">Reopen my full report</a></p>
        <p style="color:#666;font-size:13.5px;line-height:1.6">Prefer a human? Book a free 20-minute call and we'll walk through every point — whether you hire us or not.</p>
      </div></body></html>`;
    try {
      await resend.emails.send({ from, to: r.email, subject: `${r.domain}: your top 2 fixes from yesterday's audit (${r.score}/100)`, html });
      await supabase.from("audit_reports").update({ followup_sent_at: new Date().toISOString() }).eq("id", r.id);
      sent++;
    } catch (err) { failures.push(`${r.domain}: ${err?.message}`); }
  }
  return cronJson({ ok: true, candidates: reports?.length || 0, sent, failures });
}

// ---------------------------------------------------------------------------
// Daily tasks — 08:00 MYT
// ---------------------------------------------------------------------------
function mytLabelDaily() {
  return new Intl.DateTimeFormat("en", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long" }).format(new Date());
}
async function handleDailyTasks(req) {
  if (!isCronAuthorized(req)) return cronJson({ ok: false, error: "Unauthorized" }, 401);
  const label = mytLabelDaily();
  let posted = 0;
  for (const role of Object.keys(DAILY_TASKS)) {
    const ok = await postToSlack(checklistMessage(role, label), { username: "Duta Integra Daily Tasks", icon_emoji: ":white_check_mark:" });
    if (ok) posted++;
  }
  return cronJson({ ok: true, posted });
}

// ---------------------------------------------------------------------------
// Digest — 08:30 MYT
// ---------------------------------------------------------------------------
const DAY = 24 * 3600 * 1000;
function mytMidnightUtc(daysAgo) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = {}; for (const p of parts) map[p.type] = p.value;
  const todayGmtMidnight = Date.UTC(+map.year, +map.month - 1, +map.day);
  const start = new Date(todayGmtMidnight - 8 * 3600 * 1000);
  start.setUTCDate(start.getUTCDate() - daysAgo);
  return start.toISOString();
}
function mytLabelDigest() {
  return new Intl.DateTimeFormat("en", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long" }).format(new Date());
}
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

async function handleMemoryFold({ supabase, newLeads }) {
  if (!appConfig.memoryVaultEnabled) return { skipped: true };
  try {
    // Use git FS writer by default (memory/vault), Supabase writer if SUPABASE_SERVICE_ROLE_KEY set and vault not local
    let writer;
    // Prefer FS for MVP (vercel: outputDirectory="." serves memory/vault statically when committed)
    // In production, caller can pass Supabase writer instead; here we try FS then fallback to Supabase
    try {
      // base is read via synthesizeBatch from config.memoryVaultPath
      // probe FS — in Vercel serverless /tmp is writable, repo path is read-only
      // synthesizeBatch will create dirs via fs.mkdir recursive
      writer = createFsVaultWriter({ fs, path });
      // slight override: if file fails, synthesizeBatch will log and continue
    } catch {}
    if (!writer) writer = createSupabaseVaultWriter(supabase);

    // Fold yesterday's leads + last 7 days for company aggregates
    const sevenDaysAgo = new Date(Date.now() - 7 * DAY).toISOString();
    const { data: recentLeads, error: eFold } = await supabase
      .from("leads")
      .select("id,name,email,company,service,message,status,source,lead_score,assigned_role,created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(100);
    if (eFold) {
      logger.warn("memory fold query failed", { error: eFold.message });
      return { ok: false, error: eFold.message };
    }
    const targets = recentLeads && recentLeads.length ? recentLeads : newLeads;
    if (!targets || targets.length === 0) return { ok: true, written: 0, note: "no leads to fold" };

    const result = await synthesizeBatch(targets, writer);

    // checkpoint sync state
    try {
      await supabase.from("memory_sync_state").upsert({
        id: "daily-fold",
        cursor: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        meta: { newLeads: newLeads?.length || 0, recentLeads: recentLeads?.length || 0, result },
      }, { onConflict: "id" });
    } catch (e) {
      logger.warn("memory_sync_state upsert failed", { error: e?.message });
    }
    return { ok: true, ...result };
  } catch (err) {
    logger.error("handleMemoryFold threw", { error: err?.message });
    return { ok: false, error: err?.message };
  }
}

async function handleDigest(req) {
  if (!isCronAuthorized(req)) return cronJson({ ok: false, error: "Unauthorized" }, 401);
  const supabase = getSupabase();
  const yesterdayStart = mytMidnightUtc(1);
  const threeDaysAgo = new Date(Date.now() - 3 * DAY).toISOString();
  const warmFrom = new Date(Date.now() - 14 * DAY).toISOString();
  const warmTo = new Date(Date.now() - 3 * DAY).toISOString();
  const { data: newLeads, error: e1 } = await supabase.from("leads").select("name,email,company,service,source,lead_score,assigned_role,created_at").gte("created_at", yesterdayStart).order("created_at", { ascending: false }).limit(25);
  if (e1) return cronJson({ ok: false, error: "leads query failed: " + e1.message }, 500);
  const { data: warmAudits, error: e2 } = await supabase.from("audit_reports").select("share_slug,domain,brand_name,score,email,created_at").not("email", "is", null).not("followup_sent_at", "is", null).lt("score", 60).lte("created_at", warmTo).gte("created_at", warmFrom).order("created_at", { ascending: false }).limit(50);
  if (e2) return cronJson({ ok: false, error: "audit query failed: " + e2.message }, 500);
  let warm = [];
  if ((warmAudits || []).length) {
    const emails = [...new Set(warmAudits.map((a) => a.email.toLowerCase()).filter(Boolean))];
    const { data: matched, error: e3 } = await supabase.from("leads").select("email,status").in("email", emails);
    if (e3) return cronJson({ ok: false, error: "lead match query failed: " + e3.message }, 500);
    const converted = new Set((matched || []).filter((l) => l.status === "contacted" || l.status === "closed").map((l) => l.email.toLowerCase()));
    warm = (warmAudits || []).filter((a) => !converted.has(a.email.toLowerCase())).slice(0, 10);
  }
  const [nRes, cRes] = await Promise.all([
    supabase.from("leads").select("name,email,company,service,status,lead_score,assigned_role,created_at").eq("status", "new").lte("created_at", threeDaysAgo).order("created_at", { ascending: false }).limit(15),
    supabase.from("leads").select("name,email,company,service,status,lead_score,assigned_role,updated_at").eq("status", "contacted").lte("updated_at", threeDaysAgo).order("updated_at", { ascending: false }).limit(15),
  ]);
  if (nRes.error) return cronJson({ ok: false, error: "stalled query failed: " + nRes.error.message }, 500);
  if (cRes.error) return cronJson({ ok: false, error: "stalled query failed: " + cRes.error.message }, 500);
  const stalled = [...(nRes.data || []), ...(cRes.data || [])].slice(0, 20);
  const fmtLead = (l) => `• ${l.name || "—"} — ${l.service || "no service"} · ${l.source || "unknown"} · score ${l.lead_score ?? 0}${l.assigned_role ? ` · → ${l.assigned_role}` : ""}`;
  const fmtAudit = (a) => `• ${a.domain} — ${a.score}/100 · ${Math.max(1, Math.round((Date.now() - new Date(a.created_at).getTime()) / DAY))}d old`;
  const lines = [`:coffee: *Duta Integra — morning digest · ${mytLabelDigest()}*`, ""];
  lines.push(`*➤ New leads yesterday (${newLeads.length})*`);
  lines.push(newLeads.length ? newLeads.map(fmtLead).join("\n") : "_None — all clear._", "");
  lines.push(`*➤ Warm audits not converted (${warm.length})*`);
  lines.push(warm.length ? warm.map(fmtAudit).join("\n") : "_None._", "");
  lines.push(`*➤ Stalled leads — 3d+ no movement (${stalled.length})*`);
  lines.push(stalled.length ? stalled.map((l) => `• ${l.name || "—"} — ${l.service || "no service"} · ${l.status}`).join("\n") : "_None._");
  // Memory vault fold (best-effort, runs before Slack/email so digest and vault stay in sync)
  let memoryFold = null;
  try { memoryFold = await handleMemoryFold({ supabase, newLeads }); } catch (e) { memoryFold = { ok: false, error: String(e?.message) }; }

  const slackOk = await postToSlack(lines.join("\n"), { username: "Duta Integra Digest", icon_emoji: ":coffee:" });
  const to = appConfig.emailTo;
  let emailOk = false;
  if (appConfig.resendApiKey && to.length) {
    try {
      const resend = new Resend(appConfig.resendApiKey);
      const row = (label, value) => value ? `<tr><td style="padding:6px 8px;border-bottom:1px solid #e0e0e0;color:#4a4a6a;white-space:nowrap"><b>${esc(label)}</b></td><td style="padding:6px 8px;border-bottom:1px solid #e0e0e0">${esc(value)}</td></tr>` : "";
      const table = (rows) => rows.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 18px">${rows.map((l) => row(l.name || l.domain, `${l.service || l.score + "/100"} · ${l.source || l.status}`)).join("")}</table>` : `<p style="color:#6a6a8a;font-size:13px">None.</p>`;
      const html = `<div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#fff;padding:24px">
        <h2 style="color:#1a1a2e;margin:0 0 4px">Morning digest — ${esc(mytLabelDigest())}</h2>
        <p style="color:#6a6a8a;margin:0 0 18px;font-size:13px">Duta Integra daily briefing · auto-generated</p>
        <h3 style="color:#1a1a2e;margin:16px 0 0">New leads yesterday (${newLeads.length})</h3>${table(newLeads)}
        <h3 style="color:#1a1a2e;margin:16px 0 0">Warm audits not converted (${warm.length})</h3>${table(warm)}
        <h3 style="color:#1a1a2e;margin:16px 0 0">Stalled leads (${stalled.length})</h3>${table(stalled)}
        <p style="color:#6a6a8a;font-size:12px;margin-top:22px">Manage leads at <a href="https://dutaintegra.my/admin">dutaintegra.my/admin</a></p>
      </div>`;
      await resend.emails.send({ from: appConfig.emailFrom, to, subject: `Morning digest ${mytLabelDigest()} — ${newLeads.length} new, ${warm.length} warm audits, ${stalled.length} stalled`, html });
      emailOk = true;
    } catch (err) { logger.error("digest email error", { error: err?.message }); }
  }
  return cronJson({ ok: true, newLeads: newLeads.length, warm: warm.length, stalled: stalled.length, slack: !!slackOk, email: emailOk, memoryFold });
}

// ---------------------------------------------------------------------------
// Stale leads — weekly Monday 09:30 MYT
// ---------------------------------------------------------------------------
async function handleStaleLeads(req) {
  if (!isCronAuthorized(req)) return cronJson({ ok: false, error: "Unauthorized" }, 401);
  const supabase = getSupabase();
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const [nRes, cRes] = await Promise.all([
    supabase.from("leads").select("name,email,company,service,status,source,lead_score,assigned_role,created_at").eq("status", "new").lte("created_at", weekAgo).order("created_at", { ascending: false }).limit(20),
    supabase.from("leads").select("name,email,company,service,status,source,lead_score,assigned_role,updated_at").eq("status", "contacted").lte("updated_at", weekAgo).order("updated_at", { ascending: false }).limit(20),
  ]);
  if (nRes.error) return cronJson({ ok: false, error: "stale query failed: " + nRes.error.message }, 500);
  if (cRes.error) return cronJson({ ok: false, error: "stale query failed: " + cRes.error.message }, 500);
  const stale = [...(nRes.data || []), ...(cRes.data || [])].slice(0, 20);
  if (!stale.length) return cronJson({ ok: true, stale: 0, message: "No stale leads — nice." });
  const lines = [":rotating_light: *Stale leads — no movement for 7+ days*", ""];
  for (const l of stale) {
    const ref = l.updated_at || l.created_at;
    const days = Math.max(1, Math.round((Date.now() - new Date(ref).getTime()) / DAY));
    const when = l.status === "contacted" ? `last updated ${days}d ago` : `created ${days}d ago`;
    lines.push(`• ${l.name || "—"} — ${l.service || "no service"} · (${l.status}, ${when}) · score ${l.lead_score ?? 0}${l.assigned_role ? ` → ${l.assigned_role}` : ""}`);
  }
  lines.push("", "Prioritise in <https://dutaintegra.my/admin|the admin dashboard>.");
  const ok = await postToSlack(lines.join("\n"), { username: "Duta Integra Pipeline", icon_emoji: ":rotating_light:" });
  return cronJson({ ok: true, stale: stale.length, slack: !!ok });
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function handler(req) {
  const url = new URL(req.url, 'https://dutaintegra.my');
  let job = url.searchParams.get("job") || url.searchParams.get("cron") || "";
  if (!job) {
    const path = url.pathname;
    if (path.includes("followup")) job = "followup";
    else if (path.includes("daily-tasks")) job = "daily-tasks";
    else if (path.includes("digest")) job = "digest";
    else if (path.includes("stale-leads")) job = "stale-leads";
  }
  switch (job) {
    case "followup":
      return handleFollowup(req);
    case "daily-tasks":
    case "dailyTasks":
      return handleDailyTasks(req);
    case "digest":
      return handleDigest(req);
    case "stale-leads":
    case "staleLeads":
      return handleStaleLeads(req);
    default:
      return cronJson({ ok: false, error: "Unknown cron job: " + (job || "(none) — use ?job=followup|daily-tasks|digest|stale-leads") }, 404);
  }
}

export { handler as GET };
