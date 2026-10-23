/**
 * Client CRUD — Supabase only (Cloudflare compatible).
 * No JSONL fallback — Cloudflare Pages Functions have no durable local filesystem.
 */

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

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

const { randomUUID } = crypto;

export async function findClientByEmail(email) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseFindByEmail(email);
}

export async function findClientById(id) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseFindById(id);
}

export async function upsertClient(client) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseUpsert(client);
}

export async function listClients() {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseListAll();
}

export async function updateClient(id, patch) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseUpdate(id, patch);
}

export async function deleteClient(id) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseDelete(id);
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