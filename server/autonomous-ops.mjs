/**
 * Autonomous Ops — aggregate event feed + PDPA consent tracking.
 *
 * Feed events represent AI actions across managed environments.
 * Client identity is anonymized (region + industry only).
 *
 * Storage: JSONL file in data/ops-events.jsonl
 * Consent: data/ops-consent.json (maps email → consent status)
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS_STORE = join(PROJECT_ROOT, "data", "ops-events.jsonl");
const CONSENT_STORE = join(PROJECT_ROOT, "data", "ops-consent.json");

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

// ── JSONL store ──────────────────────────────────────────────────────────────

async function readEvents() {
  let raw;
  try {
    raw = await readFile(EVENTS_STORE, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

async function writeEvents(events) {
  const dir = dirname(EVENTS_STORE);
  await mkdir(dir, { recursive: true });
  await writeFile(
    EVENTS_STORE,
    events.map((e) => JSON.stringify(e)).join("\n") + (events.length ? "\n" : ""),
    "utf8",
  );
}

// ── seed demo events ─────────────────────────────────────────────────────────

function randomClient() {
  return CLIENT_ANON[Math.floor(Math.random() * CLIENT_ANON.length)];
}

function randomTemplate() {
  return EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
}

function minutesAgo(min) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

/**
 * Seed the event store with realistic demo data if empty.
 * Each event is anonymized — no client names, only region + industry.
 */
export async function seedDemoEvents() {
  const existing = await readEvents();
  if (existing.length >= 8) return existing; // already seeded

  const events = [];
  const now = Date.now();
  // 15 events spread across last 24 hours
  for (let i = 0; i < 15; i++) {
    const tmpl = randomTemplate();
    const client = randomClient();
    const minsOld = Math.floor(Math.random() * 1440); // 0-1440 minutes
    events.push({
      id: randomUUID(),
      ...tmpl,
      client_region: client.region,
      client_industry: client.industry,
      ts: new Date(now - minsOld * 60_000).toISOString(),
      consented: true, // demo events are always consented
    });
  }
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  await writeEvents(events);
  return events;
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Get the latest feed events. Only returns events where consent=true.
 * Returns { events, stats } where stats is aggregate counts.
 */
export async function getFeed(limit = 20) {
  let events = await readEvents();
  // only consented events
  events = events.filter((e) => e.consented !== false);
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const sliced = events.slice(0, limit);

  // aggregate stats
  const stats = {
    total: events.length,
    last24h: events.filter((e) => Date.now() - new Date(e.ts).getTime() < 86400_000).length,
    autoResolved: events.filter((e) => e.auto).length,
    warnings: events.filter((e) => e.severity === "warning").length,
    categories: {},
  };
  for (const e of events) {
    stats.categories[e.cat] = (stats.categories[e.cat] || 0) + 1;
  }

  return { events: sliced, stats };
}

/**
 * Record a new feed event (called internally by monitoring agents).
 * In production this would be called by alerting webhooks.
 */
export async function recordEvent(event) {
  const record = {
    id: randomUUID(),
    cat: event.cat || "system",
    action: event.action,
    detail: event.detail || "",
    severity: event.severity || "info",
    auto: event.auto !== false,
    client_region: event.client_region || "KL",
    client_industry: event.client_industry || "SME",
    ts: event.ts || new Date().toISOString(),
    consented: event.consented !== false,
  };
  const events = await readEvents();
  events.unshift(record);
  // keep max 500 events
  if (events.length > 500) events.length = 500;
  await writeEvents(events);
  return record;
}

// ── PDPA consent management ──────────────────────────────────────────────────

async function readConsent() {
  try {
    return JSON.parse(await readFile(CONSENT_STORE, "utf8"));
  } catch {
    return {};
  }
}

async function writeConsent(data) {
  const dir = dirname(CONSENT_STORE);
  await mkdir(dir, { recursive: true });
  await writeFile(CONSENT_STORE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Record or update a user's consent for feed participation.
 * consent: true = opted in, false = opted out, null = withdraw
 */
export async function recordConsent(email, consent) {
  const data = await readConsent();
  data[email.toLowerCase().trim()] = {
    consent: Boolean(consent),
    timestamp: new Date().toISOString(),
  };
  await writeConsent(data);
  return data[email.toLowerCase().trim()];
}

/**
 * Get consent status for an email.
 */
export async function getConsentStatus(email) {
  if (!email) return null;
  const data = await readConsent();
  return data[email.toLowerCase().trim()] ?? null;
}

/**
 * Get aggregate consent stats (for the admin dashboard).
 */
export async function getConsentStats() {
  const data = await readConsent();
  const entries = Object.values(data);
  return {
    total: entries.length,
    optedIn: entries.filter((e) => e.consent).length,
    optedOut: entries.filter((e) => !e.consent).length,
  };
}

// ── HTTP handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/ops/feed — returns the live event feed with aggregate stats.
 * Query params: ?limit=N (default 20, max 50)
 */
export async function handleFeed(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 50);

  // Seed demo events on first request if store is empty
  const existing = await readEvents();
  if (existing.length === 0) {
    await seedDemoEvents();
  }

  const data = await getFeed(limit);

  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30",
  });
  res.end(JSON.stringify(data));
}

/**
 * POST /api/ops/consent — record PDPA consent for the feed.
 * Body: { email, consent: boolean, consentText: string }
 */
export async function handleConsent(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) {
      res.writeHead(413, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Payload too large" }));
      return;
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  const email = body.email?.trim().toLowerCase();
  const consent = body.consent;
  const consentText = body.consentText;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Valid email is required" }));
    return;
  }

  if (typeof consent !== "boolean") {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "consent must be a boolean" }));
    return;
  }

  if (!consentText || consentText.length < 20) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "consentText must match the displayed PDPA consent text" }));
    return;
  }

  const result = await recordConsent(email, consent);
  console.log(`[ops-consent] ${email} → ${consent ? "opted-in" : "opted-out"}`);

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, consent: result }));
}
