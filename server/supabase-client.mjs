/**
 * Supabase REST client for Cloudflare Pages Functions.
 *
 * Uses fetch() against the Supabase REST API — no @supabase/supabase-js
 * dependency needed. Works natively in Cloudflare Workers runtime.
 *
 * Server-side only: SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security.
 * Never expose this key to the browser.
 *
 * Config is read lazily on first use, NOT at module scope: Pages injects
 * environment bindings per deployment, and the request handler copies
 * context.env into process.env before dispatch. A module-scope read broke
 * worker boot ("process is not defined" at the old compatibility_date, then
 * a boot throw when vars were missing) and took every /api route down.
 * Missing config now surfaces as a per-request error plus
 * supabaseConfigured() on /api/health — loud, but the worker boots.
 */

let cachedConfig = null;

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function getSupabaseConfig() {
  if (cachedConfig) return cachedConfig;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  cachedConfig = {
    url: url.replace(/\/$/, ""),
    key,
    REST_BASE: `${url.replace(/\/$/, "")}/rest/v1`,
    AUTH_BASE: `${url.replace(/\/$/, "")}/auth/v1`,
    SERVICE_HEADERS: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
  return cachedConfig;
}

// ── Admin client (service role, bypasses RLS) ──────────────────────────────────

/**
 * Make a Supabase REST request with service role key.
 */
async function supabaseRequest(method, path, body = {}, headers = {}) {
  const { REST_BASE, SERVICE_HEADERS } = getSupabaseConfig();
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
      const { AUTH_BASE, SERVICE_HEADERS } = getSupabaseConfig();
      const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SERVICE_HEADERS.apikey,
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
  const { REST_BASE, AUTH_BASE, SERVICE_HEADERS } = getSupabaseConfig();
  const userHeaders = {
    Authorization: `Bearer ${accessToken}`,
    apikey: SERVICE_HEADERS.apikey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return {
    // verifyUser calls client.auth.getUser(), so auth belongs on the client.
    // Nested under from() it was unreachable, and AUTH_BASE was out of scope
    // besides — every token the portal checked came back null.
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
    }),
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
