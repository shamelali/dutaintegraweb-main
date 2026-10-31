import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataFile } from "./paths.mjs";
import { usingSupabase, supabaseFetch } from "./store.mjs";
import { getCompanyIdFromReq } from "./auth.mjs";

/**
 * DutaOS compliance items — company-scoped checklist (SSM, PDPA, e-invoice, tax).
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

const COMPLIANCE_TABLE = "compliance_items";
const COMPLIANCE_STORE = "compliance-items";

function normalizeItem(c) {
  return {
    id: c.id,
    companyId: c.company_id,
    type: c.type,
    status: c.status,
    dueDate: c.due_date ?? null,
    completedAt: c.completed_at ?? null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// ── company-scoped CRUD ──────────────────────────────────────────────────────

async function listByCompany(companyId, typeFilter) {
  if (usingSupabase()) {
    let path = `?company_id=eq.${encodeURIComponent(companyId)}&select=*&order=created_at.desc`;
    if (typeFilter) path += `&type=eq.${encodeURIComponent(typeFilter)}`;
    const res = await sbFetch(COMPLIANCE_TABLE, path);
    if (!res.ok) throw new Error(`Supabase compliance list failed: ${res.status}`);
    const rows = await res.json();
    return rows.map(normalizeItem);
  }
  const rows = await jsonlReadAll(storePath(COMPLIANCE_STORE));
  return rows
    .filter((r) => r.company_id === companyId && (!typeFilter || r.type === typeFilter))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(normalizeItem);
}

async function createItem(companyId, { type, dueDate }) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    company_id: companyId,
    type,
    status: "pending",
    due_date: dueDate ?? null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  if (usingSupabase()) {
    const res = await sbFetch(COMPLIANCE_TABLE, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(`Supabase compliance insert failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    return normalizeItem(rows[0] || item);
  }
  const path = storePath(COMPLIANCE_STORE);
  const rows = await jsonlReadAll(path);
  rows.push(item);
  await jsonlWriteAll(path, rows);
  return normalizeItem(item);
}

async function updateItem(id, companyId, patch) {
  const updatedPatch = { ...patch, updated_at: new Date().toISOString() };
  if (patch.status === "completed" && !updatedPatch.completed_at) {
    updatedPatch.completed_at = new Date().toISOString();
  }
  if (patch.status === "pending") {
    updatedPatch.completed_at = null;
  }

  if (usingSupabase()) {
    const res = await sbFetch(COMPLIANCE_TABLE, `?id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updatedPatch),
    });
    if (!res.ok) throw new Error(`Supabase compliance update failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? normalizeItem(rows[0]) : null;
  }
  const path = storePath(COMPLIANCE_STORE);
  const rows = await jsonlReadAll(path);
  const idx = rows.findIndex((r) => r.id === id && r.company_id === companyId);
  if (idx < 0) return null;
  Object.assign(rows[idx], updatedPatch);
  await jsonlWriteAll(path, rows);
  return normalizeItem(rows[idx]);
}

async function deleteItem(id, companyId) {
  if (usingSupabase()) {
    const res = await sbFetch(COMPLIANCE_TABLE, `?id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(companyId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    if (!res.ok) throw new Error(`Supabase compliance delete failed: ${res.status}`);
    const body = await res.json();
    return Array.isArray(body) ? body.length > 0 : true;
  }
  const path = storePath(COMPLIANCE_STORE);
  const rows = await jsonlReadAll(path);
  const filtered = rows.filter((r) => !(r.id === id && r.company_id === companyId));
  if (filtered.length === rows.length) return false;
  await jsonlWriteAll(path, filtered);
  return true;
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

async function handleComplianceItems(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });

  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const typeFilter = url.searchParams.get("type") || undefined;
    const items = await listByCompany(companyId, typeFilter);
    return sendJson(res, 200, { items });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(res, parsed.error.status, parsed.error.body);
    const { type, dueDate } = parsed.data ?? {};
    if (!type) return sendJson(res, 400, { error: "type is required" });
    const item = await createItem(companyId, { type, dueDate });
    return sendJson(res, 201, { item });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

async function handleComplianceItemById(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });

  const idMatch = req.url.match(/^\/api\/compliance-items\/([a-f0-9-]+)$/);
  if (!idMatch) return sendJson(res, 404, { error: "Not found" });
  const id = idMatch[1];

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(res, parsed.error.status, parsed.error.body);
    const item = await updateItem(id, companyId, parsed.data ?? {});
    if (!item) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, { item });
  }

  if (req.method === "DELETE") {
    const ok = await deleteItem(id, companyId);
    if (!ok) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, { success: true });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

export { listByCompany, createItem, updateItem, deleteItem, handleComplianceItems, handleComplianceItemById };
