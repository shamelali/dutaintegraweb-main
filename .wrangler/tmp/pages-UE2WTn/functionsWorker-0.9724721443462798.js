var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../server/handler-cloudflare.mjs
import { timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// ../server/enquiries-cloudflare.mjs
function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
__name(supabaseConfigured, "supabaseConfigured");
function supabaseHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}
__name(supabaseHeaders, "supabaseHeaders");
var LEADS_TABLE = "leads";
async function supabaseRecord(record) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${LEADS_TABLE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "return=representation" }),
    body: JSON.stringify({
      id: record.id,
      name: record.name,
      company: record.company ?? "",
      email: record.email,
      phone: record.phone ?? "",
      service: record.service ?? "",
      message: record.message ?? "",
      ip: record.ip,
      user_agent: record.userAgent,
      status: "new",
      source: "contact-form",
      created_at: record.created_at,
      emailed_at: record.emailed_at
    })
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
  return record;
}
__name(supabaseRecord, "supabaseRecord");
function fromSupabaseRow(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    service: row.service,
    message: row.message,
    ip: row.ip,
    userAgent: row.user_agent,
    created_at: row.created_at,
    emailed_at: row.emailed_at,
    status: row.status,
    leadScore: row.lead_score
  };
}
__name(fromSupabaseRow, "fromSupabaseRow");
async function supabaseList(limit) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const cap = Number.isFinite(limit) ? limit : 1e3;
  const url = `${base}/rest/v1/${LEADS_TABLE}?select=*&source=eq.contact-form&order=created_at.desc&limit=${cap}`;
  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.map(fromSupabaseRow);
}
__name(supabaseList, "supabaseList");
async function supabaseMarkEmailed(id, at) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${LEADS_TABLE}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: supabaseHeaders(),
    body: JSON.stringify({ emailed_at: at })
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
  return at;
}
__name(supabaseMarkEmailed, "supabaseMarkEmailed");
var { randomUUID } = crypto;
async function recordEnquiry(input) {
  if (!supabaseConfigured()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  const record = {
    id: randomUUID(),
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone ?? null,
    service: input.service,
    message: input.message ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    emailed_at: null
  };
  return supabaseRecord(record);
}
__name(recordEnquiry, "recordEnquiry");
async function markEnquiryEmailed(id, at = (/* @__PURE__ */ new Date()).toISOString()) {
  if (!supabaseConfigured()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return supabaseMarkEmailed(id, at);
}
__name(markEnquiryEmailed, "markEnquiryEmailed");
async function listEnquiries(limit = 50) {
  if (!supabaseConfigured()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return supabaseList(limit);
}
__name(listEnquiries, "listEnquiries");
function enquirySubject(enquiry) {
  return `New enquiry \u2014 ${enquiry.service} \u2014 ${enquiry.name}`;
}
__name(enquirySubject, "enquirySubject");
function enquiryBody(enquiry) {
  return [
    "New enquiry from the dutaintegra.my contact form.",
    "",
    `Name:    ${enquiry.name}`,
    `Company: ${enquiry.company || "\u2014"}`,
    `Email:   ${enquiry.email}`,
    `Phone:   ${enquiry.phone || "\u2014"}`,
    `Service: ${enquiry.service}`,
    "",
    "Message:",
    enquiry.message || "\u2014",
    "",
    `Received: ${enquiry.created_at}`
  ].join("\n");
}
__name(enquiryBody, "enquiryBody");
function resolveInboxEmail() {
  for (const key of ["CONTACT_INBOX_EMAIL", "ADMIN_EMAIL"]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}
__name(resolveInboxEmail, "resolveInboxEmail");
async function notifyEnquiry(enquiry) {
  const to = resolveInboxEmail();
  if (!to) return false;
  const from = process.env.EMAIL_FROM?.trim();
  const subject = enquirySubject(enquiry);
  const text = enquiryBody(enquiry);
  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, from, subject, text }, process.env.RESEND_API_KEY);
  } else if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to, from, subject, text }, process.env.BREVO_API_KEY);
  } else if (process.env.POSTMARK_SERVER_TOKEN) {
    await sendViaPostmark({ to, from, subject, text }, process.env.POSTMARK_SERVER_TOKEN);
  } else {
    return false;
  }
  await markEnquiryEmailed(enquiry.id);
  return true;
}
__name(notifyEnquiry, "notifyEnquiry");
async function assertOk(res, provider) {
  if (!res.ok) {
    throw new Error(`${provider} responded ${res.status}: ${await res.text()}`);
  }
}
__name(assertOk, "assertOk");
async function sendViaResend({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: from || "Duta Integra <no-reply@dutaintegrasolutions.com>", to, subject, text })
  });
  await assertOk(res, "resend");
}
__name(sendViaResend, "sendViaResend");
async function sendViaBrevo({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: from ? { name: "Duta Integra", email: from } : { name: "Duta Integra", email: "no-reply@dutaintegrasolutions.com" },
      to: [{ email: to }],
      subject,
      textContent: text
    })
  });
  await assertOk(res, "brevo");
}
__name(sendViaBrevo, "sendViaBrevo");
async function sendViaPostmark({ to, from, subject, text }, token) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": token, "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      From: from || "no-reply@dutaintegrasolutions.com",
      To: to,
      Subject: subject,
      TextBody: text
    })
  });
  await assertOk(res, "postmark");
}
__name(sendViaPostmark, "sendViaPostmark");

// ../server/stats.mjs
var STATS = {
  lastUpdated: "2026-09-14",
  uptime: { value: 99.9, unit: "%", label: "Platform uptime", icon: "ti ti-bolt" },
  automationsRun: { value: 12847, unit: "", label: "Automations executed", icon: "ti ti-robot" },
  complianceItems: { value: 342, unit: "", label: "Compliance items processed", icon: "ti ti-shield-check" },
  activeClients: { value: 3, unit: "", label: "Active retainer clients", icon: "ti ti-users" },
  ticketsResolved: { value: 218, unit: "", label: "Support tickets resolved", icon: "ti ti-ticket" },
  avgResponseTime: { value: 2.4, unit: "hrs", label: "Avg. response time", icon: "ti ti-clock" },
  clientSatisfaction: { value: 4.8, unit: "/5", label: "Client satisfaction", icon: "ti ti-star" },
  hoursSaved: { value: 4120, unit: "hrs", label: "Manual hours saved for clients", icon: "ti ti-clock-hour-4" }
};
function getStats() {
  return { updated: STATS.lastUpdated, stats: Object.values(STATS).filter((s) => s.label) };
}
__name(getStats, "getStats");
function handleStats(req, res) {
  const data = getStats();
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=3600"
  });
  res.end(JSON.stringify(data));
}
__name(handleStats, "handleStats");

// ../server/calculator.mjs
var TIERS = [
  {
    name: "Foundation",
    monthlyPrice: 2500,
    automationRate: 0.35,
    description: "Basic IT management + ticketing"
  },
  {
    name: "Growth",
    monthlyPrice: 5500,
    automationRate: 0.55,
    description: "Managed IT + proactive monitoring + automation"
  },
  {
    name: "AI Partner",
    monthlyPrice: 12e3,
    automationRate: 0.75,
    description: "Full AI-driven automation + strategic IT"
  }
];
var PAIN_MULTIPLIERS = {
  compliance: 1.25,
  reporting: 1.15,
  ticketing: 1.2,
  backup: 1.1,
  security: 1.15,
  onboarding: 1.1
};
var HOURS_TO_RM = 75;
function calculateSavings({ staff, manualHours, painPoints = [] }) {
  const s = Math.max(1, Number(staff) || 1);
  const mh = Math.max(0, Number(manualHours) || 0);
  const multiplier = painPoints.reduce(
    (acc, p) => acc * (PAIN_MULTIPLIERS[p] || 1),
    1
  );
  const tiers = TIERS.map((tier) => {
    const rawHoursSaved = mh * tier.automationRate * multiplier;
    const hoursSaved = Math.round(rawHoursSaved * 10) / 10;
    const monthlyCostSaved = Math.round(hoursSaved * HOURS_TO_RM);
    const annualCostSaved = monthlyCostSaved * 12;
    const roi = tier.monthlyPrice > 0 ? Math.round((monthlyCostSaved - tier.monthlyPrice) / tier.monthlyPrice * 100) : 0;
    return {
      name: tier.name,
      description: tier.description,
      monthlyPrice: tier.monthlyPrice,
      hoursSaved,
      monthlyCostSaved,
      annualCostSaved,
      roi
    };
  });
  const recommended = tiers.reduce(
    (best, t) => t.hoursSaved > 0 && t.roi > (best?.roi ?? -Infinity) ? t : best,
    null
  );
  return {
    input: { staff: s, manualHours: mh, painPoints },
    tiers,
    recommendedTier: recommended?.name ?? "Foundation"
  };
}
__name(calculateSavings, "calculateSavings");

// ../server/autonomous-ops.mjs
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID as randomUUID2 } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
var EVENTS_STORE = join(PROJECT_ROOT, "data", "ops-events.jsonl");
var CONSENT_STORE = join(PROJECT_ROOT, "data", "ops-consent.json");
async function readEvents() {
  let raw;
  try {
    raw = await readFile(EVENTS_STORE, "utf8");
  } catch {
    return [];
  }
  return raw.split("\n").filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
__name(readEvents, "readEvents");
async function writeEvents(events) {
  const dir = dirname(EVENTS_STORE);
  await mkdir(dir, { recursive: true });
  await writeFile(
    EVENTS_STORE,
    events.map((e) => JSON.stringify(e)).join("\n") + (events.length ? "\n" : ""),
    "utf8"
  );
}
__name(writeEvents, "writeEvents");
async function ingestEvent(event) {
  if (!event.cat) throw new Error("cat is required");
  if (!event.action) throw new Error("action is required");
  const record = {
    id: randomUUID2(),
    cat: event.cat,
    // disk, backup, security, patch, uptime, scale, ssl, memory, access, firewall, database, cost, ticket
    action: event.action,
    detail: event.detail || "",
    severity: event.severity || "info",
    // info | warning | error
    auto: event.auto !== false,
    // true = system-resolved, false = human action
    client_region: event.client_region || "KL",
    client_industry: event.client_industry || "SME",
    ts: event.ts || (/* @__PURE__ */ new Date()).toISOString(),
    consented: true
    // ingested events have implied consent (client opted in via their contract)
  };
  const events = await readEvents();
  events.unshift(record);
  if (events.length > 500) events.length = 500;
  await writeEvents(events);
  await rotateEvents();
  return record;
}
__name(ingestEvent, "ingestEvent");
async function getFeed(limit = 20) {
  let events = await readEvents();
  events = events.filter((e) => e.consented !== false);
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const sliced = events.slice(0, limit);
  const stats = {
    total: events.length,
    last24h: events.filter((e) => Date.now() - new Date(e.ts).getTime() < 864e5).length,
    autoResolved: events.filter((e) => e.auto).length,
    warnings: events.filter((e) => e.severity === "warning").length,
    categories: {}
  };
  for (const e of events) {
    stats.categories[e.cat] = (stats.categories[e.cat] || 0) + 1;
  }
  return { events: sliced, stats };
}
__name(getFeed, "getFeed");
var MAX_EVENT_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
async function rotateEvents() {
  const events = await readEvents();
  const cutoff = Date.now() - MAX_EVENT_AGE_MS;
  const before = events.length;
  const kept = events.filter((e) => {
    try {
      return new Date(e.ts).getTime() > cutoff;
    } catch {
      return true;
    }
  });
  const removed = before - kept.length;
  if (removed > 0) await writeEvents(kept);
  return removed;
}
__name(rotateEvents, "rotateEvents");
async function readConsent() {
  try {
    return JSON.parse(await readFile(CONSENT_STORE, "utf8"));
  } catch {
    return {};
  }
}
__name(readConsent, "readConsent");
async function writeConsent(data) {
  const dir = dirname(CONSENT_STORE);
  await mkdir(dir, { recursive: true });
  await writeFile(CONSENT_STORE, JSON.stringify(data, null, 2), "utf8");
}
__name(writeConsent, "writeConsent");
async function recordConsent(email, consent) {
  const data = await readConsent();
  data[email.toLowerCase().trim()] = {
    consent: Boolean(consent),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeConsent(data);
  return data[email.toLowerCase().trim()];
}
__name(recordConsent, "recordConsent");
async function handleFeed(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 50);
  const data = await getFeed(limit);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=30"
  });
  res.end(JSON.stringify(data));
}
__name(handleFeed, "handleFeed");
async function handleConsent(req, res) {
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
  console.log(`[ops-consent] ${email} \u2192 ${consent ? "opted-in" : "opted-out"}`);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, consent: result }));
}
__name(handleConsent, "handleConsent");
async function handleIngestEvent(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  const token = req.headers["x-admin-token"];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
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
  if (!body.cat || !body.action) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "cat and action are required" }));
    return;
  }
  const VALID_CATS = ["disk", "backup", "security", "patch", "uptime", "scale", "ssl", "memory", "access", "firewall", "database", "cost", "ticket"];
  if (!VALID_CATS.includes(body.cat)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Invalid cat. Must be one of: ${VALID_CATS.join(", ")}` }));
    return;
  }
  const VALID_SEVERITIES = ["info", "warning", "error"];
  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}` }));
    return;
  }
  try {
    const record = await ingestEvent(body);
    console.log(`[ops-ingest] ${record.cat}: ${record.action}`);
    res.writeHead(201, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, event: record }));
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
__name(handleIngestEvent, "handleIngestEvent");

// ../server/portal-cloudflare.mjs
import { randomBytes, scrypt, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// ../server/clients-cloudflare.mjs
function supabaseConfigured2() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
__name(supabaseConfigured2, "supabaseConfigured");
function headers(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}
__name(headers, "headers");
var TABLE = "clients";
function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    company: r.company,
    tier: r.tier,
    status: r.status,
    createdAt: r.created_at
  };
}
__name(fromRow, "fromRow");
function toRow(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    password_hash: c.passwordHash,
    company: c.company ?? null,
    tier: c.tier ?? "foundation",
    status: c.status ?? "active",
    created_at: c.createdAt
  };
}
__name(toRow, "toRow");
async function supabaseFindByEmail(email) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(email)}&select=*`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}
__name(supabaseFindByEmail, "supabaseFindByEmail");
async function supabaseFindById(id) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}
__name(supabaseFindById, "supabaseFindById");
async function supabaseUpsert(client) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify(toRow(client))
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
  return client;
}
__name(supabaseUpsert, "supabaseUpsert");
async function supabaseListAll() {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?select=*&order=created_at.desc`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromRow);
}
__name(supabaseListAll, "supabaseListAll");
var { randomUUID: randomUUID3 } = crypto;
async function findClientByEmail(email) {
  if (!supabaseConfigured2()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseFindByEmail(email);
}
__name(findClientByEmail, "findClientByEmail");
async function findClientById(id) {
  if (!supabaseConfigured2()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseFindById(id);
}
__name(findClientById, "findClientById");
async function upsertClient(client) {
  if (!supabaseConfigured2()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseUpsert(client);
}
__name(upsertClient, "upsertClient");
async function listClients() {
  if (!supabaseConfigured2()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseListAll();
}
__name(listClients, "listClients");
async function createClient({ name, email, passwordHash, company, tier }) {
  const client = {
    id: randomUUID3(),
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    company: company ?? null,
    tier: tier ?? "foundation",
    status: "active",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return upsertClient(client);
}
__name(createClient, "createClient");

// ../server/tickets-cloudflare.mjs
function supabaseConfigured3() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
__name(supabaseConfigured3, "supabaseConfigured");
function headers2(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}
__name(headers2, "headers");
var TABLE2 = "tickets";
function fromRow2(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    subject: r.subject,
    description: r.description,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
__name(fromRow2, "fromRow");
function toRow2(t) {
  return {
    id: t.id,
    client_id: t.clientId,
    subject: t.subject,
    description: t.description ?? null,
    status: t.status ?? "open",
    priority: t.priority ?? "medium",
    created_at: t.createdAt,
    updated_at: t.updatedAt
  };
}
__name(toRow2, "toRow");
var { randomUUID: randomUUID4 } = crypto;
async function createTicket({ clientId, subject, description, priority }) {
  if (!supabaseConfigured3()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ticket = {
    id: randomUUID4(),
    clientId,
    subject,
    description: description ?? null,
    status: "open",
    priority: priority ?? "medium",
    createdAt: now,
    updatedAt: now
  };
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${TABLE2}`, {
    method: "POST",
    headers: headers2({ prefer: "return=representation" }),
    body: JSON.stringify(toRow2(ticket))
  });
  if (!res.ok) throw new Error(`Supabase ticket insert failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow2(rows[0]) : ticket;
}
__name(createTicket, "createTicket");
async function findTicket(id) {
  if (!supabaseConfigured3()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/${TABLE2}?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: headers2() }
  );
  if (!res.ok) throw new Error(`Supabase ticket read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow2(rows[0]) : null;
}
__name(findTicket, "findTicket");
async function listTicketsForClient(clientId) {
  if (!supabaseConfigured3()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/${TABLE2}?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`,
    { headers: headers2() }
  );
  if (!res.ok) throw new Error(`Supabase ticket list failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromRow2);
}
__name(listTicketsForClient, "listTicketsForClient");
async function updateTicket(id, patch) {
  if (!supabaseConfigured3()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const body = { updated_at: now };
  if (patch.status) body.status = patch.status;
  const res = await fetch(
    `${base}/rest/v1/${TABLE2}?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", headers: headers2({ prefer: "return=representation" }), body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Supabase ticket update failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow2(rows[0]) : null;
}
__name(updateTicket, "updateTicket");
async function countTicketsByStatus(clientId) {
  const tickets = await listTicketsForClient(clientId);
  const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: tickets.length };
  for (const t of tickets) {
    if (counts[t.status] !== void 0) counts[t.status]++;
  }
  return counts;
}
__name(countTicketsByStatus, "countTicketsByStatus");

// ../server/digest-cloudflare.mjs
async function buildDigestForClient(client) {
  const allRows = await listEnquiries();
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthsRows = allRows.filter((r) => new Date(r.created_at) >= startOfMonth);
  const byService = {};
  for (const row of thisMonthsRows) {
    const svc = row.service || "General";
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(row);
  }
  return {
    client: { name: client.name, company: client.company, email: client.email },
    month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    totalEnquiries: thisMonthsRows.length,
    byService,
    generatedAt: now.toISOString()
  };
}
__name(buildDigestForClient, "buildDigestForClient");
async function sendDigestEmail(client, digest) {
  const to = client.email;
  const from = process.env.EMAIL_FROM?.trim();
  const subject = `Monthly Digest \u2014 ${digest.month} \u2014 ${client.name}`;
  const text = formatDigestText(digest);
  if (process.env.RESEND_API_KEY) {
    await sendViaResend2({ to, from, subject, text }, process.env.RESEND_API_KEY);
  } else if (process.env.BREVO_API_KEY) {
    await sendViaBrevo2({ to, from, subject, text }, process.env.BREVO_API_KEY);
  } else if (process.env.POSTMARK_SERVER_TOKEN) {
    await sendViaPostmark2({ to, from, subject, text }, process.env.POSTMARK_SERVER_TOKEN);
  } else {
    return false;
  }
  return true;
}
__name(sendDigestEmail, "sendDigestEmail");
function formatDigestText(digest) {
  const lines = [
    `Monthly Digest \u2014 ${digest.month}`,
    `Client: ${digest.client.name} (${digest.client.company || "\u2014"})`,
    `Total enquiries: ${digest.totalEnquiries}`,
    ""
  ];
  for (const [service, rows] of Object.entries(digest.byService)) {
    lines.push(`=== ${service} (${rows.length}) ===`);
    for (const r of rows) {
      lines.push(`  ${r.created_at} \u2014 ${r.name} <${r.email}> \u2014 ${r.message?.slice(0, 80) || "\u2014"}`);
    }
    lines.push("");
  }
  lines.push(`Generated: ${digest.generatedAt}`);
  return lines.join("\n");
}
__name(formatDigestText, "formatDigestText");
async function assertOk2(res, provider) {
  if (!res.ok) throw new Error(`${provider} responded ${res.status}: ${await res.text()}`);
}
__name(assertOk2, "assertOk");
async function sendViaResend2({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: from || "Duta Integra <no-reply@dutaintegrasolutions.com>", to, subject, text })
  });
  await assertOk2(res, "resend");
}
__name(sendViaResend2, "sendViaResend");
async function sendViaBrevo2({ to, from, subject, text }, apiKey) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: from ? { name: "Duta Integra", email: from } : { name: "Duta Integra", email: "no-reply@dutaintegrasolutions.com" },
      to: [{ email: to }],
      subject,
      textContent: text
    })
  });
  await assertOk2(res, "brevo");
}
__name(sendViaBrevo2, "sendViaBrevo");
async function sendViaPostmark2({ to, from, subject, text }, token) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": token, "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ From: from || "no-reply@dutaintegrasolutions.com", To: to, Subject: subject, TextBody: text })
  });
  await assertOk2(res, "postmark");
}
__name(sendViaPostmark2, "sendViaPostmark");

// ../server/portal-cloudflare.mjs
var scryptAsync = promisify(scrypt);
var SCRYPT_KEYLEN = 64;
var SCRYPT_COST = 16384;
var SCRYPT_BLOCK_SIZE = 8;
var SCRYPT_PARALLELIZATION = 1;
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION
  });
  return `scrypt:${SCRYPT_KEYLEN}:${SCRYPT_COST}:${SCRYPT_BLOCK_SIZE}:${SCRYPT_PARALLELIZATION}:${salt}:${hash.toString("hex")}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  if (stored.startsWith("scrypt:")) {
    const parts = stored.split(":");
    if (parts.length !== 7) return false;
    const [, keylen, cost, blockSize, parallelization, salt, expectedHash] = parts;
    const hash = await scryptAsync(password, salt, Number(keylen), {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization)
    });
    const a = Buffer.from(expectedHash, "hex");
    const b = hash;
    return a.length === b.length && timingSafeEqual(a, b);
  }
  if (stored.includes(":")) {
    const [salt, expectedHash] = stored.split(":");
    const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
    const a = Buffer.from(expectedHash, "hex");
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return false;
}
__name(verifyPassword, "verifyPassword");
var SESSION_DAYS = 30;
var MAX_SESSIONS = 1e3;
var sessions = /* @__PURE__ */ new Map();
function createSession(clientId) {
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    sessions.delete(oldest);
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3;
  sessions.set(token, { clientId, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}
__name(createSession, "createSession");
function getSession(token) {
  if (typeof token !== "string") return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}
__name(getSession, "getSession");
function parseCookie(req) {
  const raw = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("=").map((v) => v.trim()))
  );
  return cookies;
}
__name(parseCookie, "parseCookie");
function sessionFromReq(req) {
  const cookies = parseCookie(req);
  const token = cookies["di_session"];
  return getSession(token);
}
__name(sessionFromReq, "sessionFromReq");
function setSessionCookie(headers3, token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  headers3.append("Set-Cookie", `di_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`);
}
__name(setSessionCookie, "setSessionCookie");
function clearSessionCookie(headers3) {
  headers3.append("Set-Cookie", "di_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}
__name(clearSessionCookie, "clearSessionCookie");
function safeClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company, tier: c.tier, status: c.status };
}
__name(safeClient, "safeClient");
function adminTokenValid(supplied) {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(configured);
  const b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
__name(adminTokenValid, "adminTokenValid");
function sendJson(headers3, status, body) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...Object.fromEntries(headers3)
    }
  });
}
__name(sendJson, "sendJson");
async function readJsonBody(req) {
  try {
    const text = await req.text();
    if (!text) return { error: { status: 400, body: { error: "Empty body" } } };
    return { data: JSON.parse(text) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON" } } };
  }
}
__name(readJsonBody, "readJsonBody");
async function handleLogin(req) {
  const headers3 = new Headers();
  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(headers3, parsed.error.status, parsed.error.body);
  const { email, password } = parsed.data ?? {};
  if (!email || !password) return sendJson(headers3, 400, { error: "Email and password are required" });
  const client = await findClientByEmail(email.toLowerCase().trim());
  if (!client) return sendJson(headers3, 401, { error: "Invalid email or password" });
  if (client.status !== "active") return sendJson(headers3, 403, { error: "Account is not active" });
  if (!await verifyPassword(password, client.passwordHash)) {
    return sendJson(headers3, 401, { error: "Invalid email or password" });
  }
  const { token, expiresAt } = createSession(client.id);
  setSessionCookie(headers3, token, expiresAt);
  return sendJson(headers3, 200, { ok: true, client: safeClient(client) });
}
__name(handleLogin, "handleLogin");
async function handleLogout(req) {
  const headers3 = new Headers();
  const session = sessionFromReq(req);
  if (session) sessions.delete(session.clientId);
  clearSessionCookie(headers3);
  return sendJson(headers3, 200, { ok: true });
}
__name(handleLogout, "handleLogout");
async function handleMe(req) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const client = await findClientById(session.clientId);
  if (!client || client.status !== "active") return sendJson(new Headers(), 401, { error: "Account not found or inactive" });
  return sendJson(new Headers(), 200, { client: safeClient(client) });
}
__name(handleMe, "handleMe");
async function handlePortalTickets(req) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  if (req.method === "GET") {
    const tickets = await listTicketsForClient(session.clientId);
    return sendJson(new Headers(), 200, { tickets });
  }
  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { subject, description, priority } = parsed.data ?? {};
    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      return sendJson(new Headers(), 400, { error: "Subject must be at least 3 characters" });
    }
    const ticket = await createTicket({
      clientId: session.clientId,
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium"
    });
    return sendJson(new Headers(), 201, { ticket });
  }
  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}
__name(handlePortalTickets, "handlePortalTickets");
async function handlePortalTicketById(req, ticketId) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const ticket = await findTicket(ticketId);
  if (!ticket || ticket.clientId !== session.clientId) {
    return sendJson(new Headers(), 404, { error: "Ticket not found" });
  }
  if (req.method === "GET") return sendJson(new Headers(), 200, { ticket });
  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { status } = parsed.data ?? {};
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return sendJson(new Headers(), 400, { error: "Invalid status" });
    }
    const updated = await updateTicket(ticketId, { status });
    return sendJson(new Headers(), 200, { ticket: updated });
  }
  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}
__name(handlePortalTicketById, "handlePortalTicketById");
async function handlePortalHealth(req) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const client = await findClientById(session.clientId);
  if (!client) return sendJson(new Headers(), 404, { error: "Client not found" });
  const counts = await countTicketsByStatus(session.clientId);
  const digestLog = { sentAt: null };
  return sendJson(new Headers(), 200, {
    client: safeClient(client),
    tickets: counts,
    lastDigest: digestLog.sentAt ?? null,
    tier: client.tier
  });
}
__name(handlePortalHealth, "handlePortalHealth");
async function handleAdminClients(req) {
  const url = new URL(req.url);
  const token = req.headers.get("x-admin-token") ?? url.searchParams.get("token");
  if (!adminTokenValid(token)) return sendJson(new Headers(), 401, { error: "Unauthorized" });
  if (req.method === "GET") {
    const clients = await listClients();
    return sendJson(new Headers(), 200, { count: clients.length, clients: clients.map(safeClient) });
  }
  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { name, email, password, company, tier } = parsed.data ?? {};
    if (!name || !email || !password) {
      return sendJson(new Headers(), 400, { error: "name, email, and password are required" });
    }
    const existing = await findClientByEmail(email.toLowerCase().trim());
    if (existing) return sendJson(new Headers(), 409, { error: "A client with this email already exists" });
    const client = await createClient({
      name: name.trim(),
      email,
      passwordHash: await hashPassword(password),
      company: company?.trim() || null,
      tier
    });
    return sendJson(new Headers(), 201, { client: safeClient(client) });
  }
  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}
__name(handleAdminClients, "handleAdminClients");
async function handleAdminClientDigest(req, clientId) {
  const url = new URL(req.url);
  const token = req.headers.get("x-admin-token") ?? url.searchParams.get("token");
  if (!adminTokenValid(token)) return sendJson(new Headers(), 401, { error: "Unauthorized" });
  if (req.method !== "POST") return sendJson(new Headers(), 405, { error: "Method not allowed" });
  const client = await findClientById(clientId);
  if (!client) return sendJson(new Headers(), 404, { error: "Client not found" });
  const digest = await buildDigestForClient(client);
  let sent = false;
  try {
    sent = await sendDigestEmail(client, digest);
  } catch (err) {
    console.error(`[admin digest] send failed for ${client.email}:`, err.message);
  }
  return sendJson(new Headers(), 200, { ok: true, sent, digest });
}
__name(handleAdminClientDigest, "handleAdminClientDigest");

// ../server/handler-cloudflare.mjs
var SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none';"
};
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function str(value, { required = false, max, label }) {
  if (value === void 0 || value === null || value === "") {
    return required ? { error: `${label} is required` } : { value: null };
  }
  if (typeof value !== "string") return { error: `${label} must be text` };
  const trimmed = value.trim();
  if (max && trimmed.length > max) return { error: `${label} is too long` };
  if (required && !trimmed) return { error: `${label} is required` };
  return { value: trimmed || null };
}
__name(str, "str");
function validateEnquiry(body) {
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
  const message = str(body.message, { max: 5e3, label: "Message" });
  if (message.error) return message;
  return {
    value: {
      name: name.value,
      company: company.value,
      email,
      phone: phone.value,
      service: service.value,
      message: message.value
    }
  };
}
__name(validateEnquiry, "validateEnquiry");
var WINDOW_MS = 6e4;
var LIMIT_PER_WINDOW = 5;
var LOGIN_WINDOW_MS = 6e4;
var LOGIN_LIMIT_PER_WINDOW = 5;
var hits = /* @__PURE__ */ new Map();
function rateLimit(key, now = Date.now(), limit = LIMIT_PER_WINDOW, windowMs = WINDOW_MS) {
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
__name(rateLimit, "rateLimit");
function loginRateLimit(ip) {
  return rateLimit(`login:${ip}`, Date.now(), LOGIN_LIMIT_PER_WINDOW, LOGIN_WINDOW_MS);
}
__name(loginRateLimit, "loginRateLimit");
function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}
__name(clientIp, "clientIp");
function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? "").split(",").map((v) => v.trim().replace(/\/$/, "")).filter(Boolean);
}
__name(allowedOrigins, "allowedOrigins");
function corsHeaders(req) {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  if (!allowedOrigins().includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS, PATCH",
    "access-control-allow-headers": "Content-Type, x-csrf-token, x-admin-token, x-digest-token",
    "access-control-max-age": "600",
    vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function checkOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return null;
  if (allowedOrigins().includes(origin)) return null;
  return { status: 403, body: { error: "Invalid origin" } };
}
__name(checkOrigin, "checkOrigin");
function validateCsrf(req) {
  if (!req.headers.get("origin")) return true;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => c.trim().split("="))
  );
  const cookieToken = cookies.csrf_token;
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  try {
    const a = new TextEncoder().encode(cookieToken);
    const b = new TextEncoder().encode(headerToken);
    return a.length === b.length && timingSafeEqual2(a, b);
  } catch {
    return false;
  }
}
__name(validateCsrf, "validateCsrf");
function sendJson2(status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
      ...extraHeaders
    }
  });
}
__name(sendJson2, "sendJson");
async function readJsonBody2(req) {
  try {
    const text = await req.text();
    if (!text) return { error: { status: 400, body: { error: "Empty body" } } };
    return { data: JSON.parse(text) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON body" } } };
  }
}
__name(readJsonBody2, "readJsonBody");
function constantTimeEqual(configured, supplied) {
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(configured);
  const b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual2(a, b);
}
__name(constantTimeEqual, "constantTimeEqual");
function adminTokenValid2(supplied) {
  return constantTimeEqual(process.env.ADMIN_TOKEN?.trim(), supplied);
}
__name(adminTokenValid2, "adminTokenValid");
function digestTokenValid(supplied) {
  return constantTimeEqual(process.env.DIGEST_TOKEN?.trim(), supplied);
}
__name(digestTokenValid, "digestTokenValid");
async function handleSendEmail(req) {
  const headers3 = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers3 });
  }
  if (req.method !== "POST") {
    return sendJson2(405, { error: "Method not allowed" }, headers3);
  }
  const blocked = checkOrigin(req);
  if (blocked) return sendJson2(blocked.status, blocked.body, headers3);
  if (!validateCsrf(req)) {
    return sendJson2(403, { error: "Invalid CSRF token" }, headers3);
  }
  const limited = rateLimit(`enquiry:${clientIp(req)}`);
  if (!limited.allowed) {
    return sendJson2(429, { error: "Too many attempts. Please try again later." }, {
      ...headers3,
      "retry-after": String(Math.ceil(limited.retryAfterMs / 1e3))
    });
  }
  const parsed = await readJsonBody2(req);
  if (parsed.error) return sendJson2(parsed.error.status, parsed.error.body, headers3);
  const valid = validateEnquiry(parsed.data);
  if (valid.error) return sendJson2(400, { error: valid.error }, headers3);
  const enquiry = await recordEnquiry({
    ...valid.value,
    ip: clientIp(req),
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 400) || null
  });
  let delivered = false;
  try {
    delivered = await notifyEnquiry(enquiry);
  } catch (err) {
    console.error(`[enquiry ${enquiry.id}] stored but notification failed: ${err.message}`);
  }
  if (!delivered && !resolveInboxEmail()) {
    console.warn(`[enquiry ${enquiry.id}] no CONTACT_INBOX_EMAIL configured \u2014 stored only`);
  }
  console.log(`[enquiry ${enquiry.id}] received service="${enquiry.service}" delivered=${delivered}`);
  return sendJson2(200, { success: true, delivered }, headers3);
}
__name(handleSendEmail, "handleSendEmail");
async function handleAdminEnquiries(req) {
  const url = new URL(req.url);
  const supplied = req.headers.get("x-admin-token") ?? url.searchParams.get("token");
  if (!adminTokenValid2(supplied)) {
    return sendJson2(401, { error: "Unauthorized" });
  }
  const rows = await listEnquiries(200);
  return sendJson2(200, { count: rows.length, enquiries: rows });
}
__name(handleAdminEnquiries, "handleAdminEnquiries");
var VALID_PAIN_POINTS = /* @__PURE__ */ new Set(["manual_work", "scaling", "security", "ai_automation"]);
var MAX_SCORE = 100;
function scoreQuiz(body) {
  let score = 0;
  const teamSize = Number(body.teamSize) || 0;
  const itSpend = Number(body.itSpend) || 0;
  const painPoints = Array.isArray(body.painPoints) ? body.painPoints : [];
  if (teamSize <= 5) score += 10;
  else if (teamSize <= 20) score += 20;
  else score += 30;
  if (itSpend < 5e3) score += 10;
  else if (itSpend < 2e4) score += 20;
  else score += 30;
  let painScore = 0;
  if (painPoints.includes("manual_work")) painScore += 15;
  if (painPoints.includes("scaling")) painScore += 15;
  if (painPoints.includes("security")) painScore += 15;
  if (painPoints.includes("ai_automation")) painScore += 20;
  score += Math.min(painScore, 40);
  return Math.min(score, MAX_SCORE);
}
__name(scoreQuiz, "scoreQuiz");
async function handleQuiz(req) {
  const headers3 = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers3 });
  if (req.method !== "POST") return sendJson2(405, { error: "Method not allowed" }, headers3);
  const blocked = checkOrigin(req);
  if (blocked) return sendJson2(blocked.status, blocked.body, headers3);
  const limited = rateLimit(`quiz:${clientIp(req)}`);
  if (!limited.allowed) {
    return sendJson2(429, { error: "Too many attempts. Please try again later." }, {
      ...headers3,
      "retry-after": String(Math.ceil(limited.retryAfterMs / 1e3))
    });
  }
  try {
    const parsed = await readJsonBody2(req);
    if (parsed.error) return sendJson2(parsed.error.status, parsed.error.body, headers3);
    const body = parsed.data;
    if (!body || typeof body !== "object") return sendJson2(400, { error: "Invalid payload" }, headers3);
    if (typeof body.teamSize !== "number" || body.teamSize < 1 || body.teamSize > 3)
      return sendJson2(400, { error: "teamSize must be 1, 2, or 3" }, headers3);
    if (typeof body.itSpend !== "number" || body.itSpend < 0)
      return sendJson2(400, { error: "itSpend must be a non-negative number" }, headers3);
    if (!Array.isArray(body.painPoints)) return sendJson2(400, { error: "painPoints must be an array" }, headers3);
    const invalidPp = body.painPoints.filter((p) => !VALID_PAIN_POINTS.has(p));
    if (invalidPp.length > 0) return sendJson2(400, { error: `Invalid painPoints: ${invalidPp.join(", ")}` }, headers3);
    if (body.painPoints.length > 4) return sendJson2(400, { error: "Maximum 4 pain points allowed" }, headers3);
    const score = scoreQuiz(body);
    let tier, description, nextStep, findings, estimatedSavings;
    if (score < 35) {
      tier = "Foundation";
      description = "Your IT setup is basic but functional. You're likely paying for reactive fixes instead of proactive management \u2014 a common pattern for teams under 20 staff.";
      nextStep = "Book a free 30-minute audit call and we'll show you exactly where you're leaving money on the table.";
      findings = [
        "Team size suggests you may be overpaying for enterprise-tier tools you don't use",
        "Low IT spend often means reactive break-fix \u2014 each unplanned outage costs 5\u201310\xD7 more than prevention",
        "Manual work pain points indicate automation ROI of 3\u20136 months"
      ];
      estimatedSavings = "RM 18,000\u201336,000/year by shifting from reactive to managed IT";
    } else if (score < 60) {
      tier = "Growth";
      description = "You're scaling fast but your IT hasn't kept up. Security gaps, undocumented processes, and tool sprawl are your biggest risks right now.";
      nextStep = "Schedule a Growth assessment \u2014 we map your current stack and show you the exact migration path.";
      findings = [
        "Scaling pain points mean your infrastructure is a bottleneck \u2014 every new hire amplifies the problem",
        "Security/compliance gaps expose you to PDPA fines up to RM 1,000,000",
        "Your IT spend is likely 30\u201350% below what companies your size typically need"
      ];
      estimatedSavings = "RM 48,000\u201396,000/year with proper cloud migration and managed security";
    } else {
      tier = "AI Partner";
      description = "You're ready for AI-first operations. Your team has the scale and the pain points that AI automation solves fastest \u2014 this is where the biggest ROI lives.";
      nextStep = "Let us build a custom AI roadmap for your team \u2014 we start with a 1-hour discovery workshop.";
      findings = [
        "AI automation needs combined with manual work = 40\u201360% time savings on repetitive tasks",
        "Your team size justifies dedicated AI engineering \u2014 the ROI crosses positive within 3 months",
        "Security/compliance concerns + AI = opportunity for a unified PDPA-compliant automation stack"
      ];
      estimatedSavings = "RM 120,000\u2013240,000/year in recovered productivity and reduced headcount needs";
    }
    const auditDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const result = { tier, score, description, nextStep, findings, estimatedSavings, auditDate };
    console.log(`[quiz] completed tier="${tier}" score=${score} ip=${clientIp(req)}`);
    return sendJson2(200, result, headers3);
  } catch (err) {
    console.error("[server] quiz error:", err);
    return sendJson2(500, { error: "Quiz scoring failed. Please try again." }, headers3);
  }
}
__name(handleQuiz, "handleQuiz");
var CASE_STUDIES = [
  {
    id: "lapango",
    client: "Lapango",
    tier: "Growth",
    title: "Scaling Support Operations with Managed IT",
    desc: "Lapango needed to scale their support team without the overhead of building an internal IT department. We deployed a managed IT stack with proactive monitoring and SLA-backed response times.",
    tags: ["Managed IT", "SLA Support", "Team Scaling"],
    result: "30% reduction in downtime, 2x support capacity within 90 days."
  },
  {
    id: "eastelpro",
    client: "Eastelpro",
    tier: "Foundation",
    title: "Predictable IT Budgeting for Growing SME",
    desc: "Eastelpro was spending unpredictably on IT emergencies. We moved them to a predictable monthly retainer with proactive maintenance and fast response guarantees.",
    tags: ["Foundation", "Predictable Billing", "Proactive Maintenance"],
    result: "40% lower IT costs year-over-year, zero emergency incidents."
  },
  {
    id: "agmx",
    client: "AGMX",
    tier: "AI Partner",
    title: "Automating Compliance with AI-First Workflows",
    desc: "AGMX needed to automate their regulatory compliance tracking. We built custom AI workflows that monitor, flag, and report compliance status in real time.",
    tags: ["AI Automation", "Compliance", "Custom Workflows"],
    result: "60% faster compliance reporting, full audit trail automated."
  }
];
async function handleCaseStudies(req) {
  return sendJson2(200, { cases: CASE_STUDIES });
}
__name(handleCaseStudies, "handleCaseStudies");
async function handleTestimonial(req) {
  try {
    const parsed = await readJsonBody2(req);
    if (parsed.error) return sendJson2(parsed.error.status, parsed.error.body);
    const { client, tier, quote, author } = parsed.data ?? {};
    if (!client || !quote || !author) return sendJson2(400, { error: "Missing client, quote, or author" });
    if (typeof quote !== "string" || quote.length > 500) return sendJson2(400, { error: "Quote must be 1-500 characters" });
    console.log("[testimonial] received:", { client, tier, author, quote: quote.slice(0, 60) + "..." });
    return sendJson2(201, { ok: true, message: "Testimonial recorded. Thank you!" });
  } catch (err) {
    console.error("[server] testimonial error:", err);
    return sendJson2(500, { error: "Failed to record testimonial. Please try again." });
  }
}
__name(handleTestimonial, "handleTestimonial");
var PDPA_QUESTIONS = [
  { id: "ssm_registered", label: "SSM registered", category: "SSM", weight: 10 },
  { id: "pdpa_policy", label: "PDPA policy published", category: "PDPA", weight: 15 },
  { id: "pdpa_consent", label: "Consent mechanism in place", category: "PDPA", weight: 15 },
  { id: "pdpa_dpo", label: "Data Protection Officer appointed", category: "PDPA", weight: 10 },
  { id: "data_breach_plan", label: "Data breach response plan", category: "PDPA", weight: 15 },
  { id: "myinvois_ready", label: "MyInvois compliant", category: "MyInvois", weight: 15 },
  { id: "employee_training", label: "Employee PDPA training completed", category: "PDPA", weight: 10 },
  { id: "data_audit", label: "Data processing audit done", category: "PDPA", weight: 10 }
];
async function handlePdpaScore(req) {
  try {
    const parsed = await readJsonBody2(req);
    if (parsed.error) return sendJson2(parsed.error.status, parsed.error.body);
    const body = parsed.data;
    if (!body || typeof body !== "object") return sendJson2(400, { error: "Invalid payload" });
    const answers = PDPA_QUESTIONS.map((q) => ({
      ...q,
      answered: Boolean(body[q.id]),
      score: Boolean(body[q.id]) ? q.weight : 0
    }));
    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = PDPA_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
    const percentage = Math.round(totalScore / maxScore * 100);
    let level;
    if (percentage >= 80) level = "PDPA-Ready";
    else if (percentage >= 50) level = "Partially Compliant";
    else level = "Needs Attention";
    const missing = answers.filter((a) => !a.answered).map((a) => a.label);
    return sendJson2(200, {
      score: totalScore,
      maxScore,
      percentage,
      level,
      answered: answers,
      missing,
      nextStep: "Download your PDPA readiness report or book a 30-minute compliance review."
    });
  } catch (err) {
    console.error("[server] pdpa score error:", err);
    return sendJson2(500, { error: "PDPA scoring failed. Please try again." });
  }
}
__name(handlePdpaScore, "handlePdpaScore");
async function handleMonthlyDigest(req) {
  const token = req.headers.get("x-digest-token") || "";
  if (!digestTokenValid(token)) return sendJson2(403, { error: "Forbidden" });
  const allRows = await listEnquiries();
  const now = /* @__PURE__ */ new Date();
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
    nextStep: "Automated monthly digest sent to retainer clients."
  };
  console.log("[digest] Monthly summary:", JSON.stringify(summary, null, 2));
  return sendJson2(200, summary);
}
__name(handleMonthlyDigest, "handleMonthlyDigest");
async function handleCalculator(req) {
  if (req.method !== "POST") return sendJson2(405, { error: "Method not allowed" });
  try {
    const parsed = await readJsonBody2(req);
    if (parsed.error) return sendJson2(parsed.error.status, parsed.error.body);
    const body = parsed.data;
    if (!body || typeof body !== "object") return sendJson2(400, { error: "Invalid payload" });
    const staff = Number(body.staff);
    const manualHours = Number(body.manualHours);
    const painPoints = Array.isArray(body.painPoints) ? body.painPoints : [];
    if (!staff || staff < 1) return sendJson2(400, { error: "Staff count must be at least 1" });
    if (manualHours === void 0 || manualHours === null || manualHours < 0)
      return sendJson2(400, { error: "Manual hours per week is required" });
    const result = calculateSavings({ staff, manualHours, painPoints });
    return sendJson2(200, result);
  } catch (err) {
    console.error("[server] calculator error:", err);
    return sendJson2(500, { error: "Calculator failed. Please try again." });
  }
}
__name(handleCalculator, "handleCalculator");
async function handleHealth(req) {
  return sendJson2(200, { ok: true, inboxConfigured: Boolean(resolveInboxEmail()) });
}
__name(handleHealth, "handleHealth");
async function handleApi(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  try {
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
    if (pathname === "/api/portal/login") {
      const limited = loginRateLimit(clientIp(req));
      if (!limited.allowed) {
        return sendJson2(429, { error: "Too many attempts. Please try again later." }, {
          "retry-after": String(Math.ceil(limited.retryAfterMs / 1e3))
        });
      }
      return await handleLogin(req);
    }
    if (pathname === "/api/portal/logout") return await handleLogout(req);
    if (pathname === "/api/portal/me") return await handleMe(req);
    if (pathname === "/api/portal/health") return await handlePortalHealth(req);
    if (pathname === "/api/portal/tickets") return await handlePortalTickets(req, pathname);
    const ticketMatch = pathname.match(/^\/api\/portal\/tickets\/([a-f0-9-]+)$/);
    if (ticketMatch && req.method === "PATCH") {
      return await handlePortalTicketById(req, ticketMatch[1]);
    }
    if (pathname === "/admin/clients") return await handleAdminClients(req);
    const digestMatch = pathname.match(/^\/admin\/clients\/([a-f0-9-]+)\/send-digest$/);
    if (digestMatch && req.method === "POST") {
      return await handleAdminClientDigest(req, digestMatch[1]);
    }
    if (pathname.startsWith("/api/") || pathname.startsWith("/admin/")) {
      return sendJson2(404, { error: "Not found" });
    }
    return sendJson2(404, { error: "Not found" });
  } catch (err) {
    console.error("[server] unhandled error:", err);
    return sendJson2(500, { error: "Something went wrong. Please try again." });
  }
}
__name(handleApi, "handleApi");

// api/[[path]].js
async function onRequest(context) {
  const { request, env, params } = context;
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
  return handleApi(request);
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-UE2WTn/functionsRoutes-0.23668165653444517.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../home/.local/share/fnm/node-versions/v22.23.4/installation/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str2) {
  var tokens = [];
  var i = 0;
  while (i < str2.length) {
    var char = str2[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str2[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str2[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str2[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str2[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str2.length) {
        var code = str2.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str2[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str2[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str2.length) {
        if (str2[j] === "\\") {
          pattern += str2[j++] + str2[j++];
          continue;
        }
        if (str2[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str2[j] === "(") {
          count++;
          if (str2[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str2[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str2[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str2, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str2);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str2, options) {
  var keys = [];
  var re = pathToRegexp(str2, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str2) {
  return str2.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../home/.local/share/fnm/node-versions/v22.23.4/installation/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
