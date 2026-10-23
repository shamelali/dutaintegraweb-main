/**
 * Cloudflare-compatible Autonomous Ops — aggregate event feed + PDPA consent tracking.
 *
 * Cloudflare Pages Functions have no durable local filesystem, so JSONL storage
 * is not available. Feed endpoints return empty data; event ingestion is disabled
 * unless backed by Supabase/KV (future).
 *
 * All handlers return Response objects (Cloudflare Workers compatible).
 */

import { randomUUID } from "node:crypto";

// ── anonymized client labels ─────────────────────────────────────────────────

const CLIENT_ANON = [
  { region: "KL", industry: "Fintech" },
  { region: "Penang", industry: "Manufacturing" },
  { region: "Johor", industry: "Logistics" },
  { region: "Sarawak", industry: "Energy" },
  { region: "KL", industry: "Healthcare" },
  { region: "N. Sembilan", industry: "Retail" },
];

// ── event categories (for realistic demo data) ──────────────────────────────

const EVENT_TEMPLATES = [
  { cat: "disk", action: "Disk cleanup", detail: "Cleared 2.3 GB temp files", severity: "info", auto: true },
  { cat: "backup", action: "Backup verified", detail: "Full backup integrity check passed", severity: "info", auto: true },
  { cat: "security", action: "Threat blocked", detail: "Brute-force SSH attempt contained", severity: "warning", auto: true },
  { cat: "patch", action: "Patch applied", detail: "Critical CVE-2026-1234 remediated", severity: "info", auto: true },
  { cat: "uptime", action: "Uptime restored", detail: "Service restart after health check failure", severity: "info", auto: true },
  { cat: "scale", action: "Resource scaled", detail: "CPU threshold exceeded — added instance", severity: "info", auto: true },
  { cat: "ssl", action: "SSL renewed", detail: "Certificate renewed 28 days before expiry", severity: "info", auto: true },
  { cat: "memory", action: "Memory leak patched", detail: "Process restarted, heap stabilized", severity: "info", auto: true },
  { cat: "access", action: "Access audit", detail: "3 inactive accounts deprovisioned", severity: "info", auto: true },
  { cat: "firewall", action: "Firewall updated", detail: "New rule added — block known scanner IP range", severity: "info", auto: true },
  { cat: "database", action: "DB optimized", detail: "Index rebuild completed, query time -40%", severity: "info", auto: true },
  { cat: "cost", action: "Cost alert", detail: "AWS spend 12% above forecast — flagged for review", severity: "warning", auto: false },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function randomClient() {
  return CLIENT_ANON[Math.floor(Math.random() * CLIENT_ANON.length)];
}

function randomTemplate() {
  return EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
}

// ── seed demo events ─────────────────────────────────────────────────────────

export async function seedDemoEvents() {
  // No durable storage in Cloudflare Pages Functions; return empty
  return [];
}

// ── event ingestion (disabled without durable storage) ───────────────────────

export async function ingestEvent(event) {
  throw new Error("Event ingestion not available without durable storage (Supabase/KV)");
}

export async function getFeed(limit = 20) {
  // No durable storage; return empty feed with zero stats
  return {
    events: [],
    stats: {
      total: 0,
      last24h: 0,
      autoResolved: 0,
      warnings: 0,
      categories: {},
    },
  };
}

export async function recordEvent(event) {
  throw new Error("Event recording not available without durable storage (Supabase/KV)");
}

export async function rotateEvents() {
  return 0;
}

// ── PDPA consent management (disabled without durable storage) ───────────────

export async function recordConsent(email, consent) {
  throw new Error("Consent storage not available without durable storage (Supabase/KV)");
}

export async function getConsentStatus(email) {
  return null;
}

export async function getConsentStats() {
  return { total: 0, optedIn: 0, optedOut: 0 };
}

// ── HTTP handlers (Cloudflare Workers compatible, return Response objects) ───

/**
 * GET /api/ops/feed — returns the live event feed with aggregate stats.
 * Query params: ?limit=N (default 20, max 50)
 */
export async function handleFeed(req) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 50);
  const data = await getFeed(limit);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
    },
  });
}

/**
 * POST /api/ops/consent — record PDPA consent for the feed.
 * Body: { email, consent: boolean, consentText: string }
 */
export async function handleConsent(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const email = body.email?.trim().toLowerCase();
  const consent = body.consent;
  const consentText = body.consentText;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Valid email is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (typeof consent !== "boolean") {
    return new Response(JSON.stringify({ error: "consent must be a boolean" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!consentText || consentText.length < 20) {
    return new Response(JSON.stringify({ error: "consentText must match the displayed PDPA consent text" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const result = await recordConsent(email, consent);
    return new Response(JSON.stringify({ ok: true, consent: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

/**
 * POST /api/ops/events — ingest events from monitoring agents.
 * Requires x-admin-token header matching ADMIN_TOKEN env var.
 * Body: { cat, action, detail?, severity?, auto?, client_region?, client_industry? }
 */
export async function handleIngestEvent(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.cat || !body.action) {
    return new Response(JSON.stringify({ error: "cat and action are required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const VALID_CATS = ["disk", "backup", "security", "patch", "uptime", "scale", "ssl", "memory", "access", "firewall", "database", "cost", "ticket"];
  if (!VALID_CATS.includes(body.cat)) {
    return new Response(JSON.stringify({ error: `Invalid cat. Must be one of: ${VALID_CATS.join(", ")}` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const VALID_SEVERITIES = ["info", "warning", "error"];
  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    return new Response(JSON.stringify({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const record = await ingestEvent(body);
    return new Response(JSON.stringify({ ok: true, event: record }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}
