/**
 * Monthly digest builder and email — Supabase only (Cloudflare compatible).
 */

import { listEnquiries } from "./enquiries-cloudflare.mjs";
import { findClientById } from "./clients-cloudflare.mjs";

export async function buildDigestForClient(client) {
  const allRows = await listEnquiries();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthsRows = allRows.filter((r) => new Date(r.created_at) >= startOfMonth);

  const byService = {};
  for (const row of thisMonthsRows) {
    const svc = row.service || "General";
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(row);
  }

  return {
    client: { name: client.name, company: client.company, email: client.email },
    month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    totalEnquiries: thisMonthsRows.length,
    byService,
    generatedAt: now.toISOString(),
  };
}

export async function sendDigestEmail(client, digest) {
  const to = client.email;
  const from = process.env.EMAIL_FROM?.trim();
  const subject = `Monthly Digest — ${digest.month} — ${client.name}`;
  const text = formatDigestText(digest);

  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, from, subject, text }, process.env.RESEND_API_KEY);
  } else if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to, from, subject, text }, process.env.BREVO_API_KEY);
  } else if (process.env.POSTMARK_SERVER_TOKEN) {
    await sendViaPostmark({ to, from, subject, text }, process.env.POSTMARK_SERVER_TOKEN);
  } else {
    return false;
  }
  return true;
}

function formatDigestText(digest) {
  const lines = [
    `Monthly Digest — ${digest.month}`,
    `Client: ${digest.client.name} (${digest.client.company || "—"})`,
    `Total enquiries: ${digest.totalEnquiries}`,
    "",
  ];
  for (const [service, rows] of Object.entries(digest.byService)) {
    lines.push(`=== ${service} (${rows.length}) ===`);
    for (const r of rows) {
      lines.push(`  ${r.created_at} — ${r.name} <${r.email}> — ${r.message?.slice(0, 80) || "—"}`);
    }
    lines.push("");
  }
  lines.push(`Generated: ${digest.generatedAt}`);
  return lines.join("\n");
}

async function assertOk(res, provider) {
  if (!res.ok) throw new Error(`${provider} responded ${res.status}: ${await res.text()}`);
}

async function sendViaResend({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: from || "Duta Integra <no-reply@dutaintegrasolutions.com>", to, subject, text }),
  });
  await assertOk(res, "resend");
}

async function sendViaBrevo({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: from ? { name: "Duta Integra", email: from } : { name: "Duta Integra", email: "no-reply@dutaintegrasolutions.com" },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  await assertOk(res, "brevo");
}

async function sendViaPostmark({ to, from, subject, text }, token) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": token, "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ From: from || "no-reply@dutaintegrasolutions.com", To: to, Subject: subject, TextBody: text }),
  });
  await assertOk(res, "postmark");
}

// In-memory log for demo purposes (use KV or DB in production)
const digestLog = new Map();

export function getDigestLog(clientId) {
  return digestLog.get(clientId) || null;
}

export function setDigestLog(clientId, log) {
  digestLog.set(clientId, log);
}