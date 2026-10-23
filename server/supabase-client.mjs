/**
 * Supabase REST client for Cloudflare Pages Functions.
 *
 * Uses fetch() against the Supabase REST API — no @supabase/supabase-js
 * dependency needed. Works natively in Cloudflare Workers runtime.
 *
 * Server-side only: SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security.
 * Never expose this key to the browser.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const REST_BASE = `${SUPABASE_URL}/rest/v1`;
const AUTH_BASE = `${SUPABASE_URL}/auth/v1`;

const SERVICE_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── Admin client (service role, bypasses RLS) ──────────────────────────────────

/**
 * Make a Supabase REST request with service role key.
 */
async function supabaseRequest(method, path, body = {}, headers = {}) {
  const url = `${REST_BASE}/${path}`;
  const response = await fetch(url, {
    method,
    headers: { ...SERVICE_HEADERS, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${method} ${path}: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

/**
 * Admin client object — matches the interface used by other modules.
 */
export const supabaseAdmin = {
  from: (table) => ({
    select: (columns = "*") => supabaseRequest("GET", `${table}?select=${encodeURIComponent(columns)}`),
    insert: (rows) => supabaseRequest("POST", table, rows),
    update: (updates, match) => {
      const filter = match ? `?${Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&")}` : "";
      return supabaseRequest("PATCH", `${table}${filter}`, updates);
    },
    delete: (match) => {
      const filter = match ? `?${Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&")}` : "";
      return supabaseRequest("DELETE", `${table}${filter}`);
    },
    eq: (column, value) => supabaseRequest("GET", `${table}?${column}=eq.${encodeURIComponent(value)}`),
    order: (column, { ascending = true } = {}) =>
      supabaseRequest("GET", `${table}?order=${column}.${ascending ? "asc" : "desc"}`),
    limit: (n) => supabaseRequest("GET", `${table}?limit=${n}`),
    single: async (promise) => {
      const result = await promise;
      if (Array.isArray(result)) return result[0] ?? null;
      return result;
    },
  }),
  auth: {
    admin: {
      createUser: async ({ email, password, email_confirm, user_metadata }) => {
        const response = await fetch(`${AUTH_BASE}/admin/users`, {
          method: "POST",
          headers: {
            ...SERVICE_HEADERS,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            email_confirm: email_confirm ?? true,
            user_metadata: user_metadata || {},
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          return { error: { message: `Supabase createUser: ${response.status} ${errorText}` } };
        }
        const data = await response.json();
        return { data, error: null };
      },
    },
    signInWithPassword: async ({ email, password }) => {
      const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { error: { message: `Supabase signIn: ${response.status} ${errorText}` } };
      }
      const data = await response.json();
      return { data, error: null };
    },
  },
};

/**
 * Create a Supabase client with a user's JWT token.
 * For client-side authenticated requests (portal, proposals, etc.).
 */
export function createSupabaseClient(accessToken) {
  const userHeaders = {
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return {
    from: (table) => ({
      select: (columns = "*") => {
        const url = `${REST_BASE}/${table}?select=${encodeURIComponent(columns)}`;
        return fetch(url, { headers: userHeaders }).then((r) => {
          if (!r.ok) throw new Error(`Supabase select: ${r.status}`);
          return r.json();
        });
      },
      insert: (rows) => {
        const url = `${REST_BASE}/${table}`;
        return fetch(url, {
          method: "POST",
          headers: userHeaders,
          body: JSON.stringify(rows),
        }).then((r) => {
          if (!r.ok) throw new Error(`Supabase insert: ${r.status}`);
          return r.json();
        });
      },
      auth: {
        getUser: async () => {
          const response = await fetch(`${AUTH_BASE}/user`, {
            headers: { ...userHeaders, Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) return { error: { message: "Invalid token" }, data: { user: null } };
          const data = await response.json();
          return { error: null, data: { user: data } };
        },
      },
    },
  };
}

/**
 * Verify a Supabase JWT token and return the user object.
 */
export async function verifyUser(accessToken) {
  try {
    const client = createSupabaseClient(accessToken);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
