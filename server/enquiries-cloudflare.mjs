/**
 * Enquiry persistence and notification — Supabase only (Cloudflare compatible).
 * 
 * No JSONL fallback — Cloudflare Pages Functions have no durable local filesystem.
 * All writes go to Supabase Postgres via REST API.
 */

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function supabaseHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

// Writes go to the pre-existing `leads` table (status/lead_score/source workflow)
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

const { randomUUID } = crypto;

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
  if (!supabaseConfigured()) {
    // Degrade loudly, don't lose the lead: the caller still emails the inbox.
    console.error("[enquiries] SUPABASE_URL/SERVICE_ROLE_KEY not configured — enquiry NOT persisted, email-only path");
    return record;
  }
  return supabaseRecord(record);
}

/** Mark a stored enquiry as notified. */
export async function markEnquiryEmailed(id, at = new Date().toISOString()) {
  if (!supabaseConfigured()) {
    console.warn(`[enquiries] SUPABASE not configured — emailed_at not recorded for ${id}`);
    return at;
  }
  return supabaseMarkEmailed(id, at);
}

/** Read stored enquiries, newest first. `limit` defaults to 50. */
export async function listEnquiries(limit = 50) {
  if (!supabaseConfigured()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return supabaseList(limit);
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

export function resolveInboxEmail() {
  for (const key of ["CONTACT_INBOX_EMAIL", "ADMIN_EMAIL"]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Deliver the notification through whichever provider is configured. */
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

export async function sendMail({ to, from, subject, text }) {
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

export async function notifyEnquirer(enquiry) {
  if (!enquiry?.email) return false;

  const from = process.env.EMAIL_FROM?.trim();
  const subject = "We received your enquiry — Duta Integra";
  const text = [
    `Hi ${enquiry.name || "there"},`,
    "",
    `Thanks for reaching out to Duta Integra. We've received your enquiry about "${enquiry.service}" and a member of our team will get back to you within 1 business day.`,
    "",
    "For urgent matters, reply to this email or contact us directly.",
    "",
    "— Duta Integra Solutions",
    "https://dutaintegra.my",
  ].join("\\n");

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend({ to: enquiry.email, from, subject, text }, process.env.RESEND_API_KEY);
    } else if (process.env.BREVO_API_KEY) {
      await sendViaBrevo({ to: enquiry.email, from, subject, text }, process.env.BREVO_API_KEY);
    } else if (process.env.POSTMARK_SERVER_TOKEN) {
      await sendViaPostmark({ to: enquiry.email, from, subject, text }, process.env.POSTMARK_SERVER_TOKEN);
    } else {
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[enquiry ${enquiry.id}] auto-reply failed: ${err.message}`);
    return false;
  }
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