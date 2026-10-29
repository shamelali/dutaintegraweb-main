import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { supabaseFetch, usingSupabase } from "./store.mjs";
import { dataFile } from "./paths.mjs";

/**
 * Durable portal sessions — Supabase (prod) or JSONL fallback (dev/tests).
 *
 * Two properties the in-process Map this replaced could not give:
 *
 * 1. A session outlives the request that minted it. Vercel invokes the handler
 *    in short-lived processes, so a Map means every cold start silently logs
 *    out every client that was signed in.
 * 2. Logout revokes. Clearing the cookie only hides the token; the session
 *    stayed valid to anyone who had captured it.
 *
 * Only SHA-256(token) is ever stored. The cookie carries the token itself, so
 * a datastore leak must not hand out live sessions. The hash is also the
 * primary key, which is what makes an upsert on login idempotent and a lookup
 * on each request a single indexed read.
 */

const TABLE = "portal_sessions";
const DEFAULT_STORE = dataFile("portal-sessions.jsonl");

/** Resolved per call, like enquiries.mjs, so a test can point this store at a
 *  throwaway file without re-importing the module. */
export function storePath() {
  return process.env.PORTAL_SESSION_STORE || DEFAULT_STORE;
}

// ── JSONL backend ────────────────────────────────────────────────────────────

async function jsonlReadAll() {
  let raw;
  try {
    raw = await readFile(storePath(), "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((row) => row && row.tokenHash);
}

async function jsonlWriteAll(rows) {
  await mkdir(dirname(storePath()), { recursive: true });
  await writeFile(
    storePath(),
    rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""),
    "utf8",
  );
}

// ── Supabase backend ─────────────────────────────────────────────────────────

function toRow(session) {
  return {
    token_hash: session.tokenHash,
    client_id: session.clientId,
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  };
}

function fromRow(row) {
  return {
    tokenHash: row.token_hash,
    clientId: row.client_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

const SELECT = "select=token_hash,client_id,expires_at,created_at";

// ── public API ───────────────────────────────────────────────────────────────

/**
 * @param {{ tokenHash: string, clientId: string, expiresAt: string }} input
 *        expiresAt is an ISO timestamp, not a duration, so a row written by one
 *        process means the same thing to the next one that reads it.
 */
export async function putSession({ tokenHash, clientId, expiresAt }) {
  const session = { tokenHash, clientId, expiresAt, createdAt: new Date().toISOString() };
  if (usingSupabase()) {
    const res = await supabaseFetch(TABLE, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(toRow(session)),
    });
    if (!res.ok) throw new Error(`Supabase session write failed: ${res.status}`);
    return session;
  }
  const rows = await jsonlReadAll();
  const idx = rows.findIndex((row) => row.tokenHash === tokenHash);
  if (idx >= 0) rows[idx] = session;
  else rows.push(session);
  await jsonlWriteAll(rows);
  return session;
}

/** @returns {Promise<{clientId: string, expiresAt: string} | null>} */
export async function readSession(tokenHash) {
  if (usingSupabase()) {
    const res = await supabaseFetch(
      `${TABLE}?token_hash=eq.${encodeURIComponent(tokenHash)}&${SELECT}&limit=1`,
    );
    if (!res.ok) throw new Error(`Supabase session read failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? fromRow(rows[0]) : null;
  }
  const rows = await jsonlReadAll();
  return rows.find((row) => row.tokenHash === tokenHash) ?? null;
}

export async function deleteSession(tokenHash) {
  if (usingSupabase()) {
    const res = await supabaseFetch(`${TABLE}?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Supabase session delete failed: ${res.status}`);
    return;
  }
  const rows = await jsonlReadAll();
  await jsonlWriteAll(rows.filter((row) => row.tokenHash !== tokenHash));
}

/**
 * Drop sessions whose expiry has passed. Called on login rather than from a
 * cron, because there is no cron on the Vercel deployment and an unbounded
 * table of dead rows is the failure mode of a durable session store. Reads the
 * expiry index, so the cost stays flat against live sessions, not history.
 */
export async function pruneExpiredSessions(now = Date.now()) {
  const cutoff = new Date(now).toISOString();
  if (usingSupabase()) {
    const res = await supabaseFetch(`${TABLE}?expires_at=lt.${cutoff}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Supabase session prune failed: ${res.status}`);
    return;
  }
  const rows = await jsonlReadAll();
  await jsonlWriteAll(rows.filter((row) => Date.parse(row.expiresAt) >= now));
}
