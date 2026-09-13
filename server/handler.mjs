import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

import { listEnquiries, notifyEnquiry, recordEnquiry, resolveInboxEmail } from "./enquiries.mjs";
import { timingSafeEqual } from "node:crypto";

/**
 * Request handler for dutaintegra.my.
 *
 * Serves the static marketing site from Web/ and implements the lead-capture
 * endpoint POST /api/send-email that Web/index.html and Web/contact.html call.
 *
 * Dependency-free on purpose: this replaces a Next.js API route that used to
 * live in the (removed) Leish application. Node >= 22 only.
 */

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const MAX_BODY_BYTES = 32 * 1024;

// ── validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value, { required = false, max, label }) {
  if (value === undefined || value === null || value === "") {
    return required ? { error: `${label} is required` } : { value: null };
  }
  if (typeof value !== "string") return { error: `${label} must be text` };
  const trimmed = value.trim();
  if (max && trimmed.length > max) return { error: `${label} is too long` };
  if (required && !trimmed) return { error: `${label} is required` };
  return { value: trimmed || null };
}

/** Returns { value } or { error }. Mirrors the zod schema it replaced. */
export function validateEnquiry(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Invalid payload" };
  }

  const name = str(body.name, { required: true, max: 120, label: "Name" });
  if (name.error) return name;

  const company = str(body.company, { max: 160, label: "Company" });
  if (company.error) return company;

  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
    return { error: "A valid email is required" };
  }
  const email = body.email.trim().toLowerCase();
  if (email.length > 200) return { error: "A valid email is required" };

  const phone = str(body.phone, { max: 40, label: "Phone" });
  if (phone.error) return phone;

  const service = str(body.service, { required: true, max: 120, label: "Service" });
  if (service.error) return service;

  const message = str(body.message, { max: 5000, label: "Message" });
  if (message.error) return message;

  return {
    value: {
      name: name.value,
      company: company.value,
      email,
      phone: phone.value,
      service: service.value,
      message: message.value,
    },
  };
}

// ── rate limiting ───────────────────────────────────────────────────────────

const WINDOW_MS = 60_000;
const LIMIT_PER_WINDOW = 5;
const hits = new Map();

/** Sliding-window counter per key. Exported for tests. */
export function rateLimit(key, now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= LIMIT_PER_WINDOW) {
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}

export function resetRateLimit() {
  hits.clear();
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** CORS headers for the marketing-site origin when it is explicitly allowed. */
export function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) return {};
  if (!allowedOrigins().includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

/** Origin check for state-changing requests. Returns an error status or null. */
export function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null; // same-origin navigation / server-to-server
  if (allowedOrigins().includes(origin)) return null;
  return { status: 403, body: { error: "Invalid origin" } };
}

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return { error: { status: 413, body: { error: "Payload too large" } } };
    chunks.push(chunk);
  }
  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON body" } } };
  }
}

// ── static files ────────────────────────────────────────────────────────────

export function webRoot() {
  return resolve(process.env.WEB_ROOT || join(process.cwd(), "Web"));
}

/** Resolve a URL path to a file inside the web root, or null if outside. */
export function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const absolute = resolve(join(webRoot(), normalize(relative)));
  const root = webRoot();
  if (absolute !== root && !absolute.startsWith(root + sep)) return null; // traversal
  return absolute;
}

async function serveStatic(req, res, urlPath) {
  const filePath = resolveStaticPath(urlPath);
  if (!filePath) {
    send(res, 400, { error: "Bad path" });
    return;
  }
  let info;
  try {
    info = await stat(filePath);
  } catch {
    send(res, 404, { error: "Not found" });
    return;
  }
  if (info.isDirectory()) return serveStatic(req, res, `${urlPath.replace(/\/$/, "")}/index.html`);

  res.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": info.size,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
  createReadStream(filePath).pipe(res);
}

// ── routes ──────────────────────────────────────────────────────────────────

async function handleSendEmail(req, res) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed" }, headers);
    return;
  }

  const blocked = checkOrigin(req);
  if (blocked) return send(res, blocked.status, blocked.body, headers);

  const limited = rateLimit(`enquiry:${clientIp(req)}`);
  if (!limited.allowed) {
    return send(
      res,
      429,
      { error: "Too many attempts. Please try again later." },
      { ...headers, "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)) },
    );
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return send(res, parsed.error.status, parsed.error.body, headers);

  const valid = validateEnquiry(parsed.data);
  if (valid.error) return send(res, 400, { error: valid.error }, headers);

  // Persist first — a lead must never be lost to a mail-provider outage.
  const enquiry = await recordEnquiry({
    ...valid.value,
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] ?? "").slice(0, 400) || null,
  });

  let delivered = false;
  try {
    delivered = await notifyEnquiry(enquiry);
  } catch (err) {
    console.error(`[enquiry ${enquiry.id}] stored but notification failed: ${err.message}`);
  }

  if (!delivered && !resolveInboxEmail()) {
    console.warn(`[enquiry ${enquiry.id}] no CONTACT_INBOX_EMAIL configured — stored only`);
  }
  console.log(`[enquiry ${enquiry.id}] received service="${enquiry.service}" delivered=${delivered}`);

  send(res, 200, { success: true, delivered }, headers);
}

// ── admin: view stored enquiries ────────────────────────────────────────────

/** Constant-time token comparison; false when no token is configured. */
export function adminTokenValid(supplied) {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function enquiriesHtml(rows) {
  const body = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${escapeHtml(r.created_at)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.company) || "—"}</td>
      <td><a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a></td>
      <td>${escapeHtml(r.phone) || "—"}</td>
      <td>${escapeHtml(r.service)}</td>
      <td>${escapeHtml(r.message) || "—"}</td>
      <td>${r.emailed_at ? "sent" : "not sent"}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="8">No enquiries yet.</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Enquiries — Duta Integra</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:2rem;color:#1c1917}
 h1{font-size:1.25rem} table{border-collapse:collapse;width:100%}
 th,td{border-bottom:1px solid #e7e5e4;padding:.5rem .6rem;text-align:left;vertical-align:top}
 th{background:#f5f5f4;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
 td:nth-child(7){max-width:26rem}
</style></head><body>
<h1>Inbound enquiries <small>(${rows.length})</small></h1>
<table><thead><tr><th>Received</th><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Service</th><th>Message</th><th>Notification</th></tr></thead>
<tbody>${body}</tbody></table>
</body></html>`;
}

async function handleAdminEnquiries(req, res) {
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;
  const supplied = req.headers["x-admin-token"] ?? query.get("token");
  if (!adminTokenValid(supplied)) {
    return send(res, 401, { error: "Unauthorized" });
  }
  const rows = await listEnquiries(200);
  if ((req.headers.accept ?? "").includes("text/html")) {
    const html = enquiriesHtml(rows);
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    });
    res.end(html);
    return;
  }
  send(res, 200, { count: rows.length, enquiries: rows });
}


// ── tier-recommendation quiz ────────────────────────────────────────────
// Score-based tier recommendation (Foundation / Growth / AI Partner)
// Adapted from the Explee 7-step lead-gen playbook.

function scoreQuiz(body) {
  let score = 0;
  const teamSize = Number(body.teamSize) || 0;
  const itSpend = Number(body.itSpend) || 0;
  const painPoints = Array.isArray(body.painPoints) ? body.painPoints : [];

  if (teamSize <= 5) score += 10;
  else if (teamSize <= 20) score += 20;
  else score += 30;

  if (itSpend < 5000) score += 10;
  else if (itSpend < 20000) score += 20;
  else score += 30;

  if (painPoints.includes("manual_work")) score += 15;
  if (painPoints.includes("scaling")) score += 15;
  if (painPoints.includes("security")) score += 15;
  if (painPoints.includes("ai_automation")) score += 20;
  return score;
}

async function handleQuiz(req, res) {
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const body = parsed.data;

    if (!body.teamSize || !body.itSpend || !Array.isArray(body.painPoints))
      return send(res, 400, { error: "Missing teamSize, itSpend, or painPoints" });

    const score = scoreQuiz(body);
    let tier, description, nextStep;

    if (score < 35) {
      tier = "Foundation";
      description = "Managed IT support for established operations — proactive monitoring, fast response, predictable billing.";
      nextStep = "Book a 30-minute audit call to see what Foundation covers for your team.";
    } else if (score < 60) {
      tier = "Growth";
      description = "Scaled managed IT plus dedicated account management — SLAs, priority response, monthly health reports.";
      nextStep = "Schedule a Growth assessment — we map your current stack and recommend the exact tier.";
    } else {
      tier = "AI Partner";
      description = "Full AI-first partnership — custom automation, workflow design, and strategic AI roadmapping.";
      nextStep = "Let us build a custom AI roadmap for your team — we start with a discovery workshop.";
    }
    return send(res, 200, { tier, score, description, nextStep });
  } catch (err) {
    console.error("[server] quiz error:", err);
    return send(res, 500, { error: "Quiz scoring failed. Please try again." });
  }
}

export async function handle(req, res) {
  const urlPath = req.url ?? "/";
  // Route on the pathname so query strings (e.g. ?token=) still reach handlers.
  const pathname = new URL(urlPath, "http://localhost").pathname;
  try {
    if (pathname === "/api/send-email") return await handleSendEmail(req, res);
    if (pathname === "/admin/enquiries") return await handleAdminEnquiries(req, res);
    if (pathname === "/api/quiz") return await handleQuiz(req, res);
    if (pathname === "/api/health") {
      return send(res, 200, { ok: true, inboxConfigured: Boolean(resolveInboxEmail()) });
    }
    if (pathname.startsWith("/api/")) return send(res, 404, { error: "Not found" });
    return await serveStatic(req, res, urlPath);
  } catch (err) {
    console.error("[server] unhandled error:", err);
    if (!res.headersSent) send(res, 500, { error: "Something went wrong. Please try again." });
    else res.end();
  }
}
