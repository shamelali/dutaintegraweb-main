// ============================================================================
// Cron: Follow-up email — one nudge, 24h after an audit, if not yet sent.
//
// Scheduled in vercel.json → GET /api/cron/followup daily at 09:00 UTC.
// Auth: Vercel's automatic `x-vercel-cron` header OR `Authorization: Bearer
// $CRON_SECRET` for manual runs.
// ============================================================================

import { Resend } from "resend";
import { getSupabase } from "../_lib.js";

export const config = { maxDuration: 60 };

function authorized(req) {
  if (req.headers.get("x-vercel-cron")) return true;
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET || "";
  return secret && auth === `Bearer ${secret}`;
}

async function handler(req) {
  if (!authorized(req)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!process.env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not set" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabase();
  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString(); // 24h + grace
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(); // skip very old

  const { data: reports, error } = await supabase
    .from("audit_reports")
    .select("id, share_slug, domain, brand_name, score, grade, report, created_at")
    .is("followup_sent_at", null)
    .not("email", "is", null)
    .gte("created_at", cutoff)
    .lte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const from = process.env.EMAIL_FROM || "Duta Integra <noreply@dutaintegra.my>";
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const failures = [];

  for (const r of reports || []) {
    const report = typeof r.report === "string" ? JSON.parse(r.report) : r.report;
    const topFixes = (report?.recommendations || [])
      .slice(0, 2)
      .map((f) => `<li style="margin-bottom:6px"><b>${f.title}</b></li>`)
      .join("");
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#F8F9FB;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e9ef;padding:28px">
        <div style="color:#C9A227;font-size:11px;font-weight:bold;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px">Follow-up · ${r.domain}</div>
        <h1 style="color:#1E2D3D;font-size:20px;margin:0 0 12px">${r.brand_name} scored ${r.score}/100 — the fixes are easier than they look</h1>
        <p style="color:#333;line-height:1.6">Yesterday we audited <b>${r.domain}</b>. Most sites your size close their top gaps in one focused week. Your two highest-impact fixes:</p>
        <ul style="color:#333;line-height:1.55;padding-left:18px">${topFixes || "<li>Review your full report</li>"}</ul>
        <p style="text-align:center;margin:24px 0">
          <a href="https://dutaintegra.my/audit?r=${r.share_slug}" style="display:inline-block;background:#C9A227;color:#1E2D3D;text-decoration:none;font-weight:bold;padding:11px 26px;border-radius:4px">Reopen my full report</a>
        </p>
        <p style="color:#666;font-size:13.5px;line-height:1.6">Prefer a human? Book a free 20-minute call and we'll walk through every point — whether you hire us or not.</p>
      </div></body></html>`;

    try {
      await resend.emails.send({
        from,
        to: r.email,
        subject: `${r.domain}: your top 2 fixes from yesterday's audit (${r.score}/100)`,
        html,
      });
      await supabase
        .from("audit_reports")
        .update({ followup_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } catch (err) {
      failures.push(`${r.domain}: ${err?.message}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, candidates: reports?.length || 0, sent, failures }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export { handler as GET };
