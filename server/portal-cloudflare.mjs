/**
 * Client portal auth + API endpoints — Supabase only (Cloudflare compatible).
 * Uses HTTP-only session cookies. No external auth library.
 */

import { randomBytes, scrypt, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

import { findClientByEmail, findClientById, createClient, listClients, updateClient } from "./clients-cloudflare.mjs";
import { listTicketsForClient, findTicket, createTicket, updateTicket, countTicketsByStatus } from "./tickets-cloudflare.mjs";
import { buildDigestForClient, sendDigestEmail } from "./digest-cloudflare.mjs";

// ── Password Hashing ───────────────────────────────────────────────────────────

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
  if (typeof stored !== "string") return false;

  if (stored.startsWith("scrypt:")) {
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

  if (stored.includes(":")) {
    const [salt, expectedHash] = stored.split(":");
    const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
    const a = Buffer.from(expectedHash, "hex");
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  return false;
}

// ── Session Management ─────────────────────────────────────────────────────────

const SESSION_DAYS = 30;
const MAX_SESSIONS = 1000;
const sessions = new Map(); // token → { clientId, expiresAt }

export function createSession(clientId) {
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    sessions.delete(oldest);
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  sessions.set(token, { clientId, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function getSession(token) {
  if (typeof token !== "string") return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  return s;
}

function parseCookie(req) {
  const raw = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("=").map((v) => v.trim())),
  );
  return cookies;
}

function sessionFromReq(req) {
  const cookies = parseCookie(req);
  const token = cookies["di_session"];
  return getSession(token);
}

function setSessionCookie(headers, token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  headers.append("Set-Cookie", `di_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`);
}

function clearSessionCookie(headers) {
  headers.append("Set-Cookie", "di_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function safeClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company, tier: c.tier, status: c.status };
}

// ── Admin Auth ─────────────────────────────────────────────────────────────────

function adminTokenValid(supplied) {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(configured);
  const b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Response Helper ────────────────────────────────────────────────────────────

function sendJson(headers, status, body) {
  const payload = JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...Object.fromEntries(headers),
    },
  });
}

async function readJsonBody(req) {
  try {
    const text = await req.text();
    if (!text) return { error: { status: 400, body: { error: "Empty body" } } };
    return { data: JSON.parse(text) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON" } } };
  }
}

// ── Route Handlers ─────────────────────────────────────────────────────────────

export async function handleLogin(req) {
  const headers = new Headers();
  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(headers, parsed.error.status, parsed.error.body);

  const { email, password } = parsed.data ?? {};
  if (!email || !password) return sendJson(headers, 400, { error: "Email and password are required" });

  const client = await findClientByEmail(email.toLowerCase().trim());
  if (!client) return sendJson(headers, 401, { error: "Invalid email or password" });
  if (client.status !== "active") return sendJson(headers, 403, { error: "Account is not active" });
  if (!(await verifyPassword(password, client.passwordHash))) {
    return sendJson(headers, 401, { error: "Invalid email or password" });
  }

  const { token, expiresAt } = createSession(client.id);
  setSessionCookie(headers, token, expiresAt);
  return sendJson(headers, 200, { ok: true, client: safeClient(client) });
}

export async function handleLogout(req) {
  const headers = new Headers();
  const session = sessionFromReq(req);
  if (session) sessions.delete(session.clientId);
  clearSessionCookie(headers);
  return sendJson(headers, 200, { ok: true });
}

export async function handleMe(req) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const client = await findClientById(session.clientId);
  if (!client || client.status !== "active") return sendJson(new Headers(), 401, { error: "Account not found or inactive" });
  return sendJson(new Headers(), 200, { client: safeClient(client) });
}

export async function handlePortalTickets(req) {
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
      priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
    });
    return sendJson(new Headers(), 201, { ticket });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

export async function handlePortalTicketById(req, ticketId) {
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

export async function handlePortalHealth(req) {
  const session = sessionFromReq(req);
  if (!session) return sendJson(new Headers(), 401, { error: "Not authenticated" });

  const client = await findClientById(session.clientId);
  if (!client) return sendJson(new Headers(), 404, { error: "Client not found" });

  const counts = await countTicketsByStatus(session.clientId);
  const digestLog = { sentAt: null }; // In-memory, not persisted in Cloudflare

  return sendJson(new Headers(), 200, {
    client: safeClient(client),
    tickets: counts,
    lastDigest: digestLog.sentAt ?? null,
    tier: client.tier,
  });
}

// ── Admin: Client Management ───────────────────────────────────────────────────

export async function handleAdminClients(req) {
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
      tier,
    });
    return sendJson(new Headers(), 201, { client: safeClient(client) });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

export async function handleAdminClientDigest(req, clientId) {
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