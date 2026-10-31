import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataFile } from "./paths.mjs";
import { usingSupabase, supabaseFetch } from "./store.mjs";
import { getCompanyIdFromReq } from "./auth.mjs";

/**
 * DutaOS company profile — company-scoped CRUD for the authenticated company's
 * own record (name, SSM number, industry, address, phone, email, tier, status).
 * Backend selection lives in store.mjs: Supabase when configured, JSONL otherwise.
 */

// ── JSONL backend ────────────────────────────────────────────────────────────

function storePath(name) {
  return dataFile(`${name}.jsonl`);
}

async function ensureDir(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function jsonlReadAll(path) {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

async function jsonlWriteAll(path, rows) {
  await ensureDir(path);
  await writeFile(path, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

// ── Supabase backend ─────────────────────────────────────────────────────────

function sbFetch(table, path, init = {}) {
  return supabaseFetch(`${table}${path}`, init);
}

// ── table / store names ──────────────────────────────────────────────────────

const COMPANY_TABLE = "companies";
const COMPANY_STORE = "dutaos-companies";

// Fields the client may update on its own company profile. Subscription
// tier/status are set by the server/admin, never by the profile PATCH.
const UPDATABLE_FIELDS = new Set(["name", "ssmNumber", "industry", "address", "phone", "email"]);

const SNAKE_CASE = {
  ssmNumber: "ssm_number",
};

function normalizeCompany(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    ssmNumber: c.ssm_number ?? null,
    industry: c.industry ?? null,
    address: c.address ?? null,
    phone: c.phone ?? null,
    subscriptionTier: c.subscription_tier,
    subscriptionStatus: c.subscription_status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function toSnakeCase(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    out[SNAKE_CASE[key] ?? key] = value;
  }
  return out;
}

// ── company-scoped CRUD ──────────────────────────────────────────────────────

async function getCompany(companyId) {
  if (usingSupabase()) {
    const res = await sbFetch(COMPANY_TABLE, `?id=eq.${encodeURIComponent(companyId)}&select=*`);
    if (!res.ok) throw new Error(`Supabase company get failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] ? normalizeCompany(rows[0]) : null;
  }
  const rows = await jsonlReadAll(storePath(COMPANY_STORE));
  const row = rows.find((r) => r.id === companyId);
  return row ? normalizeCompany(row) : null;
}

async function updateCompany(id, companyId, patch) {
  // Only allow client-updatable fields.
  const fields = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in patch) fields[key] = patch[key];
  }
  fields.updated_at = new Date().toISOString();

  const snake = toSnakeCase(fields);

  if (usingSupabase()) {
    const res = await sbFetch(COMPANY_TABLE, `?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(snake),
    });
    if (!res.ok) throw new Error(`Supabase company update failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? normalizeCompany(rows[0]) : null;
  }
  const path = storePath(COMPANY_STORE);
  const rows = await jsonlReadAll(path);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  Object.assign(rows[idx], snake);
  await jsonlWriteAll(path, rows);
  return normalizeCompany(rows[idx]);
}

// ── server-only: subscription tier/status (set by webhooks / admin) ───────

async function updateCompanySubscription(companyId, patch) {
  const fields = { updated_at: new Date().toISOString() };
  if ("subscriptionTier" in patch) fields.subscription_tier = patch.subscriptionTier;
  if ("subscriptionStatus" in patch) fields.subscription_status = patch.subscriptionStatus;

  if (usingSupabase()) {
    const res = await sbFetch(COMPANY_TABLE, `?id=eq.${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(`Supabase company subscription update failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? normalizeCompany(rows[0]) : null;
  }
  const path = storePath(COMPANY_STORE);
  const rows = await jsonlReadAll(path);
  const idx = rows.findIndex((r) => r.id === companyId);
  if (idx < 0) return null;
  Object.assign(rows[idx], fields);
  await jsonlWriteAll(path, rows);
  return normalizeCompany(rows[idx]);
}

// ── HTTP route handlers ──────────────────────────────────────────────────────

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32 * 1024) return { error: { status: 413, body: { error: "Payload too large" } } };
    chunks.push(chunk);
  }
  try { return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) }; }
  catch { return { error: { status: 400, body: { error: "Invalid JSON body" } } }; }
}

async function handleCompaniesGet(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });

  if (req.method === "GET") {
    const company = await getCompany(companyId);
    if (!company) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, { company });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

async function handleCompaniesPatch(req, res, id) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });

  // A company can only update its own record. 404 (not 403) to avoid
  // leaking whether another company's record exists.
  if (id !== companyId) return sendJson(res, 404, { error: "Not found" });

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(res, parsed.error.status, parsed.error.body);
    const company = await updateCompany(id, companyId, parsed.data ?? {});
    if (!company) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, { company });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

export { getCompany, updateCompany, updateCompanySubscription, handleCompaniesGet, handleCompaniesPatch };
