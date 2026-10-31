import { randomUUID } from "node:crypto";
import { backendStatus, supabaseFetch } from "./store.mjs";
import { resolveInboxEmail } from "./enquiries.mjs";

/**
 * Data-layer health reporting for GET /api/health.
 *
 * "Healthy" used to mean "the process answered". A site could report ok:true
 * while every lead was being appended to a file that the next redeploy
 * discards. This module makes the claim expensive: with Supabase selected the
 * probe writes a sentinel row, reads it back, and deletes it, so ok:true now
 * means the datastore round-tripped real data within the last 60 seconds.
 */

const PROBE_TABLE = "health_probe";
const PROBE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 3_000;

let cache = null;

export function resetHealthProbeCache() {
  cache = null;
}

async function get(path) {
  return supabaseFetch(path, { method: "GET", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

/**
 * Write / read / delete a sentinel row.
 *
 * Supabase error bodies are inspected for the missing-relation signature and
 * then discarded: echoing them would publish table and column names through a
 * public endpoint.
 */
async function probeSupabaseRoundTrip() {
  const id = randomUUID();

  let write;
  try {
    write = await supabaseFetch(PROBE_TABLE, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id, note: "health probe" }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, probe: "unreachable", cleanup: true };
  }

  if (!write.ok) {
    const body = await write.text().catch(() => "");
    const relationMissing = write.status === 404 || /42P01|does not exist/i.test(body);
    return { ok: false, probe: relationMissing ? "migration_missing" : "unreachable", cleanup: true };
  }

  let read;
  try {
    read = await get(`${PROBE_TABLE}?id=eq.${encodeURIComponent(id)}&select=id`);
  } catch {
    return { ok: false, probe: "unreachable", cleanup: true };
  }

  let rows = [];
  if (read.ok) {
    try {
      rows = await read.json();
    } catch {
      rows = [];
    }
  }
  const readable = read.ok && Array.isArray(rows) && rows.length === 1;

  let cleaned = false;
  try {
    const del = await supabaseFetch(`${PROBE_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    cleaned = del.ok;
  } catch {
    cleaned = false;
  }

  if (!readable) return { ok: false, probe: "read_failed", cleanup: cleaned };
  return { ok: true, probe: "roundtrip", cleanup: cleaned };
}

/**
 * @param {{ now?: number, force?: boolean }} [options]
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function healthReport({ now = Date.now(), force = false } = {}) {
  if (!force && cache && now - cache.at < PROBE_TTL_MS) {
    return { ...cache.report, status: cache.status, cached: true };
  }

  const { backend, error } = backendStatus();
  const inboxConfigured = Boolean(resolveInboxEmail());
  const onServerless = Boolean(process.env.VERCEL);
  const warnings = [];

  let datastore;
  if (error) {
    warnings.push(error);
    datastore = { backend: null, ok: false, probe: "unconfigured" };
  } else if (backend === "supabase") {
    const result = await probeSupabaseRoundTrip();
    if (result.probe === "migration_missing") {
      warnings.push(`health probe table "${PROBE_TABLE}" is missing - apply supabase/migrations`);
    } else if (result.probe === "unreachable") {
      warnings.push("Supabase configured but unreachable");
    } else if (result.probe === "read_failed") {
      warnings.push("Supabase accepted the probe write but the row could not be read back");
    }
    if (!result.cleanup && result.probe !== "migration_missing") {
      warnings.push("health probe row was not cleaned up");
    }
    datastore = { backend, ok: result.ok, probe: result.probe };
  } else {
    // JSONL: durable on a real filesystem, worthless on serverless.
    const durable = !onServerless;
    if (!durable) {
      warnings.push(
        "storage backend is jsonl on a serverless platform - leads will not persist across cold starts; configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    datastore = { backend, ok: durable, probe: "skipped" };
  }

  datastore.checkedAt = new Date(now).toISOString();

  if (!inboxConfigured) {
    warnings.push("no CONTACT_INBOX_EMAIL/ADMIN_EMAIL configured - enquiry notifications disabled");
  }

  const body = {
    ok: datastore.ok && !error,
    inbox: { ok: inboxConfigured },
    datastore,
    payments: {
      providersConfigured: {
        hitpay: Boolean(process.env.HITPAY_API_KEY && process.env.HITPAY_SECRET_KEY),
        billplz: Boolean(process.env.BILLPLZ_API_KEY && process.env.BILLPLZ_COLLECTION_ID),
      },
    },
    // Retained so the deployed uptime automation keeps parsing while it is
    // updated to read `datastore` instead.
    inboxConfigured,
    supabaseConfigured: backend === "supabase",
    storageBackend: datastore.backend,
    storageDurable: Boolean(datastore.backend) && (datastore.backend === "supabase" || !onServerless),
    warnings,
  };

  // A deploy whose datastore cannot durably hold a lead is not healthy,
  // whatever else the process can answer.
  const status = body.ok ? 200 : 503;

  cache = { at: now, report: body, status };
  return { ...body, status };
}
