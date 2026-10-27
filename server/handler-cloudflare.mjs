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
  notifyEnquirer,
  notifyEnquiry,
  resolveInboxEmail,
  listEnquiries,
  sendMail,
  updateEnquiryStatus,
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
  handlePortalDigests,
  handleAdminClients,
  handleAdminClientDigest,
  requireAdminSession,
} from "./portal-cloudflare.mjs";

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
} from "./cms-cloudflare.mjs";

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

  try {
    await notifyEnquirer(enquiry);
  } catch (err) {
    console.error(`[enquiry ${enquiry.id}] auto-reply failed: ${err.message}`);
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

function cfSupabaseConfigured() {
  return supabaseConfigured();
}

async function cfSbFetch(path, init = {}) {
  const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

async function handleAdminProposalsPage(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });
  const token = auth.session ? "session" : auth.client.role;
  const url = new URL(req.url);
  const qLeadId = url.searchParams.get("leadId") || "";
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
  <label>Lead ID (optional)</label><input name="leadId" value="${cfEscapeHtml(qLeadId)}" />
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
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

function cfEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CF_PIPELINE_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "closed"];

function cfAgeDays(created) {
  const t = Date.parse(created);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function cfNormalizeLead(row) {
  return { ...row, status: row.status || "new" };
}

async function handleAdminPipelinePage(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });
  const token = auth.session ? "session" : auth.client.role;
  const rows = (await listEnquiries(500)).map(cfNormalizeLead);
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const accept = req.headers.get("accept") || "";
  if (format === "csv") {
    const header = ["id", "name", "company", "email", "phone", "service", "status", "age_days", "created_at", "note"];
    const csvRows = [header.join(",")].concat(rows.map((l) => [
      l.id, l.name, l.company, l.email, l.phone, l.service, l.status, cfAgeDays(l.created_at), l.created_at, l.note,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")));
    return new Response(csvRows.join("\n"), { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=leads.csv", "cache-control": "no-store" } });
  }
  if (accept.includes("text/html")) {
    const byStatus = Object.fromEntries(CF_PIPELINE_STATUSES.map((s) => [s, []]));
    for (const l of rows) {
      if (byStatus[l.status]) byStatus[l.status].push(l);
      else byStatus.new.push(l);
    }
    for (const s of CF_PIPELINE_STATUSES) {
      byStatus[s].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }
    const colHtml = CF_PIPELINE_STATUSES.map((status) => {
      const cards = byStatus[status].map((l) => {
        const age = cfAgeDays(l.created_at);
        const stale = (status === "new" || status === "contacted") && age > 3;
        const staleAttr = stale ? ' style="border-color:#dc2626;background:#fef2f2"' : "";
        const proposalLink = `/admin/proposals?token=${encodeURIComponent(token)}&leadId=${encodeURIComponent(l.id)}`;
        const waPhone = String(l.phone || "").replace(/[^0-9]/g, "");
        const waLink = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent("Hi " + (l.name || "") + ", following up on your enquiry about " + (l.service || "") + ".")}` : "";
        const opts = CF_PIPELINE_STATUSES.map((s) => `<option value="${s}"${s === l.status ? " selected" : ""}>${s}</option>`).join("");
        const score = l.leadScore !== undefined && l.leadScore !== null ? ` · Score: ${l.leadScore}` : "";
        const ind = l.industry ? ` · ${cfEscapeHtml(l.industry)}` : "";
        return `<div class="card"${staleAttr}>
          <div class="name">${cfEscapeHtml(l.name || "—")}</div>
          <div class="meta">${cfEscapeHtml(l.company) || "—"} · ${cfEscapeHtml(l.service) || "—"}${ind}</div>
          <div class="meta age">Age: ${age}d${stale ? " · STALE" : ""}${score}</div>
          ${l.note ? `<div class="meta note">Note: ${cfEscapeHtml(l.note)}</div>` : ""}
          <div class="actions">
            <select data-id="${cfEscapeHtml(l.id)}" onchange="moveStatus(this)">${opts}</select>
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
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
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
<h1>Leads pipeline <small>(${rows.length})</small> <a href="/admin/pipeline?token=${encodeURIComponent(token)}&format=csv" style="font-size:.8rem;font-weight:400;margin-left:1rem">Export CSV</a></h1>
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
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
  }
  const byStatus = Object.fromEntries(CF_PIPELINE_STATUSES.map((s) => [s, []]));
  for (const l of rows) {
    if (byStatus[l.status]) byStatus[l.status].push(l);
    else byStatus.new.push(l);
  }
  return sendJson(200, { count: rows.length, leads: rows, enquiries: rows, items: rows, byStatus });
}

const CF_ALLOWED_LEAD_STATUSES = new Set(CF_PIPELINE_STATUSES);

async function handleAdminLeadStatus(req, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });
  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
  const status = String(parsed.data?.status || parsed.data?.newStatus || parsed.data?.state || "").trim();
  const note = parsed.data?.note;
  const assignedRole = parsed.data?.assignedRole || parsed.data?.assigned_role;
  if (status && !CF_ALLOWED_LEAD_STATUSES.has(status)) return sendJson(400, { error: "invalid status" });
  if (!status && note === undefined && assignedRole === undefined) return sendJson(400, { error: "status, note, or assignedRole required" });
  try {
    const updated = await updateEnquiryStatus(id, status || null, note, assignedRole);
    if (!updated) return sendJson(404, { error: "Not found" });
    const norm = cfNormalizeLead(updated);
    return sendJson(200, { ok: true, lead: norm, enquiry: norm });
  } catch (err) {
    return sendJson(502, { error: `db error: ${err.message}` });
  }
}

async function handleAdminCreateProposal(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });
  if (!supabaseConfigured()) return sendJson(503, { error: "Supabase not configured" });

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
  const b = parsed.data || {};
  const title = String(b.title || "").trim();
  const summary = String(b.summary || "").trim();
  const amount = Number(b.amountMyr);
  if (!title || !summary || !Number.isFinite(amount) || amount < 0) {
    return sendJson(400, { error: "title, summary and a non-negative amountMyr are required" });
  }
  const scope = Array.isArray(b.scope) ? b.scope.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];
  const validUntil = b.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(b.validUntil) ? b.validUntil : null;
  const row = {
    id: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
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
  const r = await cfSbFetch("workspace_proposals", { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=representation" } });
  if (!r.ok) return sendJson(502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  const proposal = rows[0] || row;

  if (b.leadId && supabaseConfigured()) {
    try {
      const lr = await cfSbFetch(`workspace_leads?id=eq.${encodeURIComponent(b.leadId)}&select=email,name`);
      if (lr.ok) {
        const leads = await lr.json();
        const lead = leads[0];
        if (lead?.email) {
          const link = `${new URL(req.url).origin}/proposal/${proposal.id}`;
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

  return sendJson(201, { proposal });
}

async function handleGetProposal(req, id) {
  if (!supabaseConfigured()) return sendJson(503, { error: "Supabase not configured" });
  const r = await cfSbFetch(`workspace_proposals?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!r.ok) return sendJson(502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  const p = rows[0];
  if (!p) return sendJson(404, { error: "Proposal not found" });
  return sendJson(200, { proposal: p });
}

async function handleAcceptProposal(req, id) {
  if (!supabaseConfigured()) return sendJson(503, { error: "Supabase not configured" });
  const parsed = await readJsonBody(req);
  const name = parsed.error ? "" : String(parsed.data?.name || "").trim().slice(0, 120);
  const r = await cfSbFetch(`workspace_proposals?id=eq.${encodeURIComponent(id)}&status=eq.sent`, {
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
  if (!r.ok) return sendJson(502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  if (!rows.length) return sendJson(404, { error: "Proposal not found or not in sent state" });
  return sendJson(200, { proposal: rows[0] });
}

// ── Case Studies CMS (admin) ────────────────────────────────────────

async function handleAdminCaseStudies(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const studies = await listCaseStudies();
    return sendJson(200, { count: studies.length, caseStudies: studies });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const study = await createCaseStudy(parsed.data ?? {});
    return sendJson(201, { caseStudy: study });
  }

  return sendJson(405, { error: "Method not allowed" });
}

async function handleAdminCaseStudyById(req, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const study = await getCaseStudy(id);
    if (!study) return sendJson(404, { error: "Not found" });
    return sendJson(200, { caseStudy: study });
  }

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const updated = await updateCaseStudy(id, parsed.data ?? {});
    if (!updated) return sendJson(404, { error: "Not found" });
    return sendJson(200, { caseStudy: updated });
  }

  if (req.method === "DELETE") {
    const ok = await deleteCaseStudy(id);
    if (!ok) return sendJson(404, { error: "Not found" });
    return sendJson(200, { ok: true });
  }

  return sendJson(405, { error: "Method not allowed" });
}

// ── Products CMS (admin) ────────────────────────────────────────────

async function handleAdminProducts(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const products = await listProducts();
    return sendJson(200, { count: products.length, products });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const product = await createProduct(parsed.data ?? {});
    return sendJson(201, { product });
  }

  return sendJson(405, { error: "Method not allowed" });
}

async function handleAdminProductById(req, id) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const product = await getProduct(id);
    if (!product) return sendJson(404, { error: "Not found" });
    return sendJson(200, { product });
  }

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(parsed.error.status, parsed.error.body);
    const updated = await updateProduct(id, parsed.data ?? {});
    if (!updated) return sendJson(404, { error: "Not found" });
    return sendJson(200, { product });
  }

  if (req.method === "DELETE") {
    const ok = await deleteProduct(id);
    if (!ok) return sendJson(404, { error: "Not found" });
    return sendJson(200, { ok: true });
  }

  return sendJson(405, { error: "Method not allowed" });
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

async function handleCaseStudies(req) {
  try {
    const studies = await listCaseStudies();
    return sendJson(200, { caseStudies: studies });
  } catch (err) {
    console.error("[case-studies] public API error:", err.message);
    return sendJson(200, { caseStudies: [] });
  }
}

async function handleProducts(req) {
  try {
    const products = await listProducts();
    return sendJson(200, { products });
  } catch (err) {
    console.error("[products] public API error:", err.message);
    return sendJson(200, { products: [] });
  }
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
  const configured = supabaseConfigured();
  let supabaseReachable = null;
  if (configured) {
    try {
      const probe = await fetch(`${process.env.SUPABASE_URL.trim().replace(/\/$/, "")}/rest/v1/leads?select=id&limit=0`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
          authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY.trim()}`,
        },
      });
      supabaseReachable = probe.ok;
    } catch {
      supabaseReachable = false;
    }
  }
  const storageBackend = configured ? "supabase" : "jsonl";
  const warnings = [];
  if (storageBackend === "jsonl") warnings.push("storage backend is jsonl on Cloudflare Pages - leads will not persist; configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  if (configured && supabaseReachable === false) warnings.push("Supabase configured but unreachable");
  if (!resolveInboxEmail()) warnings.push("no CONTACT_INBOX_EMAIL/ADMIN_EMAIL configured - enquiry notifications disabled");
  return sendJson(200, {
    ok: configured && supabaseReachable !== false,
    inboxConfigured: Boolean(resolveInboxEmail()),
    supabaseConfigured: configured,
    storageBackend,
    storageDurable: configured,
    supabaseReachable,
    warnings,
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
    if (pathname === "/api/products") return await handleProducts(req);
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

    // /api/portal/tickets/:id/replies
    const ticketRepliesMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)\/replies$/);
    if (ticketRepliesMatch) {
      return await handlePortalTicketById(req, ticketRepliesMatch[1]);
    }

    // GET /api/portal/tickets/:id
    const ticketGetMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketGetMatch && req.method === "GET") {
      return await handlePortalTicketById(req, ticketGetMatch[1]);
    }

    // PATCH /api/portal/tickets/:id
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

    // Portal: digests
    if (pathname === "/api/portal/digests" && req.method === "GET") {
      return await handlePortalDigests(req);
    }

    // Projects (Phase 3)
    if (pathname === "/api/portal/projects") return await handlePortalProjects(req);

    // Admin client management
    if (pathname === "/admin/clients") return await handleAdminClients(req);
    const digestMatch = pathname.match(/^\/admin\/clients\/([a-f0-9-]+)\/send-digest$/);
    if (digestMatch && req.method === "POST") {
      return await handleAdminClientDigest(req, digestMatch[1]);
    }

    // Proposals
    if (pathname === "/admin/proposals" && req.method === "GET") return await handleAdminProposalsPage(req);
    if (pathname === "/admin/proposals" && req.method === "POST") return await handleAdminCreateProposal(req);
    // Leads pipeline
    if (pathname === "/admin/pipeline" && req.method === "GET") return await handleAdminPipelinePage(req);
    const cfLeadStatusMatch = pathname.match(/^\/(?:admin\/leads|api\/leads|admin\/pipeline)\/([a-f0-9-]+)$/);
    if (cfLeadStatusMatch && req.method === "PATCH") return await handleAdminLeadStatus(req, cfLeadStatusMatch[1]);
    const propMatch = pathname.match(/^\/api\/proposals\/([a-f0-9-]+)$/);
    if (propMatch && req.method === "GET") return await handleGetProposal(req, propMatch[1]);
    const propAcceptMatch = pathname.match(/^\/api\/proposals\/([a-f0-9-]+)\/accept$/);
    if (propAcceptMatch && req.method === "POST") return await handleAcceptProposal(req, propAcceptMatch[1]);

    // ── Case Studies CMS (admin) ──────────────────────────────────────
    if (pathname === "/admin/case-studies" && (req.method === "GET" || req.method === "POST")) {
      return await handleAdminCaseStudies(req);
    }
    const csMatch = pathname.match(/^\/admin\/case-studies\/([a-f0-9-]+)$/);
    if (csMatch && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      return await handleAdminCaseStudyById(req, csMatch[1]);
    }

    // ── Products CMS (admin) ──────────────────────────────────────────
    if (pathname === "/admin/products" && (req.method === "GET" || req.method === "POST")) {
      return await handleAdminProducts(req);
    }
    const prodMatch = pathname.match(/^\/admin\/products\/([a-f0-9-]+)$/);
    if (prodMatch && (req.method === "GET" || req.method === "PATCH" || req.method === "DELETE")) {
      return await handleAdminProductById(req, prodMatch[1]);
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