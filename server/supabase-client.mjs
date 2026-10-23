/**
 * Supabase client for Cloudflare Pages Functions.
 *
 * Uses the service role key for server-side operations (bypasses RLS).
 * Never expose this key to the browser — it is server-side only.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

/**
 * Admin client — bypasses Row Level Security. Server-side only.
 * Use for: admin operations, client management, audit logs.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Create a Supabase client with a user's JWT token.
 * Use for: client-side authenticated requests (portal, proposals, etc.).
 */
export function createSupabaseClient(accessToken) {
  return createClient(supabaseUrl, accessToken, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Verify a Supabase JWT token and return the user object.
 * Returns null if the token is invalid or expired.
 */
export async function verifyUser(accessToken) {
  const client = createSupabaseClient(accessToken);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
