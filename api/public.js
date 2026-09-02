// ============================================================================
// Public API router — consolidates 5 former functions into 1 to stay under
// Vercel Hobby 12-function limit. Rewrites in vercel.json map old paths:
//   /api/products     -> /api/public?resource=products
//   /api/case-studies -> /api/public?resource=case-studies
//   /api/report       -> /api/public?resource=report
//   /api/track        -> /api/public?resource=track
//   /api/health       -> /api/public?resource=health
// Direct path matches also work (pathname inspection fallback).
// ============================================================================

import { getSupabase, json, corsResponse, healthCheck } from "./_lib.js";
import { pingSupabase } from "./lib/supabase.js";
import { logger } from "./lib/logger.js";
import { config as appConfig } from "./lib/config.js";

export const config = { maxDuration: 10 };

// ---------------------------------------------------------------------------
// Products — GET /api/products
// ---------------------------------------------------------------------------
let productsCache = { at: 0, data: null };
const PRODUCTS_CACHE_MS = 30_000;

async function handleProducts(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  if (productsCache.data && Date.now() - productsCache.at < PRODUCTS_CACHE_MS) {
    return json({ ok: true, products: productsCache.data });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(
      "name, tagline, category, description_en, description_ms, tags, metrics, preview_url, image_url, contact_cta_en, contact_cta_ms, sort_order"
    )
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");

  if (error) {
    logger.error("public products failed", { error: error.message });
    return json({ ok: false, error: "Failed to load products" }, 500);
  }

  productsCache = { at: Date.now(), data: data || [] };
  return json({ ok: true, products: productsCache.data });
}

// ---------------------------------------------------------------------------
// Case Studies — GET /api/case-studies
// ---------------------------------------------------------------------------
let caseStudiesCache = { at: 0, data: null };
const CASE_CACHE_MS = 30_000;

async function handleCaseStudies(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  if (caseStudiesCache.data && Date.now() - caseStudiesCache.at < CASE_CACHE_MS) {
    return json({ ok: true, caseStudies: caseStudiesCache.data });
  }

  const { data, error } = await getSupabase()
    .from("case_studies")
    .select(
      "client_name, category, summary_en, summary_ms, image_url, metrics, outcomes, tags, detail_url, sort_order"
    )
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");

  if (error) {
    logger.error("public case-studies failed", { error: error.message });
    return json({ ok: false, error: "Failed to load case studies" }, 500);
  }

  caseStudiesCache = { at: Date.now(), data: data || [] };
  return json({ ok: true, caseStudies: caseStudiesCache.data });
}

// ---------------------------------------------------------------------------
// Report — GET /api/report?slug=abc123
// ---------------------------------------------------------------------------
let reportCache = { slug: null, at: 0, payload: null };
const REPORT_CACHE_MS = 60_000;

async function handleReport(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const slug = String(new URL(req.url).searchParams.get("slug") || "").trim();
  if (!slug || !/^[a-z0-9]{6,16}$/i.test(slug)) {
    return json({ ok: false, error: "Invalid report link." }, 400);
  }

  if (reportCache.slug === slug && Date.now() - reportCache.at < REPORT_CACHE_MS) {
    return json(reportCache.payload);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_reports")
    .select("report")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("report lookup failed", { error: error.message });
    return json({ ok: false, error: "Could not load that report." }, 500);
  }
  if (!data) {
    return json({ ok: false, error: "Report not found — the link may have expired." }, 404);
  }

  reportCache = { slug, at: Date.now(), payload: { ok: true, report: data.report } };
  return json(reportCache.payload);
}

// ---------------------------------------------------------------------------
// Track — POST /api/track
// ---------------------------------------------------------------------------
const ALLOWED_TYPES = new Set(["page_view", "preview_register", "preview_click"]);
let hits = 0;
let windowStart = Date.now();

function rateOk() {
  const now = Date.now();
  if (now - windowStart > 60000) { hits = 0; windowStart = now; }
  return ++hits <= 600;
}

async function handleTrack(req) {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!rateOk()) return json({ ok: false }, 429);

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const type = String(body.type || "");
  if (!ALLOWED_TYPES.has(type)) return json({ ok: false, error: "Unknown event type" }, 400);

  const ua = req.headers.get("user-agent") || "";
  if (!ua && type === "page_view" && !req.headers.get("referer")) {
    return json({ ok: true });
  }

  const { error } = await getSupabase()
    .from("events")
    .insert({
      type,
      path: String(body.path || "/").slice(0, 300),
      meta: typeof body.meta === "object" && body.meta !== null ? body.meta : {},
    });
  if (error) {
    logger.error("track insert failed", { error: error.message });
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Health — GET /api/health  (with DB + config checks for autonomous monitoring)
// ---------------------------------------------------------------------------
async function handleHealth(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, req);
  }
  const base = healthCheck();
  base.version = appConfig.version;
  base.env = appConfig.nodeEnv;
  // parallel dependency checks (non-blocking, best-effort)
  const [db] = await Promise.allSettled([pingSupabase()]);
  const checks = {
    db: db.status === "fulfilled" ? db.value : { ok: false, error: "ping failed" },
    resend: { ok: !!appConfig.resendApiKey },
    slack: { ok: !!appConfig.slackWebhookUrl },
    supabase: { ok: !!appConfig.supabaseUrl },
  };
  const healthy = checks.db.ok;
  return json({ ...base, status: healthy ? "healthy" : "degraded", checks }, healthy ? 200 : 503, req);
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse(req);

  const url = new URL(req.url);
  // Prefer explicit ?resource= from rewrites, fallback to pathname detection
  let resource = url.searchParams.get("resource") || "";
  if (!resource) {
    const path = url.pathname;
    if (path.includes("/products")) resource = "products";
    else if (path.includes("/case-studies")) resource = "case-studies";
    else if (path.includes("/report")) resource = "report";
    else if (path.includes("/track")) resource = "track";
    else if (path.includes("/health")) resource = "health";
  }

  switch (resource) {
    case "products":
      return handleProducts(req);
    case "case-studies":
    case "caseStudies":
      return handleCaseStudies(req);
    case "report":
      return handleReport(req);
    case "track":
      return handleTrack(req);
    case "health":
      return handleHealth(req);
    default:
      // If no resource, try to infer from direct /api/public call without rewrite
      // For backward compat, also accept direct pathname matches
      return json({ ok: false, error: "Not found: unknown public resource" }, 404);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
export default handler;
