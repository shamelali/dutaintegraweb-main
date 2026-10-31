import { createReadStream } from "node:fs";
import { appendFile, mkdir, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";

import { listEnquiries, notifyEnquiry, notifyEnquirer, recordEnquiry, resolveInboxEmail, sendMail, updateEnquiryStatus } from "./enquiries.mjs";
import { recordTestimonial } from "./testimonials.mjs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { handleStats } from "./stats.mjs";
import { calculateSavings } from "./calculator.mjs";
import { handleFeed, handleConsent, handleIngestEvent, seedDemoEvents } from "./autonomous-ops.mjs";

import {
  handleLogin,
  handleLogout,
  handleMe,
  handlePortalTickets,
  handlePortalTicketById,
  handlePortalHealth,
  handlePortalProposals,
  handlePortalProposalById,
  handlePortalDigests,
  handleAdminClients,
  handleAdminClientDigest,
  requireAdminSession,
} from "./portal.mjs";

import {
  listCaseStudies,
  getCaseStudy,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./cms.mjs";

import {
  handleCatalogEnrich,
  handleCatalogItems,
  handleCatalogItemById,
} from "./catalog.mjs";

import {
  handleAuthSignup,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
} from "./auth.mjs";

import {
  handleComplianceItems,
  handleComplianceItemById,
} from "./compliance.mjs";

import {
  handleCompaniesGet,
  handleCompaniesPatch,
} from "./companies.mjs";

import {
  handleAIChat,
  handleDutaosBrief,
} from "./ai.mjs";

import { handleWorkspaceApi } from "./workspace-cloudflare.mjs";

import { supabaseFetch as sbFetch, supabaseReady, resolveBackend } from "./store.mjs";
import { healthReport } from "./health.mjs";
import { dataFile } from "./paths.mjs";

/**
 * Request handler for dutaintegra.my.
 *
 * Serves the static marketing site from Web/ and implements the lead-capture
 * endpoint POST /api/send-email that Web/index.html and Web/contact.html call.
 *
 * Dependency-free on purpose: no framework, no build step. Node >= 22 only.
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

/**
 * Security headers for responses served by this process.
 *
 * Kept in sync with the `headers` block in vercel.json, which covers the
 * static site served directly by Vercel. Without this, pages served locally
 * run with a different policy than production and CSP problems (a blocked
 * font or script) only surface after deploy.
 *
 * HSTS is deliberately omitted: this server is reached over plain HTTP in
 * development, and the header would make browsers force HTTPS on localhost.
 */
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://va.vercel-scripts.com https://www.googletagmanager.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
    "connect-src 'self' https://va.vercel-scripts.com https://www.google-analytics.com https://cloudflareinsights.com; " +
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
};

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

/**
 * Login gets a tighter budget than the marketing endpoints. The generic
 * 5/min limiter is sized for a contact form; applied to a credential
 * endpoint it still permits thousands of password guesses per IP per day,
 * which is far more than a password reset flow needs to absorb.
 */
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_LIMIT_PER_WINDOW = 5;

const hits = new Map();

/**
 * Sliding-window counter per key. Exported for tests.
 *
 * `limit` and `windowMs` default to the marketing-endpoint budget; auth
 * routes pass their own.
 */
export function rateLimit(key, now = Date.now(), limit = LIMIT_PER_WINDOW, windowMs = WINDOW_MS) {
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}

/** Rate limit for credential endpoints, keyed per IP. */
export function loginRateLimit(ip) {
  return rateLimit(`login:${ip}`, Date.now(), LOGIN_LIMIT_PER_WINDOW, LOGIN_WINDOW_MS);
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
  // Same-origin POST: real browsers always attach Origin to POST fetches,
  // even when the page and API share an origin. Match it against the
  // request's own host so the site works on any domain without env config.
  const host = req.headers.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return null;
  if (allowedOrigins().includes(origin)) return null;
  return { status: 403, body: { error: "Invalid origin" } };
}

/** CSRF token validation — compares cookie token with header token.
 *  Only enforced for cross-origin requests (Origin header present). */
export function validateCsrf(req) {
  // Same-origin requests (no Origin header) don't need CSRF tokens
  if (!req.headers.origin) return true;
  
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
  const cookieToken = cookies.csrf_token;
  const headerToken = req.headers["x-csrf-token"];
  
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  
  // Constant-time comparison
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  return a.length === b.length && timingSafeEqual(a, b);
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
    // SPA fallback: only for HTML requests (browser navigation)
    const accept = req.headers.accept ?? "";
    if (accept.includes("text/html")) {
      const indexPath = resolveStaticPath("/");
      try {
        const indexInfo = await stat(indexPath);
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-length": indexInfo.size,
          ...SECURITY_HEADERS,
        });
        createReadStream(indexPath).pipe(res);
      } catch {
        send(res, 404, { error: "Not found" });
      }
      return;
    }
    send(res, 404, { error: "Not found" });
    return;
  }
  if (info.isDirectory()) return serveStatic(req, res, `${urlPath.replace(/\/$/, "")}/index.html`);

  res.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": info.size,
    ...SECURITY_HEADERS,
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

  // CSRF validation for state-changing requests
  if (!validateCsrf(req)) {
    return send(res, 403, { error: "Invalid CSRF token" }, headers);
  }

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

  // Best-effort auto-reply to the prospect (never blocks the response).
  try {
    await notifyEnquirer(enquiry);
  } catch (err) {
    console.error(`[enquiry ${enquiry.id}] auto-reply failed: ${err.message}`);
  }

  if (!delivered && !resolveInboxEmail()) {
    console.warn(`[enquiry ${enquiry.id}] no CONTACT_INBOX_EMAIL configured — stored only`);
  }
  console.log(`[enquiry ${enquiry.id}] received service="${enquiry.service}" delivered=${delivered}`);

  send(res, 200, { success: true, delivered }, headers);
}

// ── admin: view stored enquiries ────────────────────────────────────────────

/** Constant-time string compare; false unless both sides are non-empty. */
function constantTimeEqual(configured, supplied) {
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Constant-time token comparison; false when no token is configured. */
export function adminTokenValid(supplied) {
  return constantTimeEqual(process.env.ADMIN_TOKEN?.trim(), supplied);
}

/**
 * Token check for the cron-triggered digest route.
 *
 * Fails closed: with no DIGEST_TOKEN configured the route is refused rather
 * than left open. This route aggregates and returns stored lead data, so an
 * unset variable must not silently publish it — ADMIN_TOKEN already behaves
 * this way.
 */
export function digestTokenValid(supplied) {
  return constantTimeEqual(process.env.DIGEST_TOKEN?.trim(), supplied);
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
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });
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

// ── proposals (lightweight) ────────────────────────────────────────────────

async function writeAuditLog({ actorType, actorId, actorEmail, action, entityType, entityId, before, after, metadata }) {
  if (!supabaseReady()) return;
  try {
    await sbFetch("audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_type: actorType,
        actor_id: actorId,
        actor_email: actorEmail,
        action,
        entity_type: entityType,
        entity_id: entityId,
        before: before ?? null,
        after: after ?? null,
        metadata: metadata ?? {},
      }),
    });
  } catch (err) {
    console.error("[audit] write failed:", err.message);
  }
}

async function handleAdminProposalsPage(req, res) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });
  const token = auth.session ? "session" : auth.client.role; // fallback for template
  const qLeadId = new URL(req.url ?? "/", "http://localhost").searchParams.get("leadId") || "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Proposals — Duta Integra</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:2rem;color:#1c1917;max-width:42rem}
 h1{font-size:1.25rem;margin-bottom:1rem}
 label{display:block;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;margin:.75rem 0 .25rem;color:#57534e}
 input,textarea{width:100%;padding:.5rem .6rem;border:1px solid #d6d3d1;border-radius:.375rem;font:inherit}
 textarea{min-height:5rem;resize:vertical}
 button{margin-top:1rem;padding:.6rem 1.2rem;background:#2563eb;color:#fff;border:0;border-radius:.375rem;font:inherit;cursor:pointer}
 button:disabled{opacity:.6}
 #result{margin-top:1rem;padding:.75rem;border-radius:.375rem;background:#f0fdf4;border:1px solid #bbf7d0;display:none}
 #result a{word-break:break-all}
 #err{margin-top:1rem;padding:.75rem;border-radius:.375rem;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;display:none}
</style>
</head><body>
<h1>Create proposal</h1>
<form id="f">
  <label>Title</label><input name="title" required maxlength="180" />
  <label>Summary</label><textarea name="summary" required maxlength="5000"></textarea>
  <label>Scope (one per line)</label><textarea name="scope" placeholder="Discovery&#10;Build&#10;Deploy"></textarea>
  <label>Amount (MYR)</label><input name="amountMyr" type="number" min="0" step="0.01" required />
  <label>Valid until (YYYY-MM-DD, optional)</label><input name="validUntil" pattern="\\d{4}-\\d{2}-\\d{2}" />
  <label>Lead ID (optional)</label><input name="leadId" value="${escapeHtml(qLeadId)}" />
  <button type="submit" id="btn">Create &amp; get link</button>
</form>
<div id="result"></div>
<div id="err"></div>
<script>
const token = ${JSON.stringify(token)};
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const scope = String(fd.get('scope')||'').split('\\n').map(s=>s.trim()).filter(Boolean);
  const body = {
    title: fd.get('title'),
    summary: fd.get('summary'),
    scope,
    amountMyr: Number(fd.get('amountMyr')),
    validUntil: fd.get('validUntil') || null,
    leadId: fd.get('leadId') || null,
  };
  const btn = document.getElementById('btn');
  btn.disabled = true;
  document.getElementById('result').style.display = 'none';
  document.getElementById('err').style.display = 'none';
  try {
    const r = await fetch('/admin/proposals?token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    const link = location.origin + '/proposal/' + data.proposal.id;
    const res = document.getElementById('result');
    res.style.display = 'block';
    res.innerHTML = 'Created. Share this link: <a href="' + link + '">' + link + '</a>';
  } catch (err) {
    const e2 = document.getElementById('err');
    e2.style.display = 'block';
    e2.textContent = err && err.message ? err.message : 'Failed';
  } finally {
    btn.disabled = false;
  }
});
</script>
</body></html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
  res.end(html);
}

const PIPELINE_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "closed"];

function ageDays(created) {
  const t = Date.parse(created);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function normalizeLead(row) {
  return { ...row, status: row.status || "new" };
}

function pipelineHtml(rows, token) {
  const leads = rows.map(normalizeLead);
  const byStatus = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, []]));
  for (const l of leads) {
    if (byStatus[l.status]) byStatus[l.status].push(l);
    else {
      byStatus.new = byStatus.new || [];
      byStatus.new.push(l);
    }
  }
  // newest first within each column
  for (const s of PIPELINE_STATUSES) {
    byStatus[s].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  const colHtml = PIPELINE_STATUSES.map((status) => {
    const cards = byStatus[status].map((l) => {
      const age = ageDays(l.created_at);
      const stale = (status === "new" || status === "contacted") && age > 3;
      const staleClass = stale ? ' style="border-color:#dc2626;background:#fef2f2"' : "";
      const proposalLink = `/admin/proposals?token=${encodeURIComponent(token)}&leadId=${encodeURIComponent(l.id)}`;
      const waPhone = String(l.phone || "").replace(/[^0-9]/g, "");
      const waLink = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent("Hi " + (l.name || "") + ", following up on your enquiry about " + (l.service || "") + ".")}` : "";
      const opts = PIPELINE_STATUSES.map((s) => `<option value="${s}"${s === l.status ? " selected" : ""}>${s}</option>`).join("");
      const score = l.leadScore !== undefined && l.leadScore !== null ? ` · Score: ${l.leadScore}` : "";
      const ind = l.industry ? ` · ${escapeHtml(l.industry)}` : "";
      return `<div class="card"${staleClass}>
        <div class="name">${escapeHtml(l.name || "—")}</div>
        <div class="meta">${escapeHtml(l.company) || "—"} · ${escapeHtml(l.service) || "—"}${ind}</div>
        <div class="meta age">Age: ${age}d${stale ? " · STALE" : ""}${score}</div>
        ${l.note ? `<div class="meta note">Note: ${escapeHtml(l.note)}</div>` : ""}
        <div class="actions">
          <select data-id="${escapeHtml(l.id)}" onchange="moveStatus(this)">${opts}</select>
          <a href="${proposalLink}">Create proposal</a>
          ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        </div>
      </div>`;
    }).join("");
    return `<div class="col">
      <h2>${status} <small>(${byStatus[status].length})</small></h2>
      <div class="cards">${cards || '<div class="empty">—</div>'}</div>
    </div>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Leads pipeline — Duta Integra</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:1.5rem;color:#1c1917}
 h1{font-size:1.25rem;margin-bottom:1rem}
 .board{display:grid;grid-template-columns:repeat(6,minmax(180px,1fr));gap:1rem;overflow-x:auto}
 .col{background:#f5f5f4;border-radius:.5rem;padding:.75rem;min-height:12rem}
 .col h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .5rem;color:#57534e}
 .card{background:#fff;border:1px solid #e7e5e4;border-radius:.375rem;padding:.6rem;margin-bottom:.5rem}
 .name{font-weight:600;margin-bottom:.25rem}
 .meta{font-size:.75rem;color:#57534e}
 .age{margin:.25rem 0}
 .actions{display:flex;gap:.5rem;align-items:center;margin-top:.5rem;flex-wrap:wrap}
 .actions select{font-size:.75rem;padding:.2rem .3rem}
 .actions a{font-size:.75rem;color:#2563eb;text-decoration:none}
 .empty{color:#a8a29e;font-size:.75rem;text-align:center;padding:1rem 0}
</style></head><body>
<h1>Leads pipeline <small>(${leads.length})</small> <a href="/admin/pipeline?token=${encodeURIComponent(token)}&format=csv" style="font-size:.8rem;font-weight:400;margin-left:1rem">Export CSV</a></h1>
<div class="board">${colHtml}</div>
<script>
const token = ${JSON.stringify(token)};
async function moveStatus(sel) {
  const id = sel.getAttribute('data-id');
  const status = sel.value;
  try {
    const r = await fetch('/admin/leads/' + encodeURIComponent(id) + '?token=' + encodeURIComponent(token), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) { const d = await r.json().catch(()=>({})); alert(d.error || 'Failed to move'); return; }
    location.reload();
  } catch (e) { alert('Failed to move'); }
}
</script>
</body></html>`;
}

async function handleAdminPipelinePage(req, res) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });
  const token = auth.session ? "session" : auth.client.role;
  const rows = (await listEnquiries(500)).map(normalizeLead);
  console.log(`[pipeline] view leads=${rows.length} by=${auth.session ? "session" : "token"}`);
  const format = new URL(req.url ?? "/", "http://localhost").searchParams.get("format");
  if (format === "csv") {
    const header = ["id", "name", "company", "email", "phone", "service", "status", "age_days", "created_at", "note"];
    const csvRows = [header.join(",")].concat(rows.map((l) => [
      l.id, l.name, l.company, l.email, l.phone, l.service, l.status, ageDays(l.created_at), l.created_at, l.note,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")));
    res.writeHead(200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=leads.csv",
      "cache-control": "no-store",
    });
    res.end(csvRows.join("\n"));
    return;
  }
  if ((req.headers.accept ?? "").includes("text/html")) {
    const html = pipelineHtml(rows, token);
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    });
    res.end(html);
    return;
  }
  const byStatus = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, []]));
  for (const l of rows) {
    if (byStatus[l.status]) byStatus[l.status].push(l);
    else byStatus.new.push(l);
  }
  send(res, 200, { count: rows.length, leads: rows, enquiries: rows, items: rows, byStatus });
}

const ALLOWED_LEAD_STATUSES = new Set(PIPELINE_STATUSES);

async function handleAdminLeadStatus(req, res, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });

  // Fetch current lead for audit log
  let before = null;
  if (supabaseReady()) {
    const r = await sbFetch(`leads?id=eq.${encodeURIComponent(id)}&select=*`);
    if (r.ok) {
      const rows = await r.json();
      before = rows[0] || null;
    }
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
  const status = String(parsed.data?.status || parsed.data?.newStatus || parsed.data?.state || "").trim();
  const note = parsed.data?.note;
  const assignedRole = parsed.data?.assignedRole || parsed.data?.assigned_role;
  if (status && !ALLOWED_LEAD_STATUSES.has(status)) {
    return send(res, 400, { error: "invalid status" });
  }
  if (!status && note === undefined && assignedRole === undefined) {
    return send(res, 400, { error: "status, note, or assignedRole required" });
  }
  try {
    const updated = await updateEnquiryStatus(id, status || null, note, assignedRole);
    console.log(`[pipeline] lead=${id} status=${status || "-"} note=${note !== undefined} assignedRole=${assignedRole || "-"}`);
    if (!updated) return send(res, 404, { error: "Not found" });
    const norm = normalizeLead(updated);

    // Write audit log
    const actorEmail = auth.client?.email || auth.session ? "session" : "token";
    await writeAuditLog({
      actorType: auth.session ? "admin" : "system",
      actorId: auth.client?.id || null,
      actorEmail,
      action: "lead.status.change",
      entityType: "lead",
      entityId: id,
      before: before ? { status: before.status, note: before.note, assigned_role: before.assigned_role } : null,
      after: { status: norm.status, note: norm.note, assigned_role: norm.assignedRole || norm.assigned_role },
      metadata: { changedBy: actorEmail },
    });

    send(res, 200, { ok: true, lead: norm, enquiry: norm });
  } catch (err) {
    send(res, 502, { error: `db error: ${err.message}` });
  }
}

async function handleAdminCreateProposal(req, res) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });
  if (!supabaseReady()) return send(res, 503, { error: "Supabase not configured" });

  const parsed = await readJsonBody(req);
  if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
  const b = parsed.data || {};
  const title = String(b.title || "").trim();
  const summary = String(b.summary || "").trim();
  const amount = Number(b.amountMyr);
  if (!title || !summary || !Number.isFinite(amount) || amount < 0) {
    return send(res, 400, { error: "title, summary and a non-negative amountMyr are required" });
  }
  const scope = Array.isArray(b.scope) ? b.scope.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];
  const validUntil = b.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(b.validUntil) ? b.validUntil : null;
  const row = {
    id: randomUUID(),
    lead_id: b.leadId || null,
    title,
    summary,
    scope,
    amount_myr: amount,
    valid_until: validUntil,
    status: "sent",
    created_by: "admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const r = await sbFetch("workspace_proposals", { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=representation" } });
  if (!r.ok) return send(res, 502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  const proposal = rows[0] || row;

  // Best-effort auto-email the proposal link to the linked lead.
  if (b.leadId && supabaseReady()) {
    try {
      const lr = await sbFetch(`workspace_leads?id=eq.${encodeURIComponent(b.leadId)}&select=email,name`);
      if (lr.ok) {
        const leads = await lr.json();
        const lead = leads[0];
        if (lead?.email) {
          const link = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host || "dutaintegra.my"}/proposal/${proposal.id}`;
          await sendMail({
            to: lead.email,
            from: process.env.EMAIL_FROM?.trim(),
            subject: `Your proposal from Duta Integra — ${proposal.title}`,
            text: `Hi ${lead.name || "there"},\\n\\nWe've prepared a proposal for you: ${proposal.title}\\nAmount: RM ${proposal.amount_myr}\\n\\nView and accept it here: ${link}\\n\\n— Duta Integra`,
          });
        }
      }
    } catch (err) {
      console.error(`[proposal ${proposal.id}] auto-email failed: ${err.message}`);
    }
  }

  // Write audit log
  const actorEmail = auth.client?.email || auth.session ? "session" : "token";
  await writeAuditLog({
    actorType: auth.session ? "admin" : "system",
    actorId: auth.client?.id || null,
    actorEmail,
    action: "proposal.create",
    entityType: "proposal",
    entityId: proposal.id,
    before: null,
    after: { title, summary, scope, amountMyr: amount, validUntil, leadId: b.leadId },
    metadata: { createdBy: actorEmail },
  });

  send(res, 201, { proposal });
}

async function handleGetProposal(req, res, id) {
  if (!supabaseReady()) return send(res, 503, { error: "Supabase not configured" });
  const r = await sbFetch(`workspace_proposals?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!r.ok) return send(res, 502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  const p = rows[0];
  if (!p) return send(res, 404, { error: "Proposal not found" });
  send(res, 200, { proposal: p });
}

async function handleAcceptProposal(req, res, id) {
  if (!supabaseReady()) return send(res, 503, { error: "Supabase not configured" });
  const parsed = await readJsonBody(req);
  const name = parsed.error ? "" : String(parsed.data?.name || "").trim().slice(0, 120);
  const r = await sbFetch(`workspace_proposals?id=eq.${encodeURIComponent(id)}&status=eq.sent`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "accepted",
      decided_by: name || "customer",
      decision_notes: parsed.error ? null : (parsed.data?.notes ? String(parsed.data.notes).slice(0, 2000) : null),
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    headers: { Prefer: "return=representation" },
  });
  if (!r.ok) return send(res, 502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  if (!rows.length) return send(res, 404, { error: "Proposal not found or not in sent state" });
  send(res, 200, { proposal: rows[0] });
}

// ── Case Studies CMS (admin) ────────────────────────────────────────────

async function handleAdminCaseStudies(req, res) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const studies = await listCaseStudies();
    return send(res, 200, { count: studies.length, caseStudies: studies });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const study = await createCaseStudy(parsed.data ?? {});
    return send(res, 201, { caseStudy: study });
  }

  send(res, 405, { error: "Method not allowed" });
}

async function handleAdminCaseStudyById(req, res, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const study = await getCaseStudy(id);
    if (!study) return send(res, 404, { error: "Not found" });
    return send(res, 200, { caseStudy: study });
  }

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const updated = await updateCaseStudy(id, parsed.data ?? {});
    if (!updated) return send(res, 404, { error: "Not found" });
    return send(res, 200, { caseStudy: updated });
  }

  if (req.method === "DELETE") {
    const ok = await deleteCaseStudy(id);
    if (!ok) return send(res, 404, { error: "Not found" });
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: "Method not allowed" });
}

// ── Products CMS (admin) ────────────────────────────────────────────────

async function handleAdminProducts(req, res) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const products = await listProducts();
    return send(res, 200, { count: products.length, products });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const product = await createProduct(parsed.data ?? {});
    return send(res, 201, { product });
  }

  send(res, 405, { error: "Method not allowed" });
}

async function handleAdminProductById(req, res, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return send(res, 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const product = await getProduct(id);
    if (!product) return send(res, 404, { error: "Not found" });
    return send(res, 200, { product });
  }

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const updated = await updateProduct(id, parsed.data ?? {});
    if (!updated) return send(res, 404, { error: "Not found" });
    return send(res, 200, { product });
  }

  if (req.method === "DELETE") {
    const ok = await deleteProduct(id);
    if (!ok) return send(res, 404, { error: "Not found" });
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: "Method not allowed" });
}

// ── tier-recommendation quiz ────────────────────────────────────────────
// Score-based tier recommendation (Foundation / Growth / AI Partner)
// Adapted from the Explee 7-step lead-gen playbook.

const VALID_PAIN_POINTS = new Set(["manual_work", "scaling", "security", "ai_automation"]);
const MAX_SCORE = 100; // 30 (team>20) + 30 (spend>=20k) + 40 (pain capped)

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

  let painScore = 0;
  if (painPoints.includes("manual_work")) painScore += 15;
  if (painPoints.includes("scaling")) painScore += 15;
  if (painPoints.includes("security")) painScore += 15;
  if (painPoints.includes("ai_automation")) painScore += 20;
  score += Math.min(painScore, 40); // cap pain contribution at 40

  return Math.min(score, MAX_SCORE);
}

/** Persist a quiz completion for analytics. */
async function recordQuizAudit(data) {
  const record = {
    id: randomUUID(),
    team_size: data.teamSize,
    it_spend: data.itSpend,
    pain_points: data.painPoints,
    tier: data.tier,
    score: data.score,
    ip: data.ip,
    user_agent: data.userAgent,
    created_at: new Date().toISOString(),
  };

  // JSONL is the development store; Supabase is the production one.
  if (resolveBackend() === "supabase") {
    const res = await sbFetch("quiz_audits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`quiz_audits insert failed: ${res.status}`);
    return record;
  }

  const store = process.env.QUIZ_STORE || dataFile("quiz-audits.jsonl");
  await mkdir(dirname(store), { recursive: true });
  await appendFile(store, JSON.stringify(record) + "\n", "utf8");
  return record;
}

async function handleQuiz(req, res) {
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

  const limited = rateLimit(`quiz:${clientIp(req)}`);
  if (!limited.allowed) {
    return send(
      res,
      429,
      { error: "Too many attempts. Please try again later." },
      { ...headers, "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)) },
    );
  }

  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body, headers);
    const body = parsed.data;

    if (!body || typeof body !== "object")
      return send(res, 400, { error: "Invalid payload" }, headers);

    if (typeof body.teamSize !== "number" || body.teamSize < 1 || body.teamSize > 3)
      return send(res, 400, { error: "teamSize must be 1, 2, or 3" }, headers);

    if (typeof body.itSpend !== "number" || body.itSpend < 0)
      return send(res, 400, { error: "itSpend must be a non-negative number" }, headers);

    if (!Array.isArray(body.painPoints))
      return send(res, 400, { error: "painPoints must be an array" }, headers);

    const invalidPp = body.painPoints.filter((p) => !VALID_PAIN_POINTS.has(p));
    if (invalidPp.length > 0)
      return send(res, 400, { error: `Invalid painPoints: ${invalidPp.join(", ")}` }, headers);

    if (body.painPoints.length > 4)
      return send(res, 400, { error: "Maximum 4 pain points allowed" }, headers);

    const score = scoreQuiz(body);
    let tier, description, nextStep, findings, estimatedSavings;

    if (score < 35) {
      tier = "Foundation";
      description = "Your IT setup is basic but functional. You're likely paying for reactive fixes instead of proactive management — a common pattern for teams under 20 staff.";
      nextStep = "Book a free 30-minute audit call and we'll show you exactly where you're leaving money on the table.";
      findings = [
        "Team size suggests you may be overpaying for enterprise-tier tools you don't use",
        "Low IT spend often means reactive break-fix — each unplanned outage costs 5–10× more than prevention",
        "Manual work pain points indicate automation ROI of 3–6 months",
      ];
      estimatedSavings = "RM 18,000–36,000/year by shifting from reactive to managed IT";
    } else if (score < 60) {
      tier = "Growth";
      description = "You're scaling fast but your IT hasn't kept up. Security gaps, undocumented processes, and tool sprawl are your biggest risks right now.";
      nextStep = "Schedule a Growth assessment — we map your current stack and show you the exact migration path.";
      findings = [
        "Scaling pain points mean your infrastructure is a bottleneck — every new hire amplifies the problem",
        "Security/compliance gaps expose you to PDPA fines up to RM 1,000,000",
        "Your IT spend is likely 30–50% below what companies your size typically need",
      ];
      estimatedSavings = "RM 48,000–96,000/year with proper cloud migration and managed security";
    } else {
      tier = "AI Partner";
      description = "You're ready for AI-first operations. Your team has the scale and the pain points that AI automation solves fastest — this is where the biggest ROI lives.";
      nextStep = "Let us build a custom AI roadmap for your team — we start with a 1-hour discovery workshop.";
      findings = [
        "AI automation needs combined with manual work = 40–60% time savings on repetitive tasks",
        "Your team size justifies dedicated AI engineering — the ROI crosses positive within 3 months",
        "Security/compliance concerns + AI = opportunity for a unified PDPA-compliant automation stack",
      ];
      estimatedSavings = "RM 120,000–240,000/year in recovered productivity and reduced headcount needs";
    }

    const auditDate = new Date().toISOString().split("T")[0];
    const result = { tier, score, description, nextStep, findings, estimatedSavings, auditDate };

    // Persist for analytics (fire-and-forget — don't block response)
    recordQuizAudit({
      teamSize: body.teamSize,
      itSpend: body.itSpend,
      painPoints: body.painPoints,
      tier,
      score,
      ip: clientIp(req),
      userAgent: String(req.headers["user-agent"] ?? "").slice(0, 400) || null,
    }).catch((err) => console.error(`[quiz] persist error: ${err.message}`));

    console.log(`[quiz] completed tier="${tier}" score=${score} ip=${clientIp(req)}`);

    return send(res, 200, result, headers);
  } catch (err) {
    console.error("[server] quiz error:", err);
    return send(res, 500, { error: "Quiz scoring failed. Please try again." }, headers);
  }
}


// ── case studies ──────────────────────────────────────────────────
// Static case study data. In production this could come from Supabase
// or a CMS. For now, these are the three active retainer clients.

// Public API: Case Studies (uses CMS module with Supabase/JSONL)
async function handleCaseStudies(req, res) {
  try {
    const studies = await listCaseStudies();
    return send(res, 200, { caseStudies: studies });
  } catch (err) {
    console.error("[case-studies] public API error:", err.message);
    // Fallback to static for resilience
    return send(res, 200, { caseStudies: [] });
  }
}

// Public API: Products (uses CMS module with Supabase/JSONL)
async function handleProducts(req, res) {
  try {
    const products = await listProducts();
    return send(res, 200, { products });
  } catch (err) {
    console.error("[products] public API error:", err.message);
    return send(res, 200, { products: [] });
  }
}


// ── testimonial capture ─────────────────────────────────────
// Standing ask built into the offboarding/monthly-review process.
// Records a submitted testimonial for a client.

async function handleTestimonial(req, res) {
  const blocked = checkOrigin(req);
  if (blocked) return send(res, blocked.status, blocked.body);

  const limited = rateLimit(`testimonial:${clientIp(req)}`);
  if (!limited.allowed) {
    return send(
      res,
      429,
      { error: "Too many attempts. Please try again later." },
      { "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)) },
    );
  }

  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const body = parsed.data;

    if (!body || typeof body !== "object")
      return send(res, 400, { error: "Invalid payload" });

    const { client, tier, quote, author } = body;
    if (!client || !quote || !author)
      return send(res, 400, { error: "Missing client, quote, or author" });
    if (typeof quote !== 'string' || quote.length > 500)
      return send(res, 400, { error: "Quote must be 1-500 characters" });
    if (typeof client !== 'string' || client.length > 200)
      return send(res, 400, { error: "Client must be 1-200 characters" });
    if (typeof author !== 'string' || author.length > 200)
      return send(res, 400, { error: "Author must be 1-200 characters" });
    if (tier != null && (typeof tier !== 'string' || tier.length > 60))
      return send(res, 400, { error: "Tier must be at most 60 characters" });

    const record = await recordTestimonial({ client, tier, quote, author });
    // The quote is customer words, so it stays out of stdout; the id is enough
    // to trace a submission when support needs it.
    console.log(`[testimonial ${record.id}] recorded`);
    return send(res, 201, { ok: true, id: record.id });
  } catch (err) {
    console.error("[server] testimonial error:", err);
    if (err.code === "STORAGE_CONFIG")
      return send(res, 503, { error: "Testimonial storage is unavailable." });
    return send(res, 500, { error: "Failed to record testimonial. Please try again." });
  }
}


// ── PDPA readiness scorecard ────────────────────────────────
// Interactive checklist/scorecard (SSM, PDPA, MyInvois readiness)
// as a lead magnet on the site.

const PDPA_QUESTIONS = [
  { id: "ssm_registered", label: "SSM registered", category: "SSM", weight: 10 },
  { id: "pdpa_policy", label: "PDPA policy published", category: "PDPA", weight: 15 },
  { id: "pdpa_consent", label: "Consent mechanism in place", category: "PDPA", weight: 15 },
  { id: "pdpa_dpo", label: "Data Protection Officer appointed", category: "PDPA", weight: 10 },
  { id: "data_breach_plan", label: "Data breach response plan", category: "PDPA", weight: 15 },
  { id: "myinvois_ready", label: "MyInvois compliant", category: "MyInvois", weight: 15 },
  { id: "employee_training", label: "Employee PDPA training completed", category: "PDPA", weight: 10 },
  { id: "data_audit", label: "Data processing audit done", category: "PDPA", weight: 10 },
];

async function handlePdpaScore(req, res) {
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const body = parsed.data;

    if (!body || typeof body !== "object")
      return send(res, 400, { error: "Invalid payload" });

    const answers = PDPA_QUESTIONS.map((q) => ({
      ...q,
      answered: Boolean(body[q.id]),
      score: Boolean(body[q.id]) ? q.weight : 0,
    }));

    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = PDPA_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    let level;
    if (percentage >= 80) level = "PDPA-Ready";
    else if (percentage >= 50) level = "Partially Compliant";
    else level = "Needs Attention";

    const missing = answers.filter((a) => !a.answered).map((a) => a.label);

    return send(res, 200, {
      score: totalScore,
      maxScore,
      percentage,
      level,
      answered: answers,
      missing,
      nextStep: `Download your PDPA readiness report or book a 30-minute compliance review.`,
    });
  } catch (err) {
    console.error("[server] pdpa score error:", err);
    return send(res, 500, { error: "PDPA scoring failed. Please try again." });
  }
}


// ── monthly digest ──────────────────────────────────────
// Automated email summarizing work done for each retainer client.
// Called by cron or on-demand; aggregates enquiries from the month
// and emails each client a summary.

async function handleMonthlyDigest(req, res) {
  try {
    // Refused unless DIGEST_TOKEN is set and matches. An unset token is a
    // misconfiguration, not an invitation — this route returns aggregated
    // lead data and must not be reachable by default.
    const token = req.headers["x-digest-token"] || "";
    if (!digestTokenValid(token)) {
      return send(res, 403, { error: "Forbidden" });
    }

    // Fetch all enquiries from this month
    const allRows = await listEnquiries();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthsRows = allRows.filter(
      (r) => new Date(r.created_at) >= startOfMonth
    );

    // Group by client
    const byClient = {};
    for (const row of thisMonthsRows) {
      const client = row.service || "General";
      if (!byClient[client]) byClient[client] = [];
      byClient[client].push(row);
    }

    const summary = {
      month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
      totalEnquiries: thisMonthsRows.length,
      clients: Object.keys(byClient).length,
      breakdown: byClient,
      nextStep: "Automated monthly digest sent to retainer clients.",
    };

    console.log("[digest] Monthly summary:", JSON.stringify(summary, null, 2));
    return send(res, 200, summary);
  } catch (err) {
    console.error("[server] digest error:", err);
    return send(res, 500, { error: "Digest generation failed." });
  }
}

// ── automation savings calculator ──────────────────────────
// POST /api/calculator — returns estimated hours/cost saved per tier.

async function handleCalculator(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const body = parsed.data;

    if (!body || typeof body !== "object")
      return send(res, 400, { error: "Invalid payload" });

    const staff = Number(body.staff);
    const manualHours = Number(body.manualHours);
    const painPoints = Array.isArray(body.painPoints) ? body.painPoints : [];

    if (!staff || staff < 1)
      return send(res, 400, { error: "Staff count must be at least 1" });
    if (manualHours === undefined || manualHours === null || manualHours < 0)
      return send(res, 400, { error: "Manual hours per week is required" });

    const result = calculateSavings({ staff, manualHours, painPoints });
    return send(res, 200, result);
  } catch (err) {
    console.error("[server] calculator error:", err);
    return send(res, 500, { error: "Calculator failed. Please try again." });
  }
}

export async function handle(req, res) {
  const urlPath = req.url ?? "/";
  // Route on the pathname so query strings (e.g. ?token=) still reach handlers.
  const pathname = new URL(urlPath, "http://localhost").pathname;
  try {
    if (pathname === "/api/send-email") return await handleSendEmail(req, res);
    if (pathname === "/admin/enquiries") return await handleAdminEnquiries(req, res);
    if (pathname === "/api/monthly-digest") return await handleMonthlyDigest(req, res);
    if (pathname === "/api/pdpa-score") return await handlePdpaScore(req, res);
    if (pathname === "/api/testimonial") return await handleTestimonial(req, res);
    if (pathname === "/api/case-studies") return await handleCaseStudies(req, res);
    if (pathname === "/api/products") return await handleProducts(req, res);
    if (pathname === "/api/quiz") return await handleQuiz(req, res);

    // ── client portal routes ──────────────────────────────────────────
    if (pathname === "/api/portal/login") {
      const limited = loginRateLimit(clientIp(req));
      if (!limited.allowed) {
        return send(
          res,
          429,
          { error: "Too many attempts. Please try again later." },
          { "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)) },
        );
      }
      return await handleLogin(req, res);
    }
    if (pathname === "/api/portal/logout") return await handleLogout(req, res);
    if (pathname === "/api/portal/me") return await handleMe(req, res);
    if (pathname === "/api/portal/health") return await handlePortalHealth(req, res);
    if (pathname === "/api/portal/tickets") return await handlePortalTickets(req, res, pathname);

    // /api/portal/tickets/:id/replies
    const ticketRepliesMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)\/replies$/);
    if (ticketRepliesMatch) {
      return await handlePortalTicketById(req, res, ticketRepliesMatch[1]);
    }

    // PATCH /api/portal/tickets/:id
    const ticketMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketMatch && req.method === "PATCH") {
      return await handlePortalTicketById(req, res, ticketMatch[1]);
    }
    // GET /api/portal/tickets/:id
    const ticketGetMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketGetMatch && req.method === "GET") {
      return await handlePortalTicketById(req, res, ticketGetMatch[1]);
    }

    // ── portal: proposals ──────────────────────────────────────────────
    if (pathname === "/api/portal/proposals" && req.method === "GET") {
      return await handlePortalProposals(req, res);
    }
    const portalProposalMatch = pathname.match(/^\/api\/portal\/proposals\/([a-f0-9-]+)$/);
    if (portalProposalMatch && req.method === "GET") {
      return await handlePortalProposalById(req, res, portalProposalMatch[1]);
    }

    // ── portal: digests ────────────────────────────────────────────────
    if (pathname === "/api/portal/digests" && req.method === "GET") {
      return await handlePortalDigests(req, res);
    }

    // ── admin: client management ──────────────────────────────────────
    if (pathname === "/admin/clients") return await handleAdminClients(req, res);

    // POST /admin/clients/:id/send-digest
    const digestMatch = pathname.match(/^\/admin\/clients\/([a-f0-9-]+)\/send-digest$/);
    if (digestMatch && req.method === "POST") {
      return await handleAdminClientDigest(req, res, digestMatch[1]);
    }

    // ── proposals ──────────────────────────────────────────────────────
    if (pathname === "/admin/proposals" && req.method === "GET") {
      return await handleAdminProposalsPage(req, res);
    }
    if (pathname === "/admin/proposals" && req.method === "POST") {
      return await handleAdminCreateProposal(req, res);
    }
    // ── leads pipeline ────────────────────────────────────────────────
    if (pathname === "/admin/pipeline" && req.method === "GET") {
      return await handleAdminPipelinePage(req, res);
    }
    const leadStatusMatch = pathname.match(/^\/(?:admin\/leads|api\/leads|admin\/pipeline)\/([a-f0-9-]+)$/);
    if (leadStatusMatch && req.method === "PATCH") {
      return await handleAdminLeadStatus(req, res, leadStatusMatch[1]);
    }
    const propMatch = pathname.match(/^\/api\/proposals\/([a-f0-9-]+)$/);
    if (propMatch && req.method === "GET") {
      return await handleGetProposal(req, res, propMatch[1]);
    }
    const propAcceptMatch = pathname.match(/^\/api\/proposals\/([a-f0-9-]+)\/accept$/);
    if (propAcceptMatch && req.method === "POST") {
      return await handleAcceptProposal(req, res, propAcceptMatch[1]);
    }

    // ── Case Studies CMS (admin) ──────────────────────────────────────
    if (pathname === "/admin/case-studies" && (req.method === "GET" || req.method === "POST")) {
      return await handleAdminCaseStudies(req, res);
    }
    const csMatch = pathname.match(/^\/admin\/case-studies\/([a-f0-9-]+)$/);
    if (csMatch && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      return await handleAdminCaseStudyById(req, res, csMatch[1]);
    }

    // ── Products CMS (admin) ──────────────────────────────────────────
    if (pathname === "/admin/products" && (req.method === "GET" || req.method === "POST")) {
      return await handleAdminProducts(req, res);
    }
    const prodMatch = pathname.match(/^\/admin\/products\/([a-f0-9-]+)$/);
    if (prodMatch && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      return await handleAdminProductById(req, res, prodMatch[1]);
    }

    // ── Catalog enrichment ────────────────────────────────────────────────
    if (pathname === "/api/catalog/enrich") return await handleCatalogEnrich(req, res);
    if (pathname === "/api/catalog/items") return await handleCatalogItems(req, res);
    const catMatch = pathname.match(/^\/api\/catalog\/items\/([a-f0-9-]+)$/);
    if (catMatch && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      return await handleCatalogItemById(req, res, catMatch[1]);
    }

    // ── DutaOS auth ──────────────────────────────────────────────────────────
    if (pathname === "/api/auth/signup") return await handleAuthSignup(req, res);
    if (pathname === "/api/auth/login") return await handleAuthLogin(req, res);
    if (pathname === "/api/auth/logout") return await handleAuthLogout(req, res);
    if (pathname === "/api/auth/me") return await handleAuthMe(req, res);

    // ── DutaOS compliance ────────────────────────────────────────────────────
    if (pathname === "/api/compliance-items") return await handleComplianceItems(req, res);
    const compMatch = pathname.match(/^\/api\/compliance-items\/([a-f0-9-]+)$/);
    if (compMatch && (req.method === "PATCH" || req.method === "DELETE" || req.method === "POST")) {
      return await handleComplianceItemById(req, res);
    }

    // ── DutaOS company profile ───────────────────────────────────────────────
    if (pathname === "/api/companies") return await handleCompaniesGet(req, res);
    const companyMatch = pathname.match(/^\/api\/companies\/([a-f0-9-]+)$/);
    if (companyMatch) {
      if (req.method === "PATCH") return await handleCompaniesPatch(req, res, companyMatch[1]);
      return send(res, 405, { error: "Method not allowed" });
    }

    // ── DutaOS AI (grounded on the company's compliance brief) ───────────────
    if (pathname === "/api/dutaos/brief") return await handleDutaosBrief(req, res);
    if (pathname === "/api/ai/chat") return await handleAIChat(req, res);

    if (pathname.startsWith("/api/workspace/")) return await handleWorkspaceNodeRequest(req, res);

    if (pathname === "/api/health") {
      const fresh = new URL(urlPath, "http://localhost").searchParams.get("fresh") === "1";
      const { status, ...report } = await healthReport({ force: fresh });
      return send(res, status, report);
    }
    if (pathname === "/api/stats") return await handleStats(req, res);
    if (pathname === "/api/calculator") return await handleCalculator(req, res);
    if (pathname === "/api/ops/feed") return await handleFeed(req, res);
    if (pathname === "/api/ops/consent") return await handleConsent(req, res);
    if (pathname === "/api/ops/events") return await handleIngestEvent(req, res);

    if (pathname.startsWith("/api/")) return send(res, 404, { error: "Not found" });
    return await serveStatic(req, res, urlPath);
  } catch (err) {
    console.error("[server] unhandled error:", err);
    if (!res.headersSent) send(res, 500, { error: "Something went wrong. Please try again." });
    else res.end();
  }
}

/**
 * Node/http adapter for the shared fetch-based workspace API.
 * Converts the incoming Node request to a fetch Request, runs
 * handleWorkspaceApi, and writes the fetch Response back to res.
 */
async function handleWorkspaceNodeRequest(req, res) {
  if (!pathnameStartsWith(req.url, "/api/workspace/")) return false;

  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${proto}://${host}`);
  const headers = new Headers();
  const hopByHop = new Set([
    "connection", "transfer-encoding", "upgrade", "keep-alive", "host", "content-length",
  ]);
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (hopByHop.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, String(v)));
    else if (value !== undefined) headers.set(key, String(value));
  }
  let body;
  if (!["GET", "HEAD"].includes(req.method || "GET")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    body = Buffer.concat(chunks).toString("utf8");
  }
  const webRequest = new Request(url, {
    method: req.method || "GET",
    headers,
    ...(body === undefined ? {} : { body }),
  });
  const response = await handleWorkspaceApi(webRequest);
  if (!response) return false;

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}

function pathnameStartsWith(url, prefix) {
  try {
    return new URL(url, "http://localhost").pathname.startsWith(prefix);
  } catch {
    return false;
  }
}
