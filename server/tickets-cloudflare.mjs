/**
 * Ticket persistence — Supabase only (Cloudflare compatible).
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

const TABLE = "tickets";

function fromRow(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    subject: r.subject,
    description: r.description,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRow(t) {
  return {
    id: t.id,
    client_id: t.clientId,
    subject: t.subject,
    description: t.description ?? null,
    status: t.status ?? "open",
    priority: t.priority ?? "medium",
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

const { randomUUID } = crypto;

export async function createTicket({ clientId, subject, description, priority }) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const now = new Date().toISOString();
  const ticket = {
    id: randomUUID(),
    clientId,
    subject,
    description: description ?? null,
    status: "open",
    priority: priority ?? "medium",
    createdAt: now,
    updatedAt: now,
  };
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: headers({ prefer: "return=representation" }),
    body: JSON.stringify(toRow(ticket)),
  });
  if (!res.ok) throw new Error(`Supabase ticket insert failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : ticket;
}

export async function findTicket(id) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`Supabase ticket read failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

export async function listTicketsForClient(clientId) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/${TABLE}?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`Supabase ticket list failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromRow);
}

export async function updateTicket(id, patch) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const now = new Date().toISOString();
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const body = { updated_at: now };
  if (patch.status) body.status = patch.status;
  const res = await fetch(
    `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", headers: headers({ prefer: "return=representation" }), body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`Supabase ticket update failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? fromRow(rows[0]) : null;
}

export async function countTicketsByStatus(clientId) {
  const tickets = await listTicketsForClient(clientId);
  const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: tickets.length };
  for (const t of tickets) {
    if (counts[t.status] !== undefined) counts[t.status]++;
  }
  return counts;
}

// ── Ticket Replies ────────────────────────────────────────────────────────────

const REPLIES_TABLE = "ticket_replies";

function replyFromRow(r) {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    authorType: r.author_type,
    authorId: r.author_id,
    authorEmail: r.author_email,
    body: r.body,
    isInternal: r.is_internal,
    createdAt: r.created_at,
  };
}

function replyToRow(r) {
  return {
    id: r.id,
    ticket_id: r.ticketId,
    author_type: r.authorType,
    author_id: r.authorId,
    author_email: r.authorEmail,
    body: r.body,
    is_internal: r.isInternal,
    created_at: r.createdAt,
  };
}

async function supabaseCreateReply(reply) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${REPLIES_TABLE}`, {
    method: "POST",
    headers: headers({ prefer: "return=representation" }),
    body: JSON.stringify(replyToRow(reply)),
  });
  if (!res.ok) throw new Error(`Supabase reply insert failed: ${res.status}`);
  const rows = await res.json();
  return rows.length ? replyFromRow(rows[0]) : reply;
}

async function supabaseListReplies(ticketId) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/${REPLIES_TABLE}?ticket_id=eq.${encodeURIComponent(ticketId)}&select=*&order=created_at.asc`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`Supabase reply list failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(replyFromRow);
}

/** Add a reply to a ticket. */
export async function createTicketReply({ ticketId, authorType, authorId, authorEmail, body, isInternal }) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  const now = new Date().toISOString();
  const reply = {
    id: randomUUID(),
    ticketId,
    authorType,
    authorId,
    authorEmail,
    body,
    isInternal: isInternal ?? false,
    createdAt: now,
  };
  return supabaseCreateReply(reply);
}

/** List replies for a ticket. */
export async function listTicketReplies(ticketId) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return supabaseListReplies(ticketId);
}