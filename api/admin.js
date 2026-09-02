// ============================================================================
// Admin API router — consolidates 6 former functions into 1 to stay under
// Vercel Hobby 12-function limit. Rewrites in vercel.json map old paths:
//   /api/admin/login       -> /api/admin?resource=login
//   /api/admin/leads       -> /api/admin?resource=leads
//   /api/admin/audits      -> /api/admin?resource=audits
//   /api/admin/products    -> /api/admin?resource=products
//   /api/admin/case-studies-> /api/admin?resource=case-studies
//   /api/slack             -> /api/admin?resource=slack
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import {
  getSupabase,
  json,
  corsResponse,
  getAuthUser,
  sanitize,
  makeId,
  verifyAdminToken,
  getAllowedOrigin,
} from "./_lib.js";
import { scoreLead } from "./_scoring.js";
import { config as appConfig } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { timingSafeEqual } from "../lib/security.js";
import { createToken as libCreateToken } from "../lib/auth.js";

export const config = { maxDuration: 15 };

// ---------------------------------------------------------------------------
// Login — POST /api/admin/login
// ---------------------------------------------------------------------------
if (!appConfig.jwtSecret) {
  logger.error("FATAL: JWT_SECRET environment variable is required");
}
let USERS = [];
try {
  if (appConfig.adminUsersRaw) {
    USERS = JSON.parse(appConfig.adminUsersRaw);
  }
} catch (e) {
  logger.error("Failed to parse ADMIN_USERS env var", { error: e.message });
}
if (USERS.length === 0) {
  logger.warn("No admin users configured. Set ADMIN_USERS env var.");
}
const loginAttempts = new Map();
const LOGIN_MAX = 10;
const LOGIN_WINDOW = 60 * 1000;
function loginIpOf(req) {
  return (
    req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    req?.headers?.get?.("cf-connecting-ip") ||
    "unknown"
  );
}
function checkLoginRate(req) {
  const now = Date.now();
  const ip = loginIpOf(req);
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_WINDOW });
    return true;
  }
  return entry.count < LOGIN_MAX;
}
function recordLoginFailure(req) {
  const now = Date.now();
  const ip = loginIpOf(req);
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW });
  } else {
    entry.count++;
  }
}
async function createToken(payload) {
  // delegate to hardened lib/auth (constant-time compare, ephemeral secret fallback)
  return libCreateToken(payload);
}
async function handleLogin(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, req);
  }
  if (!checkLoginRate(req)) {
    return json({ ok: false, error: "Too many login attempts. Try again in a minute." }, 429, req);
  }
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { email, password } = body;
  if (!email || !password) {
    return json({ ok: false, error: "Email and password are required." }, 400, req);
  }
  // constant-time credential check to avoid user enumeration via timing
  let matchedUser = null;
  for (const u of USERS) {
    const emailMatch = timingSafeEqual(u.email.toLowerCase(), String(email).toLowerCase());
    const passMatch = timingSafeEqual(String(u.password), String(password));
    if (emailMatch && passMatch) { matchedUser = u; break; }
  }
  if (!matchedUser) {
    // still do a dummy compare to keep timing uniform when USERS empty
    timingSafeEqual("dummy", String(password));
    recordLoginFailure(req);
    logger.warn("login failed", { email: String(email).toLowerCase() });
    return json({ ok: false, error: "Invalid email or password." }, 401, req);
  }
  logger.info("login success", { email: matchedUser.email, role: matchedUser.role });
  const token = await createToken({
    sub: matchedUser.email,
    name: matchedUser.name,
    role: matchedUser.role,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });
  return json({
    ok: true,
    token,
    user: { email: matchedUser.email, name: matchedUser.name, role: matchedUser.role },
  }, 200, req);
}

// ---------------------------------------------------------------------------
// Leads — /api/admin/leads
// ---------------------------------------------------------------------------
function getAnonSupabase() {
  return createClient(appConfig.supabaseUrl || "", appConfig.supabaseAnonKey || "", { auth: { persistSession: false } });
}
function getAdminSupabase() {
  return createClient(appConfig.supabaseUrl || "", appConfig.supabaseServiceKey || appConfig.supabaseAnonKey || "", { auth: { persistSession: false } });
}
async function handleLeads(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400, req); }
    const lead = {
      name: sanitize(body.name, 120),
      email: sanitize(body.email, 160),
      phone: sanitize(body.phone, 40),
      company: sanitize(body.company, 160),
      service: sanitize(body.service, 120),
      message: sanitize(body.message, 5000),
      status: "new",
      source: sanitize(body.source, 40) || "contact-form",
    };
    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return json({ ok: false, error: "Valid email is required" }, 400, req);
    }
    // dedup: if same email+service within 5 min, return existing (prevents double-insert from legacy contact form)
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: dup } = await getAnonSupabase().from("leads").select("id").eq("email", lead.email).eq("service", lead.service).gte("created_at", since).limit(1).maybeSingle();
      if (dup) return json({ ok: true, lead: dup, deduped: true }, 201, req);
    } catch {}
    const scored = scoreLead(lead);
    lead.lead_score = scored.lead_score;
    lead.assigned_role = scored.assigned_role;
    const { data, error } = await getAnonSupabase().from("leads").insert(lead).select().single();
    if (error) {
      logger.error("lead insert error", { error: error.message });
      return json({ ok: false, error: "Failed to save lead" }, 500, req);
    }
    logger.info("lead created via admin API", { email: lead.email, source: lead.source, score: scored.lead_score });
    // event log (best-effort)
    try { await getAnonSupabase().from("events").insert({ type: "lead_created", path: "/api/admin/leads", meta: { source: lead.source, service: lead.service } }); } catch {}
    return json({ ok: true, lead: data }, 201, req);
  }
  const user = await getAuthUser(req);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401, req);
  if (req.method === "GET") {
    const url = new URL(req.url, 'https://dutaintegra.my');
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("q");
    let query = getAdminSupabase().from("leads").select("*").order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    if (search) {
      const safe = String(search).replace(/[^\w\s@.+-]/g, " ").trim().slice(0, 100);
      if (safe) {
        query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%,service.ilike.%${safe}%`);
      }
    }
    const { data: leads, error } = await query;
    if (error) {
      console.error("Supabase query error:", JSON.stringify(error));
      return json({ ok: false, error: "Failed to fetch leads: " + error.message }, 500, req);
    }
    const { data: allLeads } = await getAdminSupabase().from("leads").select("status");
    const counts = {
      all: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === "new").length || 0,
      contacted: allLeads?.filter((l) => l.status === "contacted").length || 0,
      closed: allLeads?.filter((l) => l.status === "closed").length || 0,
    };
    return json({ ok: true, leads, total: leads.length, counts }, 200, req);
  }
  if (req.method === "PATCH") {
    const url = new URL(req.url, 'https://dutaintegra.my');
    const id = url.searchParams.get("id");
    if (!id) return json({ ok: false, error: "Lead ID required" }, 400, req);
    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400, req); }
    const update = {};
    if (body.status) update.status = body.status;
    if (body.note) update.note = sanitize(body.note);
    update.updated_at = new Date().toISOString();
    const { data, error } = await getAdminSupabase().from("leads").update(update).eq("id", id).select().single();
    if (error) {
      console.error("Supabase update error:", error);
      return json({ ok: false, error: "Failed to update lead" }, 500, req);
    }
    return json({ ok: true, lead: data }, 200, req);
  }
  return json({ ok: false, error: "Method not allowed" }, 405, req);
}

// ---------------------------------------------------------------------------
// Audits — GET /api/admin/audits
// ---------------------------------------------------------------------------
async function buildStats(supabase) {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [auditsRes, leadsRes, eventsRes] = await Promise.all([
    supabase.from("audit_reports").select("score, email, followup_sent_at, created_at").gte("created_at", since30),
    supabase.from("leads").select("source").gte("created_at", since30),
    supabase.from("events").select("type").gte("created_at", since30),
  ]);
  const audits = auditsRes.data || [];
  const scores = audits.map((a) => a.score).filter((n) => typeof n === "number");
  const events = {};
  (eventsRes.data || []).forEach((e) => { events[e.type] = (events[e.type] || 0) + 1; });
  return {
    window: "30d",
    audits30d: audits.length,
    leadsFromAudit: (leadsRes.data || []).filter((l) => l.source === "free-audit").length,
    avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
    followupsSent: audits.filter((a) => a.followup_sent_at).length,
    events,
  };
}
async function handleAudits(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (!(await getAuthUser(req))) return json({ ok: false, error: "Unauthorized" }, 401);
  const supabase = getSupabase();
  const [{ data, error }, stats] = await Promise.all([
    supabase.from("audit_reports").select("id, share_slug, domain, brand_name, industry, email, score, grade, followup_sent_at, created_at").order("created_at", { ascending: false }).limit(200),
    buildStats(supabase),
  ]);
  if (error) return json({ ok: false, error: "Failed to fetch audits" }, 500);
  return json({ ok: true, audits: data || [], stats });
}

// ---------------------------------------------------------------------------
// Admin Products — /api/admin/products
// ---------------------------------------------------------------------------
const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
function cleanTags(input) {
  if (Array.isArray(input)) return input.map((t) => sanitize(t, 40)).filter(Boolean).slice(0, 8);
  return String(input || "").split(",").map((t) => sanitize(t, 40)).filter(Boolean).slice(0, 8);
}
function cleanMetrics(input) {
  let rows = input;
  if (typeof input === "string") { try { rows = JSON.parse(input); } catch { rows = []; } }
  if (!Array.isArray(rows)) return [];
  return rows.map((m) => ({ value: sanitize(m?.value, 24), label: sanitize(m?.label, 60) })).filter((m) => m.value && m.label).slice(0, 4);
}
function productPayload(body) {
  const p = {};
  if (body.name !== undefined) p.name = sanitize(body.name, 120);
  if (body.tagline !== undefined) p.tagline = sanitize(body.tagline, 160);
  if (body.category !== undefined) p.category = sanitize(body.category, 120);
  if (body.description_en !== undefined) p.description_en = sanitize(body.description_en, 2000);
  if (body.description_ms !== undefined) p.description_ms = sanitize(body.description_ms, 2000);
  if (body.tags !== undefined) p.tags = cleanTags(body.tags);
  if (body.metrics !== undefined) p.metrics = cleanMetrics(body.metrics);
  if (body.preview_url !== undefined) p.preview_url = sanitize(body.preview_url, 500);
  if (body.image_url !== undefined) p.image_url = sanitize(body.image_url, 500);
  if (body.contact_cta_en !== undefined) p.contact_cta_en = sanitize(body.contact_cta_en, 120);
  if (body.contact_cta_ms !== undefined) p.contact_cta_ms = sanitize(body.contact_cta_ms, 120);
  if (body.status !== undefined) p.status = body.status === "published" ? "published" : "draft";
  if (body.sort_order !== undefined) p.sort_order = Number(body.sort_order) || 0;
  return p;
}
async function listProducts(req) {
  const supabase = getSupabase();
  const url = new URL(req.url, 'https://dutaintegra.my');
  const status = url.searchParams.get("status");
  let query = supabase.from("products").select("*").order("sort_order").order("created_at");
  if (status === "published" || status === "draft") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return json({ ok: false, error: "Failed to fetch products" }, 500);
  return json({ ok: true, products: data || [] });
}
async function createProduct(req) {
  const supabase = getSupabase();
  let body; try { body = await req.json(); } catch { body = {}; }
  const payload = productPayload(body);
  if (!payload.name) return json({ ok: false, error: "Product name is required." }, 400);
  const { data, error } = await supabase.from("products").insert(payload).select().single();
  if (error) { console.error("products insert:", error); return json({ ok: false, error: "Failed to create product" }, 500); }
  return json({ ok: true, product: data }, 201);
}
async function updateProduct(req) {
  const supabase = getSupabase();
  const id = new URL(req.url, 'https://dutaintegra.my').searchParams.get("id");
  if (!id) return json({ ok: false, error: "Product id required" }, 400);
  let body; try { body = await req.json(); } catch { body = {}; }
  const payload = productPayload(body);
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select().single();
  if (error) { console.error("products update:", error); return json({ ok: false, error: "Failed to update product" }, 500); }
  return json({ ok: true, product: data });
}
async function deleteProduct(req) {
  const supabase = getSupabase();
  const id = new URL(req.url, 'https://dutaintegra.my').searchParams.get("id");
  if (!id) return json({ ok: false, error: "Product id required" }, 400);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return json({ ok: false, error: "Failed to delete product" }, 500);
  return json({ ok: true });
}
async function uploadImage(req) {
  const supabase = getSupabase();
  let form; try { form = await req.formData(); } catch { return json({ ok: false, error: "Expected multipart/form-data with a `file` field" }, 400); }
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ ok: false, error: "No file provided" }, 400);
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return json({ ok: false, error: "Only JPG, PNG, WebP or SVG allowed" }, 400);
  if (file.size > MAX_IMAGE_BYTES) return json({ ok: false, error: "Image must be under 3 MB" }, 400);
  const buffer = new Uint8Array(await file.arrayBuffer());
  const path = `${Date.now()}-${makeId(6)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) { console.error("storage upload:", error); return json({ ok: false, error: "Upload failed — check SUPABASE_SERVICE_ROLE_KEY" }, 500); }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return json({ ok: true, url: data.publicUrl });
}
async function handleProductsAdmin(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method === "POST" && new URL(req.url, 'https://dutaintegra.my').searchParams.get("upload")) {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return uploadImage(req);
  }
  if (req.method === "GET") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return listProducts(req);
  }
  if (req.method === "POST") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return createProduct(req);
  }
  if (req.method === "PATCH") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return updateProduct(req);
  }
  if (req.method === "DELETE") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return deleteProduct(req);
  }
  return json({ ok: false, error: "Method not allowed" }, 405);
}

// ---------------------------------------------------------------------------
// Admin Case Studies — /api/admin/case-studies
// ---------------------------------------------------------------------------
function cleanTagsCS(v) { if (!Array.isArray(v)) return []; return v.map((t) => sanitize(t, 40)).filter(Boolean).slice(0, 8); }
function cleanMetricsCS(v) { if (!Array.isArray(v)) return []; return v.filter((m) => m && typeof m === "object").slice(0, 4).map((m) => ({ value: sanitize(m.value, 24), label: sanitize(m.label, 60) })).filter((m) => m.value && m.label); }
function cleanOutcomes(v) { if (!Array.isArray(v)) return []; return v.map((s) => sanitize(s, 140)).filter(Boolean).slice(0, 6); }
function pickCS(body) {
  return {
    client_name: sanitize(body.client_name, 80),
    category: sanitize(body.category, 120),
    summary_en: sanitize(body.summary_en, 600),
    summary_ms: sanitize(body.summary_ms, 600),
    image_url: sanitize(body.image_url, 500),
    metrics: cleanMetricsCS(body.metrics),
    outcomes: cleanOutcomes(body.outcomes),
    tags: cleanTagsCS(body.tags),
    detail_url: sanitize(body.detail_url, 300),
    status: body.status === "published" ? "published" : "draft",
    sort_order: Number.isFinite(+body.sort_order) ? Math.trunc(+body.sort_order) : 0,
  };
}
async function handleCaseStudiesAdmin(req) {
  if (req.method === "OPTIONS") return corsResponse();
  const user = await getAuthUser(req);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
  const supabase = getSupabase();
  const url = new URL(req.url, 'https://dutaintegra.my');
  const id = url.searchParams.get("id");
  if (req.method === "GET") {
    const { data, error } = await supabase.from("case_studies").select("*").order("sort_order").order("created_at");
    if (error) return json({ ok: false, error: "Failed to fetch case studies" }, 500);
    return json({ ok: true, caseStudies: data || [] });
  }
  let body = {}; try { body = await req.json(); } catch { /* empty */ }
  if (req.method === "POST") {
    const row = pickCS(body);
    if (!row.client_name) return json({ ok: false, error: "Client name is required" }, 400);
    const { data, error } = await supabase.from("case_studies").insert(row).select("id").single();
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, id: data.id });
  }
  if (req.method === "PATCH") {
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    const patch = Object.keys(body).length === 1 && "status" in body ? { status: body.status === "published" ? "published" : "draft" } : pickCS(body);
    const { error } = await supabase.from("case_studies").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }
  if (req.method === "DELETE") {
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    const { error } = await supabase.from("case_studies").delete().eq("id", id);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }
  return json({ ok: false, error: "Method not allowed" }, 405);
}

// ---------------------------------------------------------------------------
// Slack — POST /api/slack (now via /api/admin?resource=slack)
// ---------------------------------------------------------------------------
function slackCorsResponse(req) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getAllowedOrigin(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    },
  });
}
async function handleSlack(req) {
  if (req.method === "OPTIONS") return slackCorsResponse(req);
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return json({ ok: false, error: "Slack not configured — set SLACK_WEBHOOK_URL on Vercel." }, 501);
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const user = token ? await verifyAdminToken(token) : null;
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
  let body; try { body = await req.json(); } catch { body = {}; }
  const text = String(body.text || "").trim().slice(0, 3000);
  if (!text) return json({ ok: false, error: "Message text is required." }, 400);
  try {
    const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, username: "Duta Integra Admin", icon_emoji: ":briefcase:" }) });
    if (!res.ok) {
      console.error("Slack webhook error:", res.status, await res.text());
      return json({ ok: false, error: "Slack rejected the message (" + res.status + ")" }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("Slack post error:", err);
    return json({ ok: false, error: "Failed to reach Slack." }, 502);
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function handler(req) {
  if (req.method === "OPTIONS") {
    // Slack has custom CORS, others use generic
    const url = new URL(req.url, 'https://dutaintegra.my');
    const r = url.searchParams.get("resource") || "";
    if (r === "slack") return slackCorsResponse(req);
    return corsResponse(req);
  }
  const url = new URL(req.url, 'https://dutaintegra.my');
  let resource = url.searchParams.get("resource") || url.searchParams.get("via") || "";
  if (!resource) {
    const path = url.pathname;
    if (path.includes("/login")) resource = "login";
    else if (path.includes("/leads")) resource = "leads";
    else if (path.includes("/audits")) resource = "audits";
    else if (path.includes("/case-studies")) resource = "case-studies";
    else if (path.includes("/products")) resource = "products";
    else if (path.includes("/slack")) resource = "slack";
  }
  // Normalize aliases
  if (resource === "caseStudies") resource = "case-studies";

  switch (resource) {
    case "login":
      return handleLogin(req);
    case "leads":
      return handleLeads(req);
    case "audits":
      return handleAudits(req);
    case "products":
      return handleProductsAdmin(req);
    case "case-studies":
      return handleCaseStudiesAdmin(req);
    case "slack":
      return handleSlack(req);
    default:
      return json({ ok: false, error: "Not found: unknown admin resource" }, 404);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
