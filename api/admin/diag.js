// TEMPORARY diagnostic — reports env-var shape + which Supabase key fails.
// Returns NO secret material: only presence, length, and 6-char prefix.
// Delete this file after the API keys are fixed.

import { createClient } from "@supabase/supabase-js";
import { json } from "../_lib.js";

export const config = { maxDuration: 10 };

function shape(v) {
  if (!v) return { present: false };
  return { present: true, len: v.length, prefix: String(v).slice(0, 6), quoted: /^["']|["']$/.test(v) };
}

async function trySelect(url, key, table) {
  if (!url || !key) return { skipped: true };
  try {
    const c = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await c.from(table).select("*").limit(1);
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, threw: err?.message };
  }
}

async function handler() {
  const url = process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const [anonProducts, svcProducts] = await Promise.all([
    trySelect(url, anon, "products"),
    trySelect(url, svc, "products"),
  ]);

  return json({
    url: shape(url),
    anonKey: shape(anon),
    serviceKey: shape(svc),
    probes: { anonProducts, svcProducts },
  });
}

export { handler as GET };
