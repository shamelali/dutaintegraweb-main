// api/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

function plausibleSecret(key) {
  return !!key && (key.startsWith("eyJ") || key.startsWith("sb_secret_"));
}

export function getSupabase() {
  const role = config.supabaseServiceKey;
  const anon = config.supabaseAnonKey;
  const key = plausibleSecret(role) ? role : anon;
  return createClient(config.supabaseUrl, key, { auth: { persistSession: false } });
}

export function getAnonSupabase() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey || "", { auth: { persistSession: false } });
}

export function getAdminSupabase() {
  // explicit service-role client (for admin writes that must bypass RLS)
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey || "", { auth: { persistSession: false } });
}

// lightweight health ping
export async function pingSupabase() {
  try {
    const sb = getSupabase();
    const { error } = await sb.from("leads").select("id").limit(1);
    return { ok: !error, error: error?.message || null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
