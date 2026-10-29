/**
 * Client portal auth + API endpoints — Supabase Auth + Cloudflare compatible.
 *
 * Auth: Supabase Auth (signup, login, JWT verification)
 * Sessions: HTTP-only cookies with Supabase JWT
 * Storage: Supabase (clients, tickets, proposals, projects)
 */

import { randomBytes, timingSafeEqual } from "node:crypto";

import {
  findClientByEmail,
  findClientById,
  createClient,
  listClients,
  updateClient,
} from "./clients-cloudflare.mjs";

import {
  listTicketsForClient,
  findTicket,
  createTicket,
  updateTicket,
  countTicketsByStatus,
  createTicketReply,
  listTicketReplies,
} from "./tickets-cloudflare.mjs";

import {
  supabaseAdmin,
  createSupabaseClient,
  verifyUser,
} from "./supabase-client.mjs";

// ── Security ────────────────────────────────────────────────────────────────────

function adminTokenValid(supplied) {
  // Read per call: Pages Functions copy the env bindings into process.env
  // inside the request, so a value captured at import time is always undefined.
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(configured);
  const b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Check if request has an admin session (cookie or x-admin-token header). */
export async function requireAdminSession(req) {
  // Check Supabase JWT
  const token = getAccessToken(req);
  if (token) {
    const { user, error } = await verifyUser(token);
    if (!error && user) {
      const client = await findClientById(user.id);
      if (client && client.status === "active" && client.role === "admin") {
        return { client, session: token };
      }
    }
  }
  // Fallback to ADMIN_TOKEN header (for scripts/cron)
  const adminToken = req.headers.get("x-admin-token") ?? new URL(req.url).searchParams.get("token");
  if (adminToken && adminTokenValid(adminToken)) {
    return { client: { role: "admin" }, session: null };
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

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

function parseCookie(req) {
  const raw = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("=").map((v) => v.trim())),
  );
  return cookies;
}

function getAccessToken(req) {
  // Prefer Authorization header, fall back to cookie
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const cookies = parseCookie(req);
  return cookies["di_session"] ?? null;
}

function setAuthCookie(headers, token, expiresInSeconds = 30 * 24 * 60 * 60) {
  const expires = new Date(Date.now() + expiresInSeconds * 1000).toUTCString();
  headers.append(
    "Set-Cookie",
    `di_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`,
  );
}

function clearAuthCookie(headers) {
  headers.append("Set-Cookie", "di_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function safeClient(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    company: c.company,
    tier: c.tier,
    status: c.status,
    createdAt: c.created_at,
  };
}

// ── Auth: Supabase-based ───────────────────────────────────────────────────────

/**
 * POST /api/auth/signup — register a new client via Supabase Auth
 */
export async function handleAuthSignup(req) {
  const headers = new Headers();
  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(headers, parsed.error.status, parsed.error.body);

  const { email, password, name, company, tier } = parsed.data ?? {};
  if (!email || !password || !name) {
    return sendJson(headers, 400, { error: "email, password, and name are required" });
  }

  // Check if client already exists in our clients table
  const existing = await findClientByEmail(email.toLowerCase().trim());
  if (existing) {
    return sendJson(headers, 409, { error: "A client with this email already exists" });
  }

  // Create Supabase Auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, company, tier: tier || "foundation" },
  });

  if (error || !data.user) {
    return sendJson(headers, 400, { error: error?.message || "Registration failed" });
  }

  // Sign in immediately to get access token
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (sessionError || !sessionData.session) {
    return sendJson(headers, 500, { error: "User created but login failed" });
  }

  // Create client record in clients table
  const client = await createClient({
    id: data.user.id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: null, // Supabase handles password
    company: company?.trim() || null,
    tier: tier || "foundation",
  });

  setAuthCookie(headers, sessionData.session.access_token, sessionData.session.expires_in ?? 30 * 24 * 60 * 60);

  return sendJson(headers, 201, {
    ok: true,
    client: safeClient(client),
    user: data.user,
  });
}

/**
 * POST /api/auth/login — login via Supabase Auth
 */
export async function handleAuthLogin(req) {
  const headers = new Headers();
  const parsed = await readJsonBody(req);
  if (parsed.error) return sendJson(headers, parsed.error.status, parsed.error.body);

  const { email, password } = parsed.data ?? {};
  if (!email || !password) {
    return sendJson(headers, 400, { error: "Email and password are required" });
  }

  // Sign in via Supabase Auth
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error || !data.user || !data.session) {
    return sendJson(headers, 401, { error: "Invalid email or password" });
  }

  // Find client record
  const client = await findClientByEmail(email.toLowerCase().trim());
  if (!client || client.status !== "active") {
    return sendJson(headers, 403, { error: "Account is not active" });
  }

  setAuthCookie(headers, data.session.access_token, data.session.expires_in ?? 30 * 24 * 60 * 60);

  return sendJson(headers, 200, { ok: true, client: safeClient(client) });
}

/**
 * POST /api/auth/logout — logout (clear cookie)
 */
export async function handleAuthLogout(req) {
  const headers = new Headers();
  clearAuthCookie(headers);
  return sendJson(headers, 200, { ok: true });
}

/**
 * GET /api/auth/me — get current authenticated client
 */
export async function handleAuthMe(req) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return sendJson(new Headers(), 401, { error: "Not authenticated" });
  }

  const user = await verifyUser(accessToken);
  if (!user) {
    return sendJson(new Headers(), 401, { error: "Session expired or invalid" });
  }

  const client = await findClientById(user.id);
  if (!client || client.status !== "active") {
    return sendJson(new Headers(), 401, { error: "Account not found or inactive" });
  }

  return sendJson(new Headers(), 200, { client: safeClient(client) });
}

// ── Middleware: Require Auth ────────────────────────────────────────────────────

export function requireAuth(handler) {
  return async (req, ...args) => {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return sendJson(new Headers(), 401, { error: "Not authenticated" });
    }
    const user = await verifyUser(accessToken);
    if (!user) {
      return sendJson(new Headers(), 401, { error: "Session expired or invalid" });
    }
    // Attach user to request for downstream use
    req._user = user;
    return handler(req, ...args);
  };
}

// ── Tickets (authenticated) ─────────────────────────────────────────────────────

export async function handlePortalTickets(req) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  if (req.method === "GET") {
    const tickets = await listTicketsForClient(user.id);
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
      clientId: user.id,
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
    });
    return sendJson(new Headers(), 201, { ticket });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

export async function handlePortalTicketById(req, ticketId) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  const ticket = await findTicket(ticketId);
  if (!ticket || ticket.clientId !== user.id) {
    return sendJson(new Headers(), 404, { error: "Ticket not found" });
  }

  const pathname = new URL(req.url).pathname;
  const isReplies = pathname.endsWith("/replies");

  if (isReplies) {
    if (req.method === "GET") {
      const replies = await listTicketReplies(ticketId);
      const visible = replies.filter((r) => !r.isInternal);
      return sendJson(new Headers(), 200, { replies: visible });
    }

    if (req.method === "POST") {
      const parsed = await readJsonBody(req);
      if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
      const { body: replyBody, isInternal } = parsed.data ?? {};
      if (!replyBody || typeof replyBody !== "string" || replyBody.trim().length < 1) {
        return sendJson(new Headers(), 400, { error: "Reply body is required" });
      }
      const client = await findClientById(user.id);
      const reply = await createTicketReply({
        ticketId,
        authorType: "client",
        authorId: user.id,
        authorEmail: client?.email,
        body: replyBody.trim(),
        isInternal: false,
      });
      return sendJson(new Headers(), 201, { reply });
    }

    return sendJson(new Headers(), 405, { error: "Method not allowed" });
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
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  const client = await findClientById(user.id);
  if (!client) return sendJson(new Headers(), 404, { error: "Client not found" });

  const counts = await countTicketsByStatus(user.id);

  return sendJson(new Headers(), 200, {
    client: safeClient(client),
    tickets: counts,
    tier: client.tier,
  });
}

// ── Proposals (Phase 3) ─────────────────────────────────────────────────────────

export async function handlePortalProposals(req) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return sendJson(new Headers(), 500, { error: error.message });
    return sendJson(new Headers(), 200, { proposals: data ?? [] });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { title, description, totalAmount, tier, validUntil } = parsed.data ?? {};
    if (!title || !description) {
      return sendJson(new Headers(), 400, { error: "title and description are required" });
    }
    const { data, error } = await supabaseAdmin
      .from("proposals")
      .insert([{
        client_id: user.id,
        title,
        description,
        total_amount: totalAmount || 0,
        tier: tier || "foundation",
        valid_until: validUntil || null,
        status: "draft",
      }])
      .select()
      .single();
    if (error) return sendJson(new Headers(), 500, { error: error.message });
    return sendJson(new Headers(), 201, { proposal: data });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

export async function handlePortalProposalById(req, proposalId) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  const { data, error } = await supabaseAdmin
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("client_id", user.id)
    .single();
  if (error || !data) return sendJson(new Headers(), 404, { error: "Proposal not found" });

  if (req.method === "GET") return sendJson(new Headers(), 200, { proposal: data });

  if (req.method === "PATCH") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { status } = parsed.data ?? {};
    if (!["draft", "sent", "accepted", "rejected"].includes(status)) {
      return sendJson(new Headers(), 400, { error: "Invalid status" });
    }
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("proposals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", proposalId)
      .select()
      .single();
    if (updateError) return sendJson(new Headers(), 500, { error: updateError.message });
    return sendJson(new Headers(), 200, { proposal: updated });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

// ── Projects (Phase 3) ──────────────────────────────────────────────────────────

export async function handlePortalProjects(req) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return sendJson(new Headers(), 500, { error: error.message });
    return sendJson(new Headers(), 200, { projects: data ?? [] });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

// ── Admin: Client Management (unchanged, uses ADMIN_TOKEN) ──────────────────────

export async function handleAdminClients(req) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(new Headers(), 401, { error: "Unauthorized" });

  if (req.method === "GET") {
    const clients = await listClients();
    return sendJson(new Headers(), 200, { count: clients.length, clients: clients.map(safeClient) });
  }

  if (req.method === "POST") {
    const parsed = await readJsonBody(req);
    if (parsed.error) return sendJson(new Headers(), parsed.error.status, parsed.error.body);
    const { name, email, password, company, tier, role } = parsed.data ?? {};
    if (!name || !email || !password) {
      return sendJson(new Headers(), 400, { error: "name, email, and password are required" });
    }
    const existing = await findClientByEmail(email.toLowerCase().trim());
    if (existing) return sendJson(new Headers(), 409, { error: "A client with this email already exists" });

    // Create Supabase Auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, company, tier: tier || "foundation", role: role || "client" },
    });
    if (error || !data.user) {
      return sendJson(new Headers(), 400, { error: error?.message || "Failed to create auth user" });
    }

    const client = await createClient({
      id: data.user.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: null,
      company: company?.trim() || null,
      tier,
      role: role || "client",
    });
    return sendJson(new Headers(), 201, { client: safeClient(client) });
  }

  return sendJson(new Headers(), 405, { error: "Method not allowed" });
}

export async function handleAdminClientDigest(req, clientId) {
  const auth = await requireAdminSession(req);
  if (!auth) return sendJson(new Headers(), 401, { error: "Unauthorized" });

  if (req.method !== "POST") return sendJson(new Headers(), 405, { error: "Method not allowed" });

  const client = await findClientById(clientId);
  if (!client) return sendJson(new Headers(), 404, { error: "Client not found" });

  // Note: digest functionality would need to be implemented for Cloudflare
  // For now, return a stub response
  return sendJson(new Headers(), 200, { ok: true, sent: false, digest: null, message: "Digest not yet implemented for Cloudflare" });
}

// ── portal: digests ────────────────────────────────────────────────────

export async function handlePortalDigests(req) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return sendJson(new Headers(), 401, { error: "Not authenticated" });
  const user = await verifyUser(accessToken);
  if (!user) return sendJson(new Headers(), 401, { error: "Session expired" });

  if (!supabaseConfigured()) return sendJson(new Headers(), 503, { error: "Supabase not configured" });
  const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const r = await fetch(`${base}/rest/v1/monthly_digests?client_id=eq.${encodeURIComponent(user.id)}&select=*&order=month.desc`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!r.ok) return sendJson(new Headers(), 502, { error: `db error: ${await r.text()}` });
  const rows = await r.json();
  return sendJson(new Headers(), 200, { digests: rows });
}
