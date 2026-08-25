// TEMPORARY inspector — removed after use.
import { getSupabase, json } from "../_lib.js";
const ONCE_KEY = "insp-8k3n5p2q-v7r4t";
export const config = { maxDuration: 15 };
async function handler(req) {
  if (new URL(req.url).searchParams.get("key") !== ONCE_KEY) return json({ ok: false }, 401);
  const { data, error } = await getSupabase()
    .from("products")
    .select("id, name, status, sort_order");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, rows: data });
}
export { handler as GET };
