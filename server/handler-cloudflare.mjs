/**
 * Cloudflare Pages Functions handler for API routes only.
 * 
 * Static files are served directly by Cloudflare Pages from the public/ directory.
 * This handler only processes /api/* and /admin/* routes.
 * 
 * Uses Supabase exclusively (no JSONL fallback) since Cloudflare Pages Functions
 * have no durable local filesystem.
 */

import { timingSafeEqual } from "node:crypto";

// Import Supabase-only versions of all modules
import {
  recordEnquiry,
  notifyEnquiry,
  resolveInboxEmail,
  listEnquiries,
} from "./enquiries-cloudflare.mjs";

import { handleStats } from "./stats-cloudflare.mjs";
import { calculateSavings } from "./calculator.mjs";
import { supabaseConfigured } from "./supabase-client.mjs";
import { handleFeed, handleConsent, handleIngestEvent } from "./autonomous-ops-cloudflare.mjs";
import { handleWorkspaceApi } from "./workspace-cloudflare.mjs";
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  approveTask,
  requestTaskApproval,
  deleteTask,
  getTaskStats,
  getAuditLog,
  logAudit,
} from "./ops-tasks-cloudflare.mjs";

import {
  handleAuthSignup,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
  handlePortalTickets,
  handlePortalTicketById,
  handlePortalHealth,
  handlePortalProposals,
  handlePortalProposalById,
  handlePortalProjects,
  handleAdminClients,
  handleAdminClientDigest,
} from "./portal-cloudflare.mjs";

// ── Security Headers ──────────────────────────────────────────────────────────
// Cloudflare Pages serves static files with _headers; this applies to API responses
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy":
    "default-src 'none'; " +
    "frame-ancestors 'none';",
};

// ── Validation ────────────────────────────────────────────────────────────────

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

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// In-memory rate limiting (per-instance). For production, consider KV-backed.

const WINDOW_MS = 60_000;
const LIMIT_PER_WINDOW = 5;
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_LIMIT_PER_WINDOW = 5;

const hits = new Map();

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

export function loginRateLimit(ip) {
  return rateLimit(`login:${ip}`, Date.now(), LOGIN_LIMIT_PER_WINDOW, LOGIN_WINDOW_MS);
}

export function resetRateLimit() {
  hits.clear();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function corsHeaders(req) {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  if (!allowedOrigins().includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS, PATCH",
    "access-control-allow-headers": "Content-Type, x-csrf-token, x-admin-token, x-digest-token",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

export function checkOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return null;
  if (allowedOrigins().includes(origin)) return null;
  return { status: 403, body: { error: "Invalid origin" } };
}

export function validateCsrf(req) {
  if (!req.headers.get("origin")) return true;
  
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => c.trim().split("="))
  );
  const cookieToken = cookies.csrf_token;
  const headerToken = req.headers.get("x-csrf-token");
  
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  
  try {
    const a = new TextEncoder().encode(cookieToken);
    const b = new TextEncoder().encode(headerToken);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sendJson(status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

async function readJsonBody(req) {
  try {
    const text = await req.text();
    if (!text) return { error: { status: 400, body: { error: "Empty body" } } };
    return { data: JSON.parse(text) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON body" } } };
  }
}

function constantTimeEqual(configured, supplied) {
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(configured);
  const b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminTokenValid(supplied) {
  return constantTimeEqual(process.env.ADMIN_TOKEN?.trim(), supplied);
}

export function digestTokenValid(supplied) {
  return constantTimeEqual(process.env.DIGEST_TOKEN?.trim(), supplied);
}

// ── Route Handlers ────────────────────────────────────────────────────────────

async function handleSendEmail(req) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return sendJson(405, { error: "Method not allowed" }, headers);
  }

  const blocked = checkOrigin(req);
  if (blocked) return sendJson(blocked.status, blocked.body, headers);

  if (!validateCsrf(req)) {
    return sendJson(403, { error: "Invalid CSRF token" }, headers);
  }

  const limited = rateLimit(`enquiry:${clientIp(req)}`);
  if (!limited.allowed) {
    return sendJson(429, { error: "Too many attempts. Please try again later." }, {
      ...headers,
      "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)),
    });
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(parsed.error.status, parsed.error.body, headers);

  const valid = validateEnquiry(parsed.data);
  if (valid.error) return sendJson(400, { error: valid.error }, headers);

  const enquiry = await recordEnquiry({
    ...valid.value,
    ip: clientIp(req),
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 400) || null,
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

  return sendJson(200, { success: true, delivered }, headers);
}

async function handleAdminEnquiries(req) {
  const url = new URL(req.url);
  const supplied = req.headers.get("x-admin-token") ?? url.searchParams.get("token");
  if (!adminTokenValid(supplied)) {
    return sendJson(401, { error: "Unauthorized" });
  }
  const rows = await listEnquiries(200);
  return sendJson(200, { count: rows.length, enquiries: rows });
}

const VALID_PAIN_POINTS = new Set(["manual_work", "scaling", "security", "ai_automation"]);
const MAX_SCORE = 100;

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
  score += Math.min(painScore, 40);

  return Math.min(score, MAX_SCORE);
}

async function handleQuiz(req) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return sendJson(405, { error: "Method not allowed" }, headers);

  const blocked = checkOrigin(req);
  if (blocked) return sendJson(blocked.status, blocked.body, headers);

  const limited = rateLimit(`quiz:${clientIp(req)}`);
  if (!limited.allowed) {
    return sendJson(429, { error: "Too many attempts. Please try again later." }, {
      ...headers, "retry-after": String(Math.ceil(limited.retryAfterMs / 1000)),
    });
  }

  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body, headers);
    const body = parsed.data;

    if (!body || typeof body !== "object") return sendJson(400, { error: "Invalid payload" }, headers);
    if (typeof body.teamSize !== "number" || body.teamSize < 1 || body.teamSize > 3)
      return sendJson(400, { error: "teamSize must be 1, 2, or 3" }, headers);
    if (typeof body.itSpend !== "number" || body.itSpend < 0)
      return sendJson(400, { error: "itSpend must be a non-negative number" }, headers);
    if (!Array.isArray(body.painPoints)) return sendJson(400, { error: "painPoints must be an array" }, headers);

    const invalidPp = body.painPoints.filter((p) => !VALID_PAIN_POINTS.has(p));
    if (invalidPp.length > 0) return sendJson(400, { error: `Invalid painPoints: ${invalidPp.join(", ")}` }, headers);
    if (body.painPoints.length > 4) return sendJson(400, { error: "Maximum 4 pain points allowed" }, headers);

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
    console.log(`[quiz] completed tier="${tier}" score=${score} ip=${clientIp(req)}`);
    return sendJson(200, result, headers);
  } catch (err) {
    console.error("[server] quiz error:", err);
    return sendJson(500, { error: "Quiz scoring failed. Please try again." }, headers);
  }
}

const CASE_STUDIES = [
  {
    id: 'lapango', client: 'Lapango', tier: 'Growth',
    title: 'Scaling Support Operations with Managed IT',
    desc: 'Lapango needed to scale their support team without the overhead of building an internal IT department. We deployed a managed IT stack with proactive monitoring and SLA-backed response times.',
    tags: ['Managed IT', 'SLA Support', 'Team Scaling'],
    result: '30% reduction in downtime, 2x support capacity within 90 days.',
  },
  {
    id: 'eastelpro', client: 'Eastelpro', tier: 'Foundation',
    title: 'Predictable IT Budgeting for Growing SME',
    desc: 'Eastelpro was spending unpredictably on IT emergencies. We moved them to a predictable monthly retainer with proactive maintenance and fast response guarantees.',
    tags: ['Foundation', 'Predictable Billing', 'Proactive Maintenance'],
    result: '40% lower IT costs year-over-year, zero emergency incidents.',
  },
  {
    id: 'agmx', client: 'AGMX', tier: 'AI Partner',
    title: 'Automating Compliance with AI-First Workflows',
    desc: 'AGMX needed to automate their regulatory compliance tracking. We built custom AI workflows that monitor, flag, and report compliance status in real time.',
    tags: ['AI Automation', 'Compliance', 'Custom Workflows'],
    result: '60% faster compliance reporting, full audit trail automated.',
  }
];

async function handleCaseStudies(req) {
  return sendJson(200, { cases: CASE_STUDIES });
}

async function handleTestimonial(req) {
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const { client, tier, quote, author } = parsed.data ?? {};
    if (!client || !quote || !author) return sendJson(400, { error: "Missing client, quote, or author" });
    if (typeof quote !== 'string' || quote.length > 500) return sendJson(400, { error: "Quote must be 1-500 characters" });
    console.log("[testimonial] received:", { client, tier, author, quote: quote.slice(0, 60) + '...' });
    return sendJson(201, { ok: true, message: "Testimonial recorded. Thank you!" });
  } catch (err) {
    console.error("[server] testimonial error:", err);
    return sendJson(500, { error: "Failed to record testimonial. Please try again." });
  }
}

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

async function handlePdpaScore(req) {
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const body = parsed.data;
    if (!body || typeof body !== "object") return sendJson(400, { error: "Invalid payload" });

    const answers = PDPA_QUESTIONS.map((q) => ({
      ...q, answered: Boolean(body[q.id]), score: Boolean(body[q.id]) ? q.weight : 0,
    }));
    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = PDPA_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);
    let level;
    if (percentage >= 80) level = "PDPA-Ready";
    else if (percentage >= 50) level = "Partially Compliant";
    else level = "Needs Attention";
    const missing = answers.filter((a) => !a.answered).map((a) => a.label);

    return sendJson(200, {
      score: totalScore, maxScore, percentage, level, answered: answers, missing,
      nextStep: "Download your PDPA readiness report or book a 30-minute compliance review.",
    });
  } catch (err) {
    console.error("[server] pdpa score error:", err);
    return sendJson(500, { error: "PDPA scoring failed. Please try again." });
  }
}

async function handleMonthlyDigest(req) {
  const token = req.headers.get("x-digest-token") || "";
  if (!digestTokenValid(token)) return sendJson(403, { error: "Forbidden" });

  const allRows = await listEnquiries();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthsRows = allRows.filter((r) => new Date(r.created_at) >= startOfMonth);

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
  return sendJson(200, summary);
}

async function handleCalculator(req) {
  if (req.method !== "POST") return sendJson(405, { error: "Method not allowed" });
  try {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const body = parsed.data;
    if (!body || typeof body !== "object") return sendJson(400, { error: "Invalid payload" });

    const staff = Number(body.staff);
    const manualHours = Number(body.manualHours);
    const painPoints = Array.isArray(body.painPoints) ? body.painPoints : [];

    if (!staff || staff < 1) return sendJson(400, { error: "Staff count must be at least 1" });
    if (manualHours === undefined || manualHours === null || manualHours < 0)
      return sendJson(400, { error: "Manual hours per week is required" });

    const result = calculateSavings({ staff, manualHours, painPoints });
    return sendJson(200, result);
  } catch (err) {
    console.error("[server] calculator error:", err);
    return sendJson(500, { error: "Calculator failed. Please try again." });
  }
}

async function handleHealth(req) {
  const supabaseConfigured = supabaseConfigured();
  return sendJson(200, {
    ok: true,
    inboxConfigured: Boolean(resolveInboxEmail()),
    supabaseConfigured,
    storageBackend: supabaseConfigured ? "supabase" : "jsonl",
  });
}

// ── Main Router ───────────────────────────────────────────────────────────────

export async function handleApi(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // API routes
    if (pathname === "/api/send-email") return await handleSendEmail(req);
    if (pathname === "/admin/enquiries") return await handleAdminEnquiries(req);
    if (pathname === "/api/monthly-digest") return await handleMonthlyDigest(req);
    if (pathname === "/api/pdpa-score") return await handlePdpaScore(req);
    if (pathname === "/api/testimonial") return await handleTestimonial(req);
    if (pathname === "/api/case-studies") return await handleCaseStudies(req);
    if (pathname === "/api/quiz") return await handleQuiz(req);
    if (pathname === "/api/health") return await handleHealth(req);
    if (pathname === "/api/stats") return await handleStats(req);
    if (pathname === "/api/calculator") return await handleCalculator(req);
    if (pathname === "/api/ops/feed") return await handleFeed(req);
    if (pathname === "/api/ops/consent") return await handleConsent(req);
    if (pathname === "/api/ops/events") return await handleIngestEvent(req);

    // Phase 4: Managed AI Operations — Task Management
    if (pathname === "/api/ops/tasks") {
      if (req.method === "GET") {
        const filters = {};
        const url = new URL(req.url);
        if (url.searchParams.get("status")) filters.status = url.searchParams.get("status");
        if (url.searchParams.get("priority")) filters.priority = url.searchParams.get("priority");
        if (url.searchParams.get("assigneeId")) filters.assigneeId = url.searchParams.get("assigneeId");
        if (url.searchParams.get("createdBy")) filters.createdBy = url.searchParams.get("createdBy");
        const tasks = await listTasks(filters);
        return sendJson(200, { tasks });
      }
      if (req.method === "POST") {
        const parsed = await readJsonBody(req);
        if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
        const task = await createTask(parsed.data);
        return sendJson(201, { task });
      }
      return sendJson(405, { error: "Method not allowed" });
    }

    const taskMatch = pathname.match(/^\/api\/ops\/tasks\/([a-f0-9-]+)$/);
    if (taskMatch) {
      const taskId = taskMatch[1];
      if (req.method === "GET") {
        const task = await getTask(taskId);
        return sendJson(200, { task });
      }
      if (req.method === "PATCH") {
        const parsed = await readJsonBody(req);
        if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
        const actorId = parsed.data?.actorId || "system";
        const task = await updateTask(taskId, parsed.data, actorId);
        return sendJson(200, { task });
      }
      if (req.method === "DELETE") {
        const actorId = "system";
        await deleteTask(taskId, actorId);
        return sendJson(200, { ok: true });
      }
      return sendJson(405, { error: "Method not allowed" });
    }

    // Task approval workflow
    const approveMatch = pathname.match(/^\/api\/ops\/tasks\/([a-f0-9-]+)\/approve$/);
    if (approveMatch && req.method === "POST") {
      const parsed = await readJsonBody(req);
      if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
      const { rejectionReason } = parsed.data ?? {};
      const actorId = parsed.data?.actorId || "system";
      const task = await approveTask(taskId, actorId, rejectionReason);
      return sendJson(200, { task });
    }

    const requestApprovalMatch = pathname.match(/^\/api\/ops\/tasks\/([a-f0-9-]+)\/request-approval$/);
    if (requestApprovalMatch && req.method === "POST") {
      const actorId = "system";
      const task = await requestTaskApproval(taskId, actorId);
      return sendJson(200, { task });
    }

    // Task stats
    if (pathname === "/api/ops/task-stats") {
      const stats = await getTaskStats();
      return sendJson(200, { stats });
    }

    // Audit log
    if (pathname === "/api/ops/audit-log") {
      const url = new URL(req.url);
      const filters = {};
      if (url.searchParams.get("entityType")) filters.entityType = url.searchParams.get("entityType");
      if (url.searchParams.get("entityId")) filters.entityId = url.searchParams.get("entityId");
      if (url.searchParams.get("actorId")) filters.actorId = url.searchParams.get("actorId");
      if (url.searchParams.get("action")) filters.action = url.searchParams.get("action");
      const logs = await getAuditLog(filters);
      return sendJson(200, { logs: logs });
    }

    // Portal auth routes (Supabase Auth)
    if (pathname === "/api/auth/signup") return await handleAuthSignup(req);
    if (pathname === "/api/auth/login") return await handleAuthLogin(req);
    if (pathname === "/api/auth/logout") return await handleAuthLogout(req);
    if (pathname === "/api/auth/me") return await handleAuthMe(req);

    // Portal routes (authenticated via Supabase JWT)
    if (pathname === "/api/portal/health") return await handlePortalHealth(req);
    if (pathname === "/api/portal/tickets") return await handlePortalTickets(req);

    const ticketMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketMatch && req.method === "PATCH") {
      return await handlePortalTicketById(req, ticketMatch[1]);
    }

    // Proposals (Phase 3)
    if (pathname === "/api/portal/proposals") return await handlePortalProposals(req);
    const proposalMatch = pathname.match(/^\/api\/portal\/proposals\/([a-f0-9-]+)$/);
    if (proposalMatch && req.method === "PATCH") {
      return await handlePortalProposalById(req, proposalMatch[1]);
    }

    // Projects (Phase 3)
    if (pathname === "/api/portal/projects") return await handlePortalProjects(req);

    // Admin client management
    if (pathname === "/admin/clients") return await handleAdminClients(req);
    const digestMatch = pathname.match(/^\/admin\/clients\/([a-f0-9-]+)\/send-digest$/);
    if (digestMatch && req.method === "POST") {
      return await handleAdminClientDigest(req, digestMatch[1]);
    }

    // Unified workspace API (assessment, client portal, admin)
    if (pathname.startsWith("/api/workspace/")) {
      const workspaceResponse = await handleWorkspaceApi(req);
      if (workspaceResponse) return workspaceResponse;
    }

    // 404 for unknown API routes
    if (pathname.startsWith("/api/") || pathname.startsWith("/admin/")) {
      return sendJson(404, { error: "Not found" });
    }

    // Non-API paths should be handled by Cloudflare Pages static serving
    return sendJson(404, { error: "Not found" });
  } catch (err) {
    console.error("[server] unhandled error:", err);
    return sendJson(500, { error: "Something went wrong. Please try again." });
  }
}