/**
 * Single source of truth for which storage backend a request uses.
 *
 * Replaces the six copies of `supabaseConfigured()` that previously lived in
 * clients.mjs, cms.mjs, digest.mjs, enquiries.mjs, portal.mjs and handler.mjs.
 * Each copy decided independently, and every one of them chose silently: a
 * half-configured pair, or no pair at all in production, quietly redirected
 * writes to a JSONL file that a serverless redeploy discards.
 *
 * Resolution rules (prd-data-layer-hardening.md US-001, FR-2/FR-3):
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY both set  -> "supabase"
 *   - exactly one set                                      -> error, every environment
 *   - neither set, NODE_ENV=production                     -> error
 *   - neither set, elsewhere                               -> "jsonl", warned once per process
 *
 * A partially configured pair is an error in development on purpose: someone
 * meant to configure Supabase and got it wrong, and the alternative is writing
 * customer PII to a file nobody will ever read back.
 */

export class StorageConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "StorageConfigError";
    this.code = "STORAGE_CONFIG";
  }
}

const PARTIAL_PAIR =
  "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set or both be unset. " +
  "A half-configured pair would silently write customer data to a local JSONL file. " +
  "For local development, unset both.";

const UNSET_IN_PRODUCTION =
  "No storage backend configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both unset " +
  "while NODE_ENV=production. The JSONL fallback is not durable on serverless, so leads would " +
  "be accepted and then discarded on the next cold start.";

let warnedJsonlFallback = false;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Non-throwing resolution, for route guards that must answer 503 rather than
 * let a configuration error surface as a 500.
 *
 * @returns {{ backend: "supabase"|"jsonl"|null, error: string|null }}
 */
export function backendStatus() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (Boolean(url) !== Boolean(key)) return { backend: null, error: PARTIAL_PAIR };
  if (url && key) return { backend: "supabase", error: null };
  if (isProduction()) return { backend: null, error: UNSET_IN_PRODUCTION };

  if (!warnedJsonlFallback) {
    warnedJsonlFallback = true;
    console.warn(
      "[store] Supabase not configured — using the local JSONL store in data/. " +
        "This is fine for development and tests, and must never be true in production.",
    );
  }
  return { backend: "jsonl", error: null };
}

/** @returns {"supabase"|"jsonl"} @throws {StorageConfigError} when misconfigured. */
export function resolveBackend() {
  const { backend, error } = backendStatus();
  if (error) throw new StorageConfigError(error);
  return backend;
}

/** @returns {boolean} true when writes must go to Supabase. */
export function usingSupabase() {
  return resolveBackend() === "supabase";
}

/**
 * Non-throwing readiness check for route guards that answer 503 when Supabase
 * is not usable, instead of letting a configuration error surface as a 500.
 */
export function supabaseReady() {
  return backendStatus().backend === "supabase";
}

/** Reset the once-per-process dev warning, for tests. */
export function resetBackendWarnings() {
  warnedJsonlFallback = false;
}

/**
 * Shared Supabase REST call built on the resolver, so no module can reach the
 * database without having gone through backend selection first.
 *
 * @param {string} path e.g. "leads?id=eq.abc&select=*"
 * @param {RequestInit} [init]
 * @returns {Promise<Response>} the raw Response; callers inspect `ok`
 */
export async function supabaseFetch(path, init = {}) {
  if (!usingSupabase()) {
    throw new StorageConfigError("supabaseFetch called while the JSONL backend is active");
  }
  const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}
