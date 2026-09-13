import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Client portal auth + API endpoints.
 *
 * Uses HTTP-only session cookies. No external auth library — keeps the
 * dependency count at zero.
 *
 * Routes handled:
 *   POST   /api/portal/login       — authenticate, set session cookie
 *   POST   /api/portal/logout      — clear session
 *   GET    /api/portal/me          — return current client info
 *   GET    /api/portal/tickets     — list client's tickets
 *   POST   /api/portal/tickets     — create a ticket
 *   GET    /api/portal/tickets/:id — get single ticket
 *   PATCH  /api/portal/tickets/:id — update ticket (status only)
 *   GET    /api/portal/health      — client health summary
 *
 *   POST   /admin/clients          — create client (admin)
 *   GET    /admin/clients          — list all clients (admin)
 *   POST   /admin/clients/:id/send-digest — trigger digest for one client
 */

import { findClientByEmail, findClientById, createClient, listClients, updateClient } from "./clients.mjs";
import { listTicketsForClient, findTicket, createTicket, updateTicket, countTicketsByStatus } from "./tickets.mjs";
import { buildDigestForClient, sendDigestEmail } from "./digest.mjs";

// ── password hashing ─────────────────────────────────────────────────────────

const ALGO = "sha256";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash(ALGO).update(`${salt}:${password}`).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, expectedHash] = stored.split(":");
  const hash = createHash(ALGO).update(`${salt}:${password}`).digest("hex");
  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── session management ───────────────────────────────────────────────────────

const SESSION_DAYS = 30;
const sessions = new Map(); // token → { clientId, expiresAt }

export function createSession(clientId) {
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
  const raw = req.headers.cookie ?? "";
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

// ── helpers ──────────────────────────────────────────────────────────────────

function send(res, status, body, extraHeaders = {}) {
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
  catch { return { error: { status: 400, body: { error: "Invalid JSON" } } }; }
}

function safeClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company, tier: c.tier, status: c.status };
}

// ── admin auth ───────────────────────────────────────────────────────────────

function adminTokenValid(supplied) {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── route handlers ───────────────────────────────────────────────────────────

export async function handleLogin(req, res) {
  const parsed = await readJsonBody(req);
  if (parsed.error) return send(res, parsed.error.status, parsed.error.body);

  const { email, password } = parsed.data ?? {};
  if (!email || !password) return send(res, 400, { error: "Email and password are required" });

  const client = await findClientByEmail(email.toLowerCase().trim());
  if (!client) return send(res, 401, { error: "Invalid email or password" });
  if (client.status !== "active") return send(res, 403, { error: "Account is not active" });
  if (!verifyPassword(password, client.passwordHash)) {
    return send(res, 401, { error: "Invalid email or password" });
  }

  const { token, expiresAt } = createSession(client.id);
  setSessionCookie(res, token, expiresAt);
  send(res, 200, { ok: true, client: safeClient(client) });
}

export async function handleLogout(req, res) {
  const session = sessionFromReq(req);
  if (session) sessions.delete(session.clientId); // best-effort
  clearSessionCookie(res);
  send(res, 200, { ok: true });
}

export async function handleMe(req, res) {
  const session = sessionFromReq(req);
  if (!session) return send(res, 401, { error: "Not authenticated" });
  const client = await findClientById(session.clientId);
  if (!client || client.status !== "active") return send(res, 401, { error: "Account not found or inactive" });
  send(res, 200, { client: safeClient(client) });
}

export async function handlePortalTickets(req, res, pathname) {
  const session = sessionFromReq(req);
  if (!session) return send(res, 401, { error: "Not authenticated" });

  if (req.method === "GET") {
    const tickets = await listTicketsForClient(session.clientId);
    return send(res, 200, { tickets });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const { subject, description, priority } = parsed.data ?? {};
    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      return send(res, 400, { error: "Subject must be at least 3 characters" });
    }
    const ticket = await createTicket({
      clientId: session.clientId,
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
    });
    return send(res, 201, { ticket });
  }

  send(res, 405, { error: "Method not allowed" });
}

export async function handlePortalTicketById(req, res, ticketId) {
  const session = sessionFromReq(req);
  if (!session) return send(res, 401, { error: "Not authenticated" });

  const ticket = await findTicket(ticketId);
  if (!ticket || ticket.clientId !== session.clientId) {
    return send(res, 404, { error: "Ticket not found" });
  }

  if (req.method === "GET") return send(res, 200, { ticket });

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const { status } = parsed.data ?? {};
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return send(res, 400, { error: "Invalid status" });
    }
    const updated = await updateTicket(ticketId, { status });
    return send(res, 200, { ticket: updated });
  }

  send(res, 405, { error: "Method not allowed" });
}

export async function handlePortalHealth(req, res) {
  const session = sessionFromReq(req);
  if (!session) return send(res, 401, { error: "Not authenticated" });

  const client = await findClientById(session.clientId);
  if (!client) return send(res, 404, { error: "Client not found" });

  const counts = await countTicketsByStatus(session.clientId);
  const digestLog = await import("./digest.mjs").then((m) => m.getDigestLog(session.clientId));

  send(res, 200, {
    client: safeClient(client),
    tickets: counts,
    lastDigest: digestLog?.sentAt ?? null,
    tier: client.tier,
  });
}

// ── admin: client management ─────────────────────────────────────────────────

export async function handleAdminClients(req, res) {
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;
  const token = req.headers["x-admin-token"] ?? query.get("token");
  if (!adminTokenValid(token)) return send(res, 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const clients = await listClients();
    return send(res, 200, { count: clients.length, clients: clients.map(safeClient) });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return send(res, parsed.error.status, parsed.error.body);
    const { name, email, password, company, tier } = parsed.data ?? {};
    if (!name || !email || !password) {
      return send(res, 400, { error: "name, email, and password are required" });
    }
    const existing = await findClientByEmail(email.toLowerCase().trim());
    if (existing) return send(res, 409, { error: "A client with this email already exists" });

    const client = await createClient({
      name: name.trim(),
      email,
      passwordHash: hashPassword(password),
      company: company?.trim() || null,
      tier,
    });
    return send(res, 201, { client: safeClient(client) });
  }

  send(res, 405, { error: "Method not allowed" });
}

export async function handleAdminClientDigest(req, res, clientId) {
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;
  const token = req.headers["x-admin-token"] ?? query.get("token");
  if (!adminTokenValid(token)) return send(res, 401, { error: "Unauthorized" });

  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const client = await findClientById(clientId);
  if (!client) return send(res, 404, { error: "Client not found" });

  const digest = await buildDigestForClient(client);
  let sent = false;
  try {
    sent = await sendDigestEmail(client, digest);
  } catch (err) {
    console.error(`[admin digest] send failed for ${client.email}:`, err.message);
  }

  return send(res, 200, { ok: true, sent, digest });
}
