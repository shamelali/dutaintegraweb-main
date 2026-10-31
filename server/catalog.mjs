import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataFile } from "./paths.mjs";
import { usingSupabase } from "./store.mjs";
import { getCompanyIdFromReq } from "./auth.mjs";

/**
 * Retail Catalog Enrichment — image → structured catalog entry via VLM.
 *
 * Storage follows the same Supabase-or-JSONL resolution as cms.mjs:
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase, otherwise JSONL in DATA_DIR.
 *
 * Enrichment calls Ollama's /api/generate with a vision model (e.g. llava,
 * llama3.2-vision) and asks it to emit a structured catalog record as JSON.
 * Zero runtime dependencies: native fetch only.
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

async function sbFetch(table, path, init = {}) {
  const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return fetch(`${base}/rest/v1/${table}${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function listAll(table, storeName, order = "created_at.desc") {
  if (usingSupabase()) {
    const res = await sbFetch(table, `?select=*&order=${order}`);
    if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
    return res.json();
  }
  return jsonlReadAll(storePath(storeName));
}

async function getOne(table, storeName, id) {
  if (usingSupabase()) {
    const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}&select=*`);
    if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }
  const rows = await jsonlReadAll(storePath(storeName));
  return rows.find((r) => r.id === id) || null;
}

async function createOne(table, storeName, item) {
  if (usingSupabase()) {
    const res = await sbFetch(table, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    return rows[0] || item;
  }
  const path = storePath(storeName);
  const rows = await jsonlReadAll(path);
  rows.push(item);
  await jsonlWriteAll(path, rows);
  return item;
}

async function updateOne(table, storeName, id, patch) {
  if (usingSupabase()) {
    const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    return rows[0] || null;
  }
  const path = storePath(storeName);
  const rows = await jsonlReadAll(path);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  Object.assign(rows[idx], patch);
  await jsonlWriteAll(path, rows);
  return rows[idx];
}

async function deleteOne(table, storeName, id) {
  if (usingSupabase()) {
    const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
    const body = await res.json();
    return Array.isArray(body) ? body.length > 0 : true;
  }
  const path = storePath(storeName);
  const rows = await jsonlReadAll(path);
  const filtered = rows.filter((r) => r.id !== id);
  if (filtered.length === rows.length) return false;
  await jsonlWriteAll(path, filtered);
  return true;
}

// ── Catalog items ────────────────────────────────────────────────────────────

const CAT_TABLE = "catalog_items";
const CAT_STORE = "catalog-items";

function normalizeItem(c) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    specs: c.specs ?? {},
    tags: c.tags ?? [],
    imageUrl: c.image_url,
    sourceImage: c.source_image,
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function listCatalogItems() {
  const rows = await listAll(CAT_TABLE, CAT_STORE, "created_at.desc");
  return rows.map(normalizeItem);
}

export async function getCatalogItem(id) {
  const row = await getOne(CAT_TABLE, CAT_STORE, id);
  return row ? normalizeItem(row) : null;
}

export async function createCatalogItem(data) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    title: data.title ?? null,
    description: data.description ?? null,
    category: data.category ?? null,
    specs: data.specs ?? {},
    tags: data.tags ?? [],
    image_url: data.imageUrl ?? null,
    source_image: data.sourceImage ?? null,
    status: data.status ?? "draft",
    created_at: now,
    updated_at: now,
  };
  const created = await createOne(CAT_TABLE, CAT_STORE, item);
  return normalizeItem(created);
}

export async function updateCatalogItem(id, data) {
  const patch = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.category !== undefined) patch.category = data.category;
  if (data.specs !== undefined) patch.specs = data.specs;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.sourceImage !== undefined) patch.source_image = data.sourceImage;
  if (data.status !== undefined) patch.status = data.status;
  const row = await updateOne(CAT_TABLE, CAT_STORE, id, patch);
  return row ? normalizeItem(row) : null;
}

export async function deleteCatalogItem(id) {
  return deleteOne(CAT_TABLE, CAT_STORE, id);
}

// ── VLM enrichment (Ollama) ──────────────────────────────────────────────────

const ENRICH_PROMPT =
  "You are a product catalog specialist. Study the supplied product image and " +
  "produce a structured catalog record. Return ONLY valid JSON, no markdown fences, " +
  "no explanation. Keys: title (short product name), description (2-3 sentences), " +
  "category (one word or short phrase), specs (object of key/value pairs you can " +
  "see, e.g. material, dimensions, color, weight), tags (array of short search " +
  "keywords). If a field cannot be determined from the image, use null or an empty " +
  "array.";

function ollamaHost() {
  return (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
}

function ollamaModel() {
  return process.env.OLLAMA_VLM_MODEL ?? "llava";
}

async function ollamaGenerate(model, prompt, imageBase64) {
  const body = { model, prompt, stream: false, ...(imageBase64 ? { images: [imageBase64] } : {}) };
  const res = await fetch(`${ollamaHost()}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama generate failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.response ?? "";
}

/**
 * Parse the VLM's text output into a structured object. The model is told to
 * return raw JSON, but we tolerate fenced code blocks and trailing prose.
 */
function parseEnrichment(text) {
  let cleaned = String(text ?? "").trim();
  const fence = cleaned.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fence) cleaned = fence[1].trim();
  // Fall back to extracting the first balanced brace object.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return { title: null, description: null, category: null, specs: {}, tags: [] };
  }
}

/**
 * Enrich an image into catalog fields via the VLM.
 * imageBase64 is a data URL without the "data:...;base64," prefix (raw base64).
 */
export async function enrichImage(imageBase64, { model } = {}) {
  const chosen = model ?? ollamaModel();
  const raw = await ollamaGenerate(chosen, ENRICH_PROMPT, imageBase64);
  const parsed = parseEnrichment(raw);
  return {
    title: parsed.title ?? null,
    description: parsed.description ?? null,
    category: parsed.category ?? null,
    specs: typeof parsed.specs === "object" && parsed.specs !== null ? parsed.specs : {},
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    raw,
    model: chosen,
  };
}

// ── Health ───────────────────────────────────────────────────────────────────

async function catalogHealth() {
  try {
    const res = await fetch(`${ollamaHost()}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: `Ollama /api/tags returned ${res.status}` };
    const data = await res.json();
    const models = (data.models ?? []).map((m) => m.name);
    return { ok: true, models, configured: ollamaModel() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── HTTP body helpers ────────────────────────────────────────────────────────

const ENRICH_MAX_BYTES = 8 * 1024 * 1024; // 8 MB for image uploads

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > ENRICH_MAX_BYTES) {
      return { error: { status: 413, body: { error: "Payload too large" } } };
    }
    chunks.push(chunk);
  }
  return { data: Buffer.concat(chunks) };
}

function parseContentType(header) {
  if (!header) return { type: "", boundary: null };
  const parts = String(header).split(";");
  const type = parts[0].trim().toLowerCase();
  const boundaryPart = parts.find((p) => p.trim().startsWith("boundary="));
  const boundary = boundaryPart ? boundaryPart.split("=", 2)[1].trim() : null;
  return { type, boundary };
}

/**
 * Minimal multipart/form-data parser. Returns { fields, files } where files
 * entries are { fieldname, filename, contentType, data (Buffer) }.
 */
function parseMultipart(raw, boundary) {
  if (!boundary) return { fields: {}, files: [] };
  const delimiter = `--${boundary}`;
  const endDelimiter = `--${boundary}--`;
  const text = raw.toString("utf8");
  const parts = text.split(delimiter);
  const fields = {};
  const files = [];
  for (const part of parts) {
    if (!part.trim() || part === endDelimiter || part === `${endDelimiter}\r\n`) continue;
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 4).replace(/\r\n$/, "").replace(/^\r\n/, "");
    const dispositionMatch = headers.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"/i);
    if (!dispositionMatch) continue;
    const fieldName = dispositionMatch[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/i);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r]+)/i);
    if (filenameMatch) {
      files.push({
        fieldname: fieldName,
        filename: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream",
        data: Buffer.from(body, "utf8"), // base64 will be decoded by caller
      });
    } else {
      fields[fieldName] = body.trim();
    }
  }
  return { fields, files };
}

// ── Route handlers ───────────────────────────────────────────────────────────

const MAX_TITLE = 180;
const MAX_DESCRIPTION = 5000;
const MAX_CATEGORY = 120;

function strField(value, { required = false, max, label }) {
  if (value === undefined || value === null || value === "") {
    return required ? { error: `${label} is required` } : { value: null };
  }
  if (typeof value !== "string") return { error: `${label} must be text` };
  const trimmed = value.trim();
  if (max && trimmed.length > max) return { error: `${label} is too long` };
  if (required && !trimmed) return { error: `${label} is required` };
  return { value: trimmed || null };
}

// The catalog is staff-internal: every route requires a DutaOS session. The
// tables carry RLS and are written with the service role, so this check is the
// only thing standing between the public internet and an open VLM proxy.
async function requireCompany(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) {
    sendCatalog(res, 401, { error: "Not authenticated" });
    return null;
  }
  return companyId;
}

async function handleCatalogEnrich(req, res) {
  if (!(await requireCompany(req, res))) return;
  if (req.method !== "POST") return sendCatalog(res, 405, { error: "Method not allowed" });

  const parsed = await readBody(req);
  if (parsed.error) return sendCatalog(res, parsed.error.status, parsed.error.body);

  const ct = parseContentType(req.headers["content-type"]);
  let imageBase64 = null;
  let filename = null;

  if (ct.type === "multipart/form-data" && ct.boundary) {
    const { fields, files } = parseMultipart(parsed.data, ct.boundary);
    const imgFile = files.find((f) => f.contentType.startsWith("image/"));
    if (!imgFile) {
      return sendCatalog(res, 400, { error: "No image file provided" });
    }
    filename = imgFile.filename;
    // imgFile.data is the UTF-8 text of the part; for a base64-encoded upload it
    // is already base64. For a raw binary upload we base64-encode it here.
    imageBase64 = Buffer.from(imgFile.data, "utf8").toString("base64");
  } else {
    // JSON body: { imageBase64, filename? }
    let json;
    try { json = JSON.parse(parsed.data.toString("utf8")); } catch {
      return sendCatalog(res, 400, { error: "Invalid JSON body" });
    }
    imageBase64 = json.imageBase64;
    filename = json.filename ?? null;
    if (imageBase64 && imageBase64.includes(",")) {
      imageBase64 = imageBase64.split(",", 2)[1];
    }
  }

  if (!imageBase64) {
    return sendCatalog(res, 400, { error: "imageBase64 is required" });
  }

  try {
    const enrichment = await enrichImage(imageBase64);
    return sendCatalog(res, 200, {
      success: true,
      filename,
      title: enrichment.title,
      description: enrichment.description,
      category: enrichment.category,
      specs: enrichment.specs,
      tags: enrichment.tags,
      model: enrichment.model,
    });
  } catch (err) {
    console.error("[catalog] enrichment failed:", err.message);
    return sendCatalog(res, 502, { error: "Enrichment service unavailable" });
  }
}

async function handleCatalogItems(req, res) {
  if (!(await requireCompany(req, res))) return;
  if (req.method === "GET") {
    const items = await listCatalogItems();
    return sendCatalog(res, 200, { items });
  }
  if (req.method === "POST") {
    const parsed = await readBody(req);
    if (parsed.error) return sendCatalog(res, parsed.error.status, parsed.error.body);
    let json;
    try { json = JSON.parse(parsed.data.toString("utf8")); } catch {
      return sendCatalog(res, 400, { error: "Invalid JSON body" });
    }
    const title = strField(json.title, { required: true, max: MAX_TITLE, label: "Title" });
    if (title.error) return sendCatalog(res, 400, { error: title.error });
    const description = strField(json.description, { max: MAX_DESCRIPTION, label: "Description" });
    if (description.error) return sendCatalog(res, 400, { error: description.error });
    const category = strField(json.category, { max: MAX_CATEGORY, label: "Category" });
    if (category.error) return sendCatalog(res, 400, { error: category.error });
    const specs = json.specs && typeof json.specs === "object" && !Array.isArray(json.specs) ? json.specs : {};
    const tags = Array.isArray(json.tags) ? json.tags : [];
    const imageUrl = strField(json.imageUrl, { label: "Image URL" });
    if (imageUrl.error) return sendCatalog(res, 400, { error: imageUrl.error });
    const sourceImage = strField(json.sourceImage, { label: "Source Image" });
    if (sourceImage.error) return sendCatalog(res, 400, { error: sourceImage.error });
    const status = json.status === "published" ? "published" : "draft";
    const item = await createCatalogItem({
      title: title.value,
      description: description.value,
      category: category.value,
      specs,
      tags,
      imageUrl: imageUrl.value,
      sourceImage: sourceImage.value,
      status,
    });
    return sendCatalog(res, 201, { item });
  }
  return sendCatalog(res, 405, { error: "Method not allowed" });
}

async function handleCatalogItemById(req, res, id) {
  if (!(await requireCompany(req, res))) return;
  if (req.method === "GET") {
    const item = await getCatalogItem(id);
    if (!item) return sendCatalog(res, 404, { error: "Catalog item not found" });
    return sendCatalog(res, 200, { item });
  }
  if (req.method === "PATCH") {
    const parsed = await readBody(req);
    if (parsed.error) return sendCatalog(res, parsed.error.status, parsed.error.body);
    let json;
    try { json = JSON.parse(parsed.data.toString("utf8")); } catch {
      return sendCatalog(res, 400, { error: "Invalid JSON body" });
    }
    const item = await updateCatalogItem(id, {
      title: json.title,
      description: json.description,
      category: json.category,
      specs: json.specs,
      tags: json.tags,
      imageUrl: json.imageUrl,
      sourceImage: json.sourceImage,
      status: json.status === "published" ? "published" : json.status === "draft" ? "draft" : undefined,
    });
    if (!item) return sendCatalog(res, 404, { error: "Catalog item not found" });
    return sendCatalog(res, 200, { item });
  }
  if (req.method === "DELETE") {
    const ok = await deleteCatalogItem(id);
    if (!ok) return sendCatalog(res, 404, { error: "Catalog item not found" });
    return sendCatalog(res, 200, { success: true });
  }
  return sendCatalog(res, 405, { error: "Method not allowed" });
}

function sendCatalog(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  res.end(payload);
}

export { handleCatalogEnrich, handleCatalogItems, handleCatalogItemById, catalogHealth };
