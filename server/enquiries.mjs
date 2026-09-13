import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Enquiry persistence and notification.
 *
 * Storage backend is chosen at call time, not at import time, so tests can
 * toggle env vars between cases without re-importing the module:
 *
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set  -> Supabase Postgres
 *     (production / Vercel — serverless functions have no durable local
 *     filesystem, so a JSONL file would silently lose every lead on the
 *     next cold start. This is exactly the bug this whole rebuild exists
 *     to fix, so it must not be reintroduced here.)
 *   - otherwise                                     -> local JSONL file
 *     (local dev and the existing test suite; zero setup required)
 *
 * In both modes the row is ALWAYS written before the notification is
 * attempted — a lead must survive a restart, a crash mid-request, or a
 * mail-provider outage.
 */

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

// ── JSONL backend (local dev / tests) ───────────────────────────────────────

// Resolved relative to this file, NOT process.cwd() — enquiries must land in
// the project's data/ directory however the server is launched.
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STORE = join(PROJECT_ROOT, "data", "enquiries.jsonl");

export function storePath() {
  return process.env.ENQUIRY_STORE || DEFAULT_STORE;
}

async function jsonlRecord(record) {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

async function jsonlList(limit) {
  let raw;
  try {
    raw = await readFile(storePath(), "utf8");
  } catch {
    return []; // no store yet
  }
  const rows = raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
  return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
}

async function jsonlMarkEmailed(id, at) {
  const path = storePath();
  const rows = await jsonlList(Infinity);
  const updated = rows.map((row) => (row.id === id ? { ...row, emailed_at: at } : row));
  await writeFile(
    path,
    updated.map((row) => JSON.stringify(row)).join("\n") + (updated.length ? "\n" : ""),
    "utf8",
  );
  return at;
}

// ── Supabase backend (production) ───────────────────────────────────────────

function supabaseHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

// Writes go to the pre-existing `leads` table (status/lead_score/source
// workflow, added 2026-09-02) rather than a bespoke enquiries table, so the
// contact form feeds the same pipeline any future lead-scoring/CRM work
// already assumes. `source` is fixed to "contact-form" so leads originating
// elsewhere (e.g. an Explee-driven outbound flow) stay distinguishable.
const LEADS_TABLE = "leads";

async function supabaseRecord(record) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${LEADS_TABLE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "return=representation" }),
    body: JSON.stringify({
      id: record.id,
      name: record.name,
      company: record.company ?? "",
      email: record.email,
      phone: record.phone ?? "",
      service: record.service ?? "",
      message: record.message ?? "",
      ip: record.ip,
      user_agent: record.userAgent,
      status: "new",
      source: "contact-form",
      created_at: record.created_at,
      emailed_at: record.emailed_at,
    }),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
  return record;
}

function fromSupabaseRow(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    service: row.service,
    message: row.message,
    ip: row.ip,
    userAgent: row.user_agent,
    created_at: row.created_at,
    emailed_at: row.emailed_at,
    status: row.status,
    leadScore: row.lead_score,
  };
}

async function supabaseList(limit) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const cap = Number.isFinite(limit) ? limit : 1000;
  const url =
    `${base}/rest/v1/${LEADS_TABLE}?select=*&source=eq.contact-form` +
    `&order=created_at.desc&limit=${cap}`;
  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.map(fromSupabaseRow);
}

async function supabaseMarkEmailed(id, at) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${LEADS_TABLE}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: supabaseHeaders(),
    body: JSON.stringify({ emailed_at: at }),
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
  return at;
}

// ── public API (backend-agnostic) ───────────────────────────────────────────

/**
 * Where enquiry notifications are delivered. `CONTACT_INBOX_EMAIL` is the
 * intended setting; `ADMIN_EMAIL` is accepted as a fallback. Each candidate is
 * trimmed before the emptiness check, so a blank or whitespace-only
 * CONTACT_INBOX_EMAIL falls through to ADMIN_EMAIL instead of silently
 * resolving to "no inbox configured".
 */
export function resolveInboxEmail() {
  for (const key of ["CONTACT_INBOX_EMAIL", "ADMIN_EMAIL"]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Append one enquiry record and return it. */
export async function recordEnquiry(input) {
  const record = {
    id: randomUUID(),
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone ?? null,
    service: input.service,
    message: input.message ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    created_at: new Date().toISOString(),
    emailed_at: null,
  };
  return supabaseConfigured() ? supabaseRecord(record) : jsonlRecord(record);
}

/** Mark a stored enquiry as notified. */
export async function markEnquiryEmailed(id, at = new Date().toISOString()) {
  return supabaseConfigured() ? supabaseMarkEmailed(id, at) : jsonlMarkEmailed(id, at);
}

/** Read stored enquiries, newest first. `limit` defaults to 50. */
export async function listEnquiries(limit = 50) {
  return supabaseConfigured() ? supabaseList(limit) : jsonlList(limit);
}

export function enquirySubject(enquiry) {
  return `New enquiry — ${enquiry.service} — ${enquiry.name}`;
}

export function enquiryBody(enquiry) {
  return [
    "New enquiry from the dutaintegra.my contact form.",
    "",
    `Name:    ${enquiry.name}`,
    `Company: ${enquiry.company || "—"}`,
    `Email:   ${enquiry.email}`,
    `Phone:   ${enquiry.phone || "—"}`,
    `Service: ${enquiry.service}`,
    "",
    "Message:",
    enquiry.message || "—",
    "",
    `Received: ${enquiry.created_at}`,
  ].join("\n");
}

/**
 * Deliver the notification through whichever provider is configured.
 * Returns true on success. Returns false (without throwing) when no inbox or
 * no provider is configured, so the enquiry is still stored and the prospect
 * still sees success. Throws only on a genuine provider failure.
 */
export async function notifyEnquiry(enquiry) {
  const to = resolveInboxEmail();
  if (!to) return false;

  const from = process.env.EMAIL_FROM?.trim();
  const subject = enquirySubject(enquiry);
  const text = enquiryBody(enquiry);

  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, from, subject, text }, process.env.RESEND_API_KEY);
  } else if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to, from, subject, text }, process.env.BREVO_API_KEY);
  } else if (process.env.POSTMARK_SERVER_TOKEN) {
    await sendViaPostmark({ to, from, subject, text }, process.env.POSTMARK_SERVER_TOKEN);
  } else {
    return false; // no provider configured — stored only
  }

  await markEnquiryEmailed(enquiry.id);
  return true;
}

async function assertOk(res, provider) {
  if (!res.ok) {
    throw new Error(`${provider} responded ${res.status}: ${await res.text()}`);
  }
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
    body: JSON.stringify({
      From: from || "no-reply@dutaintegrasolutions.com",
      To: to,
      Subject: subject,
      TextBody: text,
    }),
  });
  await assertOk(res, "postmark");
}
