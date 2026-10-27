import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Ticket persistence — Supabase (prod) or JSONL fallback.
 */

let _warnedJsonlFallback = false;
function supabaseConfigured() {
  const ok = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  if (!ok && !_warnedJsonlFallback) {
    _warnedJsonlFallback = true;
    console.warn("[tickets] Supabase not configured — falling back to local JSONL store (data will not persist on serverless).");
  }
  return ok;
}

// ── JSONL backend ────────────────────────────────────────────────────────────

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(PROJECT_ROOT, "data", "tickets.jsonl");

async function ensureDir() { await mkdir(dirname(STORE), { recursive: true }); }

async function jsonlReadAll() {
  try {
    const raw = await readFile(STORE, "utf8");
    return raw.split("\n").filter((l) => l.trim()).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

async function jsonlWriteAll(rows) {
  await ensureDir();
  await writeFile(STORE, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

// ── Supabase backend ─────────────────────────────────────────────────────────

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

// ── public API ───────────────────────────────────────────────────────────────

export async function createTicket({ clientId, subject, description, priority }) {
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

  if (supabaseConfigured()) {
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

  const rows = await jsonlReadAll();
  rows.push(ticket);
  await jsonlWriteAll(rows);
  return ticket;
}

export async function findTicket(id) {
  if (supabaseConfigured()) {
    const base = process.env.SUPABASE_URL.replace(/\/$/, "");
    const res = await fetch(
      `${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: headers() },
    );
    if (!res.ok) throw new Error(`Supabase ticket read failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? fromRow(rows[0]) : null;
  }
  const rows = await jsonlReadAll();
  return rows.find((r) => r.id === id) || null;
}

export async function listTicketsForClient(clientId) {
  if (supabaseConfigured()) {
    const base = process.env.SUPABASE_URL.replace(/\/$/, "");
    const res = await fetch(
      `${base}/rest/v1/${TABLE}?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`,
      { headers: headers() },
    );
    if (!res.ok) throw new Error(`Supabase ticket list failed: ${res.status}`);
    const rows = await res.json();
    return rows.map(fromRow);
  }
  const rows = await jsonlReadAll();
  return rows.filter((r) => r.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateTicket(id, patch) {
  const now = new Date().toISOString();
  if (supabaseConfigured()) {
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
  const rows = await jsonlReadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  if (patch.status) rows[idx].status = patch.status;
  rows[idx].updatedAt = now;
  await jsonlWriteAll(rows);
  return rows[idx];
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

  if (supabaseConfigured()) return supabaseCreateReply(reply);

  // JSONL fallback
  const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  const REPLIES_STORE = join(PROJECT_ROOT, "data", "ticket-replies.jsonl");
  await ensureDir();
  let rows = [];
  try {
    const raw = await readFile(REPLIES_STORE, "utf8");
    rows = raw.split("\n").filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {}
  rows.push(reply);
  await writeFile(REPLIES_STORE, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  return reply;
}

/** List replies for a ticket. */
export async function listTicketReplies(ticketId) {
  if (supabaseConfigured()) return supabaseListReplies(ticketId);

  // JSONL fallback
  const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  const REPLIES_STORE = join(PROJECT_ROOT, "data", "ticket-replies.jsonl");
  let rows = [];
  try {
    const raw = await readFile(REPLIES_STORE, "utf8");
    rows = raw.split("\n").filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {}
  return rows.filter((r) => r.ticketId === ticketId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
