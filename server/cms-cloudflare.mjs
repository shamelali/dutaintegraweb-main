/**
 * Case Studies & Products CMS — Supabase only (Cloudflare compatible).
 */

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function sbHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

async function sbFetch(table, path, init = {}) {
  const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${table}${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY.trim()}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

// ── Generic CRUD helpers ─────────────────────────────────────────────────────

async function listAll(table, order = "created_at.desc") {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const res = await sbFetch(table, `?select=*&order=${order}`);
  if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
  return res.json();
}

async function getOne(table, id) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function createOne(table, item) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const res = await sbFetch(table, "", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || item;
}

async function updateOne(table, id, patch) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function deleteOne(table, id) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const res = await sbFetch(table, `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
  return true;
}

// ── Case Studies ─────────────────────────────────────────────────────────────

const CS_TABLE = "case_studies";
const { randomUUID } = crypto;

function normalizeCaseStudy(c) {
  return {
    id: c.id,
    clientName: c.client_name,
    category: c.category,
    summaryEn: c.summary_en,
    summaryMs: c.summary_ms,
    imageUrl: c.image_url,
    metrics: c.metrics,
    outcomes: c.outcomes,
    tags: c.tags,
    detailUrl: c.detail_url,
    status: c.status,
    sortOrder: c.sort_order,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function listCaseStudies() {
  const rows = await listAll(CS_TABLE, "sort_order.asc,created_at.desc");
  return rows.map(normalizeCaseStudy);
}

export async function getCaseStudy(id) {
  const row = await getOne(CS_TABLE, id);
  return row ? normalizeCaseStudy(row) : null;
}

export async function createCaseStudy(data) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    client_name: data.clientName,
    category: data.category ?? null,
    summary_en: data.summaryEn ?? null,
    summary_ms: data.summaryMs ?? null,
    image_url: data.imageUrl ?? null,
    metrics: data.metrics ?? {},
    outcomes: data.outcomes ?? [],
    tags: data.tags ?? [],
    detail_url: data.detailUrl ?? null,
    status: data.status ?? "draft",
    sort_order: data.sortOrder ?? 0,
    created_at: now,
    updated_at: now,
  };
  return createOne(CS_TABLE, item);
}

export async function updateCaseStudy(id, data) {
  const patch = { updated_at: new Date().toISOString() };
  if (data.clientName !== undefined) patch.client_name = data.clientName;
  if (data.category !== undefined) patch.category = data.category;
  if (data.summaryEn !== undefined) patch.summary_en = data.summaryEn;
  if (data.summaryMs !== undefined) patch.summary_ms = data.summaryMs;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.metrics !== undefined) patch.metrics = data.metrics;
  if (data.outcomes !== undefined) patch.outcomes = data.outcomes;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.detailUrl !== undefined) patch.detail_url = data.detailUrl;
  if (data.status !== undefined) patch.status = data.status;
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
  const row = await updateOne(CS_TABLE, id, patch);
  return row ? normalizeCaseStudy(row) : null;
}

export async function deleteCaseStudy(id) {
  return deleteOne(CS_TABLE, id);
}

// ── Products ──────────────────────────────────────────────────────────────────

const PROD_TABLE = "products";

function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    descriptionEn: p.description_en,
    descriptionMs: p.description_ms,
    tags: p.tags,
    metrics: p.metrics,
    previewUrl: p.preview_url,
    imageUrl: p.image_url,
    contactCtaEn: p.contact_cta_en,
    contactCtaMs: p.contact_cta_ms,
    status: p.status,
    sortOrder: p.sort_order,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function listProducts() {
  const rows = await listAll(PROD_TABLE, "sort_order.asc,created_at.desc");
  return rows.map(normalizeProduct);
}

export async function getProduct(id) {
  const row = await getOne(PROD_TABLE, id);
  return row ? normalizeProduct(row) : null;
}

export async function createProduct(data) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    name: data.name,
    tagline: data.tagline ?? null,
    category: data.category ?? null,
    description_en: data.descriptionEn ?? null,
    description_ms: data.descriptionMs ?? null,
    tags: data.tags ?? [],
    metrics: data.metrics ?? [],
    preview_url: data.previewUrl ?? null,
    image_url: data.imageUrl ?? null,
    contact_cta_en: data.contactCtaEn ?? null,
    contact_cta_ms: data.contactCtaMs ?? null,
    status: data.status ?? "draft",
    sort_order: data.sortOrder ?? 0,
    created_at: now,
    updated_at: now,
  };
  return createOne(PROD_TABLE, item);
}

export async function updateProduct(id, data) {
  const patch = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.tagline !== undefined) patch.tagline = data.tagline;
  if (data.category !== undefined) patch.category = data.category;
  if (data.descriptionEn !== undefined) patch.description_en = data.descriptionEn;
  if (data.descriptionMs !== undefined) patch.description_ms = data.descriptionMs;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.metrics !== undefined) patch.metrics = data.metrics;
  if (data.previewUrl !== undefined) patch.preview_url = data.previewUrl;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.contactCtaEn !== undefined) patch.contact_cta_en = data.contactCtaEn;
  if (data.contactCtaMs !== undefined) patch.contact_cta_ms = data.contactCtaMs;
  if (data.status !== undefined) patch.status = data.status;
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
  const row = await updateOne(PROD_TABLE, id, patch);
  return row ? normalizeProduct(row) : null;
}

export async function deleteProduct(id) {
  return deleteOne(PROD_TABLE, id);
}