// api/send-email.js — enterprise-hardened contact pipeline
// Single transactional entry point: validates -> emails -> persists lead -> notifies Slack
// Uses lib/* for config, validation, and observability.

import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { json, corsResponse, getAllowedOrigin } from "../lib/cors.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import { sanitizeHTML, validateContactPayload } from "../lib/validate.js";
import { postToSlack } from "../lib/slack.js";
import { sendAdminNotification, sendAutoreply } from "../lib/email.js";
import { getSupabase } from "../lib/supabase.js";
import { scoreLead } from "./_scoring.js";

const checkRateLimit = createRateLimiter({
  maxRequests: config.contactRateMax,
  windowMs: config.contactRateWindow,
  keyPrefix: "contact",
});

async function verifyTurnstile(token, remoteip) {
  if (!config.turnstileSecret) return { success: true };
  if (!token) return { success: false, "error-codes": ["missing-input"] };
  const params = new URLSearchParams();
  params.append("secret", config.turnstileSecret);
  params.append("response", token);
  if (remoteip) params.append("remoteip", remoteip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    });
    return await res.json();
  } catch (err) {
    logger.error("Turnstile verification error", { error: err?.message });
    return { success: false, "error-codes": ["verification-failed"] };
  }
}

async function notifySlack({ name, company, email, phone, service, message }) {
  const text = [
    ":inbox_tray: *New Lead — dutaintegra.my*",
    `*Name:* ${sanitizeHTML(name || "—")}`,
    company ? `*Company:* ${sanitizeHTML(company)}` : null,
    `*Email:* ${sanitizeHTML(email || "—")}`,
    phone ? `*Phone:* ${sanitizeHTML(phone)}` : null,
    service ? `*Service:* ${sanitizeHTML(service)}` : null,
    message ? `*Message:* ${sanitizeHTML(String(message).slice(0, 300))}` : null,
  ].filter(Boolean).join("\n");
  // fire-and-forget with retry inside postToSlack; never throw
  postToSlack(text, { username: "Duta Integra Leads", icon_emoji: ":inbox_tray:" }).catch(() => {});
}

async function readFields(request) {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    let obj = {};
    try { obj = await request.json(); } catch { obj = {}; }
    return { get: (k) => (obj[k] == null ? null : String(obj[k])), raw: obj };
  }
  const form = await request.formData();
  return { get: (k) => form.get(k), raw: null };
}

async function handler(request) {
  const log = logger.withRequest(request);

  if (request.method === "OPTIONS") return corsResponse(request);
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, request);

  // strict origin check — exact match via config
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = getAllowedOrigin(request);
  // if the browser sent an Origin and it doesn't match allowed, reject
  if (origin && origin !== allowedOrigin && !config.allowedOrigins.includes(origin)) {
    log.warn("blocked origin", { origin, allowed: config.allowedOrigins });
    return json({ ok: false, error: "Forbidden: Invalid origin" }, 403, request);
  }

  let fields;
  try { fields = await readFields(request); } catch {
    return json({ ok: false, error: "Invalid request body" }, 400, request);
  }

  // Honeypot — support legacy field names
  const honeypotKeys = [config.honeypotField, "website", "website-bot", "hp"];
  const honeypotVal = honeypotKeys.map((k) => String(fields.get(k) || "").trim()).find(Boolean);
  if (honeypotVal) {
    log.info("honeypot triggered", { field: honeypotKeys.find((k) => String(fields.get(k) || "").trim()) });
    // pretend success to not tip off bots
    return json({ ok: true, message: "Received" }, 200, request);
  }

  // Turnstile
  const turnstileToken = String(fields.get("cf-turnstile-response") || "").trim();
  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const turnstileResult = await verifyTurnstile(turnstileToken, clientIp);
  if (!turnstileResult.success) {
    log.warn("Turnstile failed", { codes: turnstileResult["error-codes"] });
    return json({ ok: false, error: "Security check failed. Please try again." }, 403, request);
  }

  if (!checkRateLimit(request)) {
    return json({ ok: false, error: "Rate limit exceeded. Please try again later." }, 429, request);
  }

  const rawPayload = {
    name: String(fields.get("name") || "").trim(),
    company: String(fields.get("company") || "").trim(),
    email: String(fields.get("email") || "").trim(),
    phone: String(fields.get("phone") || "").trim(),
    service: String(fields.get("service") || "").trim(),
    message: String(fields.get("message") || "").trim(),
  };
  const { values, errors, valid } = validateContactPayload(rawPayload);
  if (!valid) {
    return json({ ok: false, error: errors[0] }, 400, request);
  }
  const { name, company, email, phone, service, message } = values;
  const source = String(fields.get("source") || "contact-form").trim() || "contact-form";

  // Enforce RESEND configured
  if (!config.resendApiKey) {
    log.error("RESEND_API_KEY missing");
    return json({ ok: false, error: "Email service not configured" }, 503, request);
  }

  // Attempt email delivery + lead persistence atomically (email failure still persists lead)
  let emailSent = false;
  try {
    // 1) admin notification (correct SDK: Resend via lib/email)
    await sendAdminNotification({ name, company, email, phone, service, message });
    emailSent = true;
    // 2) fire-and-forget Slack (non-blocking)
    notifySlack({ name, company, email, phone, service, message });
    // 3) autoreply (non-critical)
    if (config.emailAutoreply) {
      sendAutoreply(email, { name, message }).catch((e) => log.warn("autoreply failed", { error: e?.message }));
    }
  } catch (emailErr) {
    log.error("sendAdminNotification failed", { error: emailErr?.message });
    // continue to persist lead even if email failed — lead is not lost
  }

  // 4) Persist lead with scoring (autonomous routing)
  try {
    const supabase = getSupabase();
    const scored = scoreLead({ source, service, message, company });
    const { error } = await supabase.from("leads").insert({
      name, email, phone, company, service, message,
      status: "new",
      source,
      lead_score: scored.lead_score,
      assigned_role: scored.assigned_role,
    });
    if (error) log.error("lead persist failed", { error: error.message });
    else log.info("lead persisted", { email, lead_score: scored.lead_score, assigned_role: scored.assigned_role });
  } catch (dbErr) {
    log.error("lead insert threw", { error: dbErr?.message });
  }

  // 5) Event log (best-effort)
  try {
    const supabase = getSupabase();
    await supabase.from("events").insert({ type: "lead_created", path: "/contact", meta: { service, source, email } });
  } catch {}

  if (!emailSent) {
    return json({ ok: false, error: "Failed to send email — lead was saved, we will follow up." }, 502, request);
  }
  return json({ ok: true, success: true, message: "Email sent successfully" }, 200, request);
}

export { handler as GET, handler as POST };
