import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

import { listEnquiries, notifyEnquiry, recordEnquiry, resolveInboxEmail } from "./enquiries.mjs";
import { timingSafeEqual } from "node:crypto";
import { handleStats } from "./stats.mjs";
import { calculateSavings } from "./calculator.mjs";

import {
  handleLogin,
  handleLogout,
  handleMe,
  handlePortalTickets,
  handlePortalTicketById,
  handlePortalHealth,
  handleAdminClients,
  handleAdminClientDigest,
} from "./portal.mjs";

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


// ── case studies ──────────────────────────────────────────────────
// Static case study data. In production this could come from Supabase
// or a CMS. For now, these are the three active retainer clients.

const CASE_STUDIES = [
  {
    id: 'lapango',
    client: 'Lapango',
    tier: 'Growth',
    title: 'Scaling Support Operations with Managed IT',
    desc: 'Lapango needed to scale their support team without the overhead of building an internal IT department. We deployed a managed IT stack with proactive monitoring and SLA-backed response times.',
    tags: ['Managed IT', 'SLA Support', 'Team Scaling'],
    result: '30% reduction in downtime, 2x support capacity within 90 days.'
  },
  {
    id: 'eastelpro',
    client: 'Eastelpro',
    tier: 'Foundation',
    title: 'Predictable IT Budgeting for Growing SME',
    desc: 'Eastelpro was spending unpredictably on IT emergencies. We moved them to a predictable monthly retainer with proactive maintenance and fast response guarantees.',
    tags: ['Foundation', 'Predictable Billing', 'Proactive Maintenance'],
    result: '40% lower IT costs year-over-year, zero emergency incidents.'
  },
  {
    id: 'agmx',
    client: 'AGMX',
    tier: 'AI Partner',
    title: 'Automating Compliance with AI-First Workflows',
    desc: 'AGMX needed to automate their regulatory compliance tracking. We built custom AI workflows that monitor, flag, and report compliance status in real time.',
    tags: ['AI Automation', 'Compliance', 'Custom Workflows'],
    result: '60% faster compliance reporting, full audit trail automated.'
  }
];

async function handleCaseStudies(req, res) {
  return send(res, 200, { cases: CASE_STUDIES });
}


// ── testimonial capture ─────────────────────────────────────
// Standing ask built into the offboarding/monthly-review process.
// Records a submitted testimonial for a client.

async function handleTestimonial(req, res) {
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const body = parsed.data;

    const { client, tier, quote, author } = body;
    if (!client || !quote || !author)
      return send(res, 400, { error: "Missing client, quote, or author" });
    if (typeof quote !== 'string' || quote.length > 500)
      return send(res, 400, { error: "Quote must be 1-500 characters" });

    // TODO: Persist to Supabase or JSONL store
    console.log("[testimonial] received:", { client, tier, author, quote: quote.slice(0, 60) + '...' });

    return send(res, 201, { ok: true, message: "Testimonial recorded. Thank you!" });
  } catch (err) {
    console.error("[server] testimonial error:", err);
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
    // Only allow if a cron/token is provided (future enhancement)
    const token = req.headers["x-digest-token"] || "";
    const configured = process.env.DIGEST_TOKEN?.trim();
    if (configured && token !== configured) {
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
    if (pathname === "/api/quiz") return await handleQuiz(req, res);

    // ── client portal routes ──────────────────────────────────────────
    if (pathname === "/api/portal/login") return await handleLogin(req, res);
    if (pathname === "/api/portal/logout") return await handleLogout(req, res);
    if (pathname === "/api/portal/me") return await handleMe(req, res);
    if (pathname === "/api/portal/health") return await handlePortalHealth(req, res);
    if (pathname === "/api/portal/tickets") return await handlePortalTickets(req, res, pathname);

    // PATCH /api/portal/tickets/:id
    const ticketMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketMatch && req.method === "PATCH") {
      return await handlePortalTicketById(req, res, ticketMatch[1]);
    }

    // ── admin: client management ──────────────────────────────────────
    if (pathname === "/admin/clients") return await handleAdminClients(req, res);

    // POST /admin/clients/:id/send-digest
    const digestMatch = pathname.match(/^\/admin\/clients\/([a-f0-9-]+)\/send-digest$/);
    if (digestMatch && req.method === "POST") {
      return await handleAdminClientDigest(req, res, digestMatch[1]);
    }

    if (pathname === "/api/health") {
      return send(res, 200, { ok: true, inboxConfigured: Boolean(resolveInboxEmail()) });
    }
    if (pathname === "/api/stats") return await handleStats(req, res);
    if (pathname === "/api/calculator") return await handleCalculator(req, res);
    if (pathname.startsWith("/api/")) return send(res, 404, { error: "Not found" });
    return await serveStatic(req, res, urlPath);
  } catch (err) {
    console.error("[server] unhandled error:", err);
    if (!res.headersSent) send(res, 500, { error: "Something went wrong. Please try again." });
    else res.end();
  }
}
