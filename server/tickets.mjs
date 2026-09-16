import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Ticket persistence — Supabase (prod) or JSONL fallback.
 */

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
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
