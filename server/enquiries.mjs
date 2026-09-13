import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Enquiry persistence and notification.
 *
 * Storage is a newline-delimited JSON file (default ./data/enquiries.jsonl).
 * Deliberately dependency-free and append-only: a lead must survive a restart,
 * a crash mid-request, or a mail-provider outage.
 *
 * The row is ALWAYS written before the notification is attempted.
 */

// Resolved relative to this file, NOT process.cwd() — enquiries must land in
// the project's data/ directory however the server is launched.
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STORE = join(PROJECT_ROOT, "data", "enquiries.jsonl");

export function storePath() {
  return process.env.ENQUIRY_STORE || DEFAULT_STORE;
}

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
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/** Mark a stored enquiry as notified (rewrites the JSONL in place). */
export async function markEnquiryEmailed(id, at = new Date().toISOString()) {
  const path = storePath();
  const rows = await listEnquiries(Infinity);
  const updated = rows.map((row) => (row.id === id ? { ...row, emailed_at: at } : row));
  await writeFile(
    path,
    updated.map((row) => JSON.stringify(row)).join("\n") + (updated.length ? "\n" : ""),
    "utf8",
  );
  return at;
}

/** Read stored enquiries, newest first. `limit` defaults to 50. */
export async function listEnquiries(limit = 50) {
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
