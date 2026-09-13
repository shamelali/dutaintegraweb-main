import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Client CRUD — Supabase (prod) or JSONL fallback (local dev / tests).
 * Follows the same dual-backend pattern as enquiries.mjs.
 */

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

// ── JSONL backend ────────────────────────────────────────────────────────────

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(PROJECT_ROOT, "data", "clients.jsonl");

async function ensureDir() {
  await mkdir(dirname(STORE), { recursive: true });
}

async function jsonlReadAll() {
  try {
    const raw = await readFile(STORE, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

async function jsonlWriteAll(rows) {
  await ensureDir();
  await writeFile(
    STORE,
    rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""),
    "utf8",
  );
}

async function jsonlUpsert(client) {
  const rows = await jsonlReadAll();
  const idx = rows.findIndex((r) => r.id === client.id);
  if (idx >= 0) rows[idx] = client; else rows.push(client);
  await jsonlWriteAll(rows);
  return client;
}

async function jsonlFindByEmail(email) {
  const rows = await jsonlReadAll();
  return rows.find((r) => r.email === email) || null;
}

async function jsonlFindById(id) {
  const rows = await jsonlReadAll();
  return rows.find((r) => r.id === id) || null;
}

// ── Supabase backend ─────────────────────────────────────────────────────────

function headers(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

const TABLE = "clients";

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    company: r.company,
    tier: r.tier,
    status: r.status,
    createdAt: r.created_at,
  };
}

function toRow(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    password_hash: c.passwordHash,
    company: c.company ?? null,
    tier: c.tier ?? "foundation",
    status: c.status ?? "active",
    created_at: c.createdAt,
  };
}

async function supabaseFindByEmail(email) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(email)}&select=*`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

async function supabaseFindById(id) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

async function supabaseUpsert(client) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify(toRow(client)),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
  return client;
}

async function supabaseListAll() {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?select=*&order=created_at.desc`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromRow);
}

async function supabaseUpdate(id, patch) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`;
  const body = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.tier !== undefined) body.tier = patch.tier;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.company !== undefined) body.company = patch.company;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers({ prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

async function supabaseDelete(id) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const url = `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "DELETE", headers: headers() });
  if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
}

// ── public API ───────────────────────────────────────────────────────────────

export async function findClientByEmail(email) {
  return supabaseConfigured() ? supabaseFindByEmail(email) : jsonlFindByEmail(email);
}

export async function findClientById(id) {
  return supabaseConfigured() ? supabaseFindById(id) : jsonlFindById(id);
}

export async function upsertClient(client) {
  return supabaseConfigured() ? supabaseUpsert(client) : jsonlUpsert(client);
}

export async function listClients() {
  return supabaseConfigured() ? supabaseListAll() : jsonlReadAll();
}

export async function updateClient(id, patch) {
  if (supabaseConfigured()) return supabaseUpdate(id, patch);
  const rows = await jsonlReadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  Object.assign(rows[idx], patch);
  await jsonlWriteAll(rows);
  return rows[idx];
}

export async function deleteClient(id) {
  if (supabaseConfigured()) return supabaseDelete(id);
  const rows = await jsonlReadAll();
  await jsonlWriteAll(rows.filter((r) => r.id !== id));
}

/** Create a new client record with defaults. */
export async function createClient({ name, email, passwordHash, company, tier }) {
  const client = {
    id: randomUUID(),
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    company: company ?? null,
    tier: tier ?? "foundation",
    status: "active",
    createdAt: new Date().toISOString(),
  };
  return upsertClient(client);
}
