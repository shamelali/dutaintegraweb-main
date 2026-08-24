// ============================================================================
// Admin Products API — Work page items, managed from the admin dashboard.
//
// GET    /api/admin/products          — list all products (auth)
// POST   /api/admin/products          — create product (auth)
// PATCH  /api/admin/products?id=...   — update product (auth)
// DELETE /api/admin/products?id=...   — delete product (auth)
// POST   /api/admin/products?upload=1 — multipart image upload → public URL (auth)
// ============================================================================

import { getSupabase, json, corsResponse, getAuthUser, sanitize, makeId } from "../_lib.js";

export const config = { maxDuration: 15 };

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function cleanTags(input) {
  if (Array.isArray(input)) return input.map((t) => sanitize(t, 40)).filter(Boolean).slice(0, 8);
  return String(input || "")
    .split(",")
    .map((t) => sanitize(t, 40))
    .filter(Boolean)
    .slice(0, 8);
}

function cleanMetrics(input) {
  let rows = input;
  if (typeof input === "string") {
    try { rows = JSON.parse(input); } catch { rows = []; }
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .map((m) => ({ value: sanitize(m?.value, 24), label: sanitize(m?.label, 60) }))
    .filter((m) => m.value && m.label)
    .slice(0, 4);
}

function productPayload(body) {
  const p = {};
  if (body.name !== undefined) p.name = sanitize(body.name, 120);
  if (body.tagline !== undefined) p.tagline = sanitize(body.tagline, 160);
  if (body.category !== undefined) p.category = sanitize(body.category, 120);
  if (body.description_en !== undefined) p.description_en = sanitize(body.description_en, 2000);
  if (body.description_ms !== undefined) p.description_ms = sanitize(body.description_ms, 2000);
  if (body.tags !== undefined) p.tags = cleanTags(body.tags);
  if (body.metrics !== undefined) p.metrics = cleanMetrics(body.metrics);
  if (body.preview_url !== undefined) p.preview_url = sanitize(body.preview_url, 500);
  if (body.image_url !== undefined) p.image_url = sanitize(body.image_url, 500);
  if (body.contact_cta_en !== undefined) p.contact_cta_en = sanitize(body.contact_cta_en, 120);
  if (body.contact_cta_ms !== undefined) p.contact_cta_ms = sanitize(body.contact_cta_ms, 120);
  if (body.status !== undefined) p.status = body.status === "published" ? "published" : "draft";
  if (body.sort_order !== undefined) p.sort_order = Number(body.sort_order) || 0;
  return p;
}

async function listProducts(req) {
  const supabase = getSupabase();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  let query = supabase.from("products").select("*").order("sort_order").order("created_at");
  if (status === "published" || status === "draft") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return json({ ok: false, error: "Failed to fetch products" }, 500);
  return json({ ok: true, products: data || [] });
}

async function createProduct(req) {
  const supabase = getSupabase();
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const payload = productPayload(body);
  if (!payload.name) return json({ ok: false, error: "Product name is required." }, 400);
  const { data, error } = await supabase.from("products").insert(payload).select().single();
  if (error) {
    console.error("products insert:", error);
    return json({ ok: false, error: "Failed to create product" }, 500);
  }
  return json({ ok: true, product: data }, 201);
}

async function updateProduct(req) {
  const supabase = getSupabase();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "Product id required" }, 400);
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const payload = productPayload(body);
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("products update:", error);
    return json({ ok: false, error: "Failed to update product" }, 500);
  }
  return json({ ok: true, product: data });
}

async function deleteProduct(req) {
  const supabase = getSupabase();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ ok: false, error: "Product id required" }, 400);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return json({ ok: false, error: "Failed to delete product" }, 500);
  return json({ ok: true });
}

async function uploadImage(req) {
  const supabase = getSupabase();
  let form;
  try { form = await req.formData(); } catch {
    return json({ ok: false, error: "Expected multipart/form-data with a `file` field" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ ok: false, error: "No file provided" }, 400);
  }
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return json({ ok: false, error: "Only JPG, PNG, WebP or SVG allowed" }, 400);
  if (file.size > MAX_IMAGE_BYTES) return json({ ok: false, error: "Image must be under 3 MB" }, 400);

  const buffer = new Uint8Array(await file.arrayBuffer());
  const path = `${Date.now()}-${makeId(6)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("storage upload:", error);
    return json({ ok: false, error: "Upload failed — check SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return json({ ok: true, url: data.publicUrl });
}

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse();

  // Image upload endpoint (auth required)
  if (req.method === "POST" && new URL(req.url).searchParams.get("upload")) {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return uploadImage(req);
  }

  // Public-safe listing for the admin UI still requires auth; the public site
  // uses /api/products instead.
  if (req.method === "GET") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return listProducts(req);
  }

  if (req.method === "POST") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return createProduct(req);
  }

  if (req.method === "PATCH") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return updateProduct(req);
  }

  if (req.method === "DELETE") {
    const user = await getAuthUser(req);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    return deleteProduct(req);
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
