import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Monthly digest — compose and send a summary to each retainer client.
 *
 * Called either:
 *   - Admin-triggered: POST /admin/clients/:id/send-digest
 *   - Bulk cron:       POST /api/monthly-digest (existing)
 *
 * Digest log is kept in data/digests.jsonl (local) or Supabase monthly_digests.
 */

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

// ── JSONL digest log ─────────────────────────────────────────────────────────

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIGEST_STORE = join(PROJECT_ROOT, "data", "digests.jsonl");

async function ensureDir() { await mkdir(dirname(DIGEST_STORE), { recursive: true }); }

async function jsonlReadDigests() {
  try {
    const raw = await readFile(DIGEST_STORE, "utf8");
    return raw.split("\n").filter((l) => l.trim()).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

async function jsonlAppendDigest(entry) {
  await ensureDir();
  await appendFile(DIGEST_STORE, `${JSON.stringify(entry)}\n`, "utf8");
}

// ── Supabase digest log ──────────────────────────────────────────────────────

function headers(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

// ── digest composition ───────────────────────────────────────────────────────

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m) {
  const [y, mNum] = m.split("-");
  const d = new Date(Number(y), Number(mNum) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Build a digest object for a single client. Reads from the enquiry store
 * and ticket store to compose a month-over-month summary.
 */
export async function buildDigestForClient(client) {
  const { listEnquiries } = await import("./enquiries.mjs");
  const { listTicketsForClient } = await import("./tickets.mjs");

  const month = currentMonth();
  const allEnquiries = await listEnquiries(500);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthEnquiries = allEnquiries.filter((e) => {
    const d = new Date(e.created_at);
    return d >= startOfMonth && (e.service || "").toLowerCase().includes(client.tier);
  });

  const tickets = await listTicketsForClient(client.id);
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const summary = {
    month,
    monthLabel: monthLabel(month),
    clientName: client.name,
    clientTier: client.tier,
    enquiries: {
      total: monthEnquiries.length,
      names: monthEnquiries.slice(0, 10).map((e) => e.name),
    },
    tickets: {
      total: tickets.length,
      open: openTickets.length,
      resolved: resolvedTickets.length,
      recent: tickets.slice(0, 5).map((t) => ({
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
      })),
    },
    health: openTickets.length === 0 ? "healthy" : openTickets.length <= 2 ? "attention" : "needs_review",
  };

  return summary;
}

/**
 * Send the digest email via the configured provider.
 * Returns true on success, false if no provider or no inbox configured.
 */
export async function sendDigestEmail(client, digest) {
  const inbox = process.env.CONTACT_INBOX_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  if (!inbox) return false;

  const from = process.env.EMAIL_FROM?.trim() || "noreply@dutaintegrasolutions.com";
  const to = client.email;
  const subject = `Duta Integra — ${digest.monthLabel} Monthly Report`;
  const text = composeDigestText(digest);
  const html = composeDigestHtml(digest);

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to, from, subject, text, html }, process.env.BREVO_API_KEY);
  } else if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, from, subject, text, html }, process.env.RESEND_API_KEY);
  } else {
    return false;
  }

  // Log the digest
  const entry = {
    clientId: client.id,
    clientEmail: client.email,
    month: digest.month,
    sentAt: new Date().toISOString(),
    health: digest.health,
  };

  if (supabaseConfigured()) {
    const base = process.env.SUPABASE_URL.replace(/\/$/, "");
    await fetch(`${base}/rest/v1/monthly_digests`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        client_id: client.id,
        month: digest.month,
        sent_at: entry.sentAt,
        content_json: digest,
      }),
    });
  } else {
    await jsonlAppendDigest(entry);
  }

  return true;
}

/** Get the last digest log entry for a client (JSONL only; Supabase uses list). */
export async function getDigestLog(clientId) {
  if (supabaseConfigured()) {
    const base = process.env.SUPABASE_URL.replace(/\/$/, "");
    const res = await fetch(
      `${base}/rest/v1/monthly_digests?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=sent_at.desc&limit=1`,
      { headers: headers() },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? { sentAt: rows[0].sent_at, month: rows[0].month } : null;
  }
  const digests = await jsonlReadDigests();
  const clientDigests = digests.filter((d) => d.clientId === clientId);
  return clientDigests.length ? clientDigests[clientDigests.length - 1] : null;
}

// ── email composition ────────────────────────────────────────────────────────

function composeDigestText(d) {
  return [
    `Monthly Report — ${d.monthLabel}`,
    `Client: ${d.clientName} (${d.clientTier} tier)`,
    "",
    `Enquiries this month: ${d.enquiries.total}`,
    d.enquiries.names.length ? `From: ${d.enquiries.names.join(", ")}` : "",
    "",
    `Tickets: ${d.tickets.total} total, ${d.tickets.open} open, ${d.tickets.resolved} resolved`,
    "",
    d.tickets.recent.length ? "Recent tickets:" : "",
    ...d.tickets.recent.map((t) => `  • [${t.status}] ${t.subject} (${t.priority})`),
    "",
    `Health status: ${d.health}`,
    "",
    "— Duta Integra Team",
    "https://dutaintegra.my",
  ].join("\n");
}

function composeDigestHtml(d) {
  const ticketRows = d.tickets.recent.length
    ? d.tickets.recent.map((t) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${t.subject}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e5e7eb">${t.status}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e5e7eb">${t.priority}</td></tr>`
      ).join("")
    : `<tr><td colspan="3" style="padding:8px;color:#6b7280">No tickets this month</td></tr>`;

  const healthColor = d.health === "healthy" ? "#16a34a" : d.health === "attention" ? "#d97706" : "#dc2626";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#f9fafb">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <div style="background:#1c1917;padding:24px;color:#fff">
    <h1 style="margin:0;font-size:20px">Duta Integra — Monthly Report</h1>
    <p style="margin:4px 0 0;opacity:0.8">${d.monthLabel}</p>
  </div>
  <div style="padding:24px">
    <p style="margin:0 0 16px;color:#374151">Hi ${d.clientName},</p>
    <p style="margin:0 0 24px;color:#374151">Here's your monthly summary for <strong>${d.clientLabel}</strong> (${d.clientTier} tier).</p>
    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:bold;color:#16a34a">${d.enquiries.total}</div>
        <div style="font-size:13px;color:#6b7280">Enquiries</div>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:bold;color:#2563eb">${d.tickets.total}</div>
        <div style="font-size:13px;color:#6b7280">Tickets</div>
      </div>
      <div style="flex:1;background:${healthColor}10;border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:14px;font-weight:bold;color:${healthColor};text-transform:capitalize">${d.health}</div>
        <div style="font-size:13px;color:#6b7280">Health</div>
      </div>
    </div>
    <h2 style="font-size:16px;color:#1c1917;margin:0 0 12px">Recent Tickets</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f5f5f4"><th style="padding:8px;text-align:left">Subject</th><th style="padding:8px;text-align:left">Status</th><th style="padding:8px;text-align:left">Priority</th></tr></thead>
      <tbody>${ticketRows}</tbody>
    </table>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;color:#6b7280;font-size:13px">Generated by Duta Integra · <a href="https://dutaintegra.my" style="color:#6b7280">dutaintegraweb-main</a></p>
    </div>
  </div>
</div></body></html>`;
}

// ── email providers ──────────────────────────────────────────────────────────

async function sendViaBrevo({ to, from, subject, text, html }, apiKey) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Duta Integra", email: from },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo digest failed: ${res.status} ${await res.text()}`);
}

async function sendViaResend({ to, from, subject, text, html }, apiKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend digest failed: ${res.status}`);
}
