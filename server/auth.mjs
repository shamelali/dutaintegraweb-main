import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataFile } from "./paths.mjs";
import { usingSupabase } from "./store.mjs";

const scryptAsync = promisify(scrypt);

/**
 * DutaOS auth: signup, login, logout, me.
 *
 * Companies are the accounts — there is no separate users table in v1, so a
 * signup creates the company row and mints a session for it. Company members
 * (team access) are handled by companies.mjs.
 *
 * Storage follows store.mjs resolution: Supabase when both SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set, otherwise JSONL in DATA_DIR. Writes use
 * the service role, which bypasses RLS; the tables themselves carry RLS with
 * no public policies, so anon/authenticated can never touch them directly.
 */

// ── password hashing ─────────────────────────────────────────────────────────

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  });
  return `scrypt:${SCRYPT_KEYLEN}:${SCRYPT_COST}:${SCRYPT_BLOCK_SIZE}:${SCRYPT_PARALLELIZATION}:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.startsWith("scrypt:")) return false;

  const parts = stored.split(":");
  if (parts.length !== 7) return false;
  const [, keylen, cost, blockSize, parallelization, salt, expectedHash] = parts;
  const hash = await scryptAsync(password, salt, Number(keylen), {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  });
  const a = Buffer.from(expectedHash, "hex");
  const b = hash;
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── rate limiting ────────────────────────────────────────────────────────────

const LOGIN_LIMIT_PER_WINDOW = 5;
const LOGIN_WINDOW_MS = 60 * 1000;

const hits = new Map();

/** Sliding-window counter per key. Exported for tests. */
export function rateLimit(key, now = Date.now(), limit = LOGIN_LIMIT_PER_WINDOW, windowMs = LOGIN_WINDOW_MS) {
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

/** Rate limit for credential endpoints, keyed per IP. */
export function loginRateLimit(ip) {
  return rateLimit(`auth:${ip}`, Date.now(), LOGIN_LIMIT_PER_WINDOW, LOGIN_WINDOW_MS);
}

export function resetAuthRateLimit() {
  hits.clear();
}

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

// ── tables / stores ──────────────────────────────────────────────────────────

const COMPANY_TABLE = "companies";
const COMPANY_STORE = "dutaos-companies";
const SESSION_TABLE = "dutaos_sessions";
const SESSION_STORE = "dutaos-sessions";

// ── companies ────────────────────────────────────────────────────────────────

function normalizeCompany(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    industry: c.industry ?? null,
    subscriptionTier: c.subscription_tier,
    subscriptionStatus: c.subscription_status,
  };
}

async function findCompanyByEmail(email) {
  if (usingSupabase()) {
    const res = await sbFetch(COMPANY_TABLE, `?email=eq.${encodeURIComponent(email)}&select=*`);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  }
  const rows = await jsonlReadAll(storePath(COMPANY_STORE));
  return rows.find((r) => r.email === email) || null;
}

async function createCompany(company) {
  if (usingSupabase()) {
    const res = await sbFetch(COMPANY_TABLE, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(company),
    });
    if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    return rows[0] || company;
  }
  const path = storePath(COMPANY_STORE);
  const rows = await jsonlReadAll(path);
  rows.push(company);
  await jsonlWriteAll(path, rows);
  return company;
}

// ── sessions ─────────────────────────────────────────────────────────────────

const SESSION_DAYS = 7;

/** The store only ever sees the hash; see sessions.mjs for the same model. */
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function toRow(session) {
  return {
    token_hash: session.tokenHash,
    company_id: session.companyId,
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  };
}

function fromRow(row) {
  return {
    tokenHash: row.token_hash,
    companyId: row.company_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

const SELECT = "select=token_hash,company_id,expires_at,created_at";

export async function createSession(companyId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await pruneExpiredSessions();
  await putSession({ tokenHash: hashToken(token), companyId, expiresAt });
  return { token, expiresAt };
}

export async function getSession(token) {
  if (typeof token !== "string" || !token) return null;
  const tokenHash = hashToken(token);
  const session = await readSession(tokenHash);
  if (!session) return null;
  if (Date.now() > Date.parse(session.expiresAt)) {
    await deleteSession(tokenHash);
    return null;
  }
  return { companyId: session.companyId, expiresAt: session.expiresAt };
}

export async function putSession({ tokenHash, companyId, expiresAt }) {
  const session = { tokenHash, companyId, expiresAt, createdAt: new Date().toISOString() };
  if (usingSupabase()) {
    const res = await sbFetch(SESSION_TABLE, "", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(toRow(session)),
    });
    if (!res.ok) throw new Error(`Supabase session write failed: ${res.status}`);
    return session;
  }
  const rows = await jsonlReadAll(storePath(SESSION_STORE));
  const idx = rows.findIndex((row) => row.tokenHash === tokenHash);
  if (idx >= 0) rows[idx] = session;
  else rows.push(session);
  await jsonlWriteAll(storePath(SESSION_STORE), rows);
  return session;
}

export async function readSession(tokenHash) {
  if (usingSupabase()) {
    const res = await sbFetch(`${SESSION_TABLE}?token_hash=eq.${encodeURIComponent(tokenHash)}&${SELECT}&limit=1`);
    if (!res.ok) throw new Error(`Supabase session read failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? fromRow(rows[0]) : null;
  }
  const rows = await jsonlReadAll(storePath(SESSION_STORE));
  return rows.find((row) => row.tokenHash === tokenHash) ?? null;
}

export async function deleteSession(tokenHash) {
  if (usingSupabase()) {
    const res = await sbFetch(`${SESSION_TABLE}?token_hash=eq.${encodeURIComponent(tokenHash)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Supabase session delete failed: ${res.status}`);
    return;
  }
  const rows = await jsonlReadAll(storePath(SESSION_STORE));
  await jsonlWriteAll(storePath(SESSION_STORE), rows.filter((row) => row.tokenHash !== tokenHash));
}

export async function pruneExpiredSessions(now = Date.now()) {
  const cutoff = new Date(now).toISOString();
  if (usingSupabase()) {
    const res = await sbFetch(`${SESSION_TABLE}?expires_at=lt.${cutoff}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Supabase session prune failed: ${res.status}`);
    return;
  }
  const rows = await jsonlReadAll(storePath(SESSION_STORE));
  await jsonlWriteAll(storePath(SESSION_STORE), rows.filter((row) => Date.parse(row.expiresAt) >= now));
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function sendAuth(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...extraHeaders,
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

function parseCookie(req) {
  const raw = req.headers.cookie ?? "";
  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("=").map((v) => v.trim())),
  );
  return cookies;
}

function setSessionCookie(res, token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  res.setHeader(
    "Set-Cookie",
    `di_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "di_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
}

async function sessionFromReq(req) {
  const token = parseCookie(req)["di_session"];
  return getSession(token);
}

/** Returns the companyId bound to the request's session cookie, or null. */
export async function getCompanyIdFromReq(req) {
  const session = await sessionFromReq(req);
  return session ? session.companyId : null;
}

// ── route handlers ───────────────────────────────────────────────────────────

export async function handleAuthSignup(req, res) {
  if (req.method !== "POST") return sendAuth(res, 405, { error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"] ?? "unknown";
  const limit = loginRateLimit(ip);
  if (!limit.allowed) {
    res.setHeader("retry-after", String(Math.ceil(limit.retryAfterMs / 1000)));
    return sendAuth(res, 429, { error: "Too many requests" });
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendAuth(res, parsed.error.status, parsed.error.body);
  const { email, password, companyName, industry } = parsed.data ?? {};

  if (!email || !password || !companyName) {
    return sendAuth(res, 400, { error: "email, password, and companyName are required" });
  }

  const existing = await findCompanyByEmail(email.toLowerCase().trim());
  if (existing) return sendAuth(res, 409, { error: "Email already registered" });

  const id = randomUUID();
  const company = {
    id,
    name: companyName.trim(),
    industry: industry ? industry.trim() : null,
    email: email.toLowerCase().trim(),
    password_hash: await hashPassword(password),
    subscription_tier: "starter",
    subscription_status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await createCompany(company);

  const { token, expiresAt } = await createSession(id);
  setSessionCookie(res, token, expiresAt);

  return sendAuth(res, 201, {
    success: true,
    company: normalizeCompany(company),
  });
}

export async function handleAuthLogin(req, res) {
  if (req.method !== "POST") return sendAuth(res, 405, { error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"] ?? "unknown";
  const limit = loginRateLimit(ip);
  if (!limit.allowed) {
    res.setHeader("retry-after", String(Math.ceil(limit.retryAfterMs / 1000)));
    return sendAuth(res, 429, { error: "Too many requests" });
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendAuth(res, parsed.error.status, parsed.error.body);
  const { email, password } = parsed.data ?? {};

  if (!email || !password) return sendAuth(res, 400, { error: "email and password are required" });

  const company = await findCompanyByEmail(email.toLowerCase().trim());
  if (!company) return sendAuth(res, 401, { error: "Invalid credentials" });
  if (!(await verifyPassword(password, company.password_hash))) {
    return sendAuth(res, 401, { error: "Invalid credentials" });
  }

  const { token, expiresAt } = await createSession(company.id);
  setSessionCookie(res, token, expiresAt);

  return sendAuth(res, 200, {
    success: true,
    company: normalizeCompany(company),
  });
}

export async function handleAuthLogout(req, res) {
  if (req.method !== "POST") return sendAuth(res, 405, { error: "Method not allowed" });

  const token = parseCookie(req)["di_session"];
  clearSessionCookie(res);
  if (typeof token === "string" && token) {
    try { await deleteSession(hashToken(token)); } catch { /* revocation failure is not a client error */ }
  }
  return sendAuth(res, 200, { success: true });
}

export async function handleAuthMe(req, res) {
  if (req.method !== "GET") return sendAuth(res, 405, { error: "Method not allowed" });

  const session = await sessionFromReq(req);
  if (!session) return sendAuth(res, 401, { error: "Not authenticated" });

  let company;
  if (usingSupabase()) {
    const res2 = await sbFetch(COMPANY_TABLE, `?id=eq.${encodeURIComponent(session.companyId)}&select=id,name,email,industry,subscription_tier,subscription_status`);
    if (!res2.ok) return sendAuth(res, 502, { error: "Could not load profile" });
    const rows = await res2.json();
    company = rows[0] || null;
  } else {
    const rows = await jsonlReadAll(storePath(COMPANY_STORE));
    company = rows.find((r) => r.id === session.companyId) ?? null;
  }
  if (!company) return sendAuth(res, 401, { error: "Account not found" });

  return sendAuth(res, 200, { success: true, company: normalizeCompany(company) });
}

