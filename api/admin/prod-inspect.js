// TEMPORARY — removed after use.
import { getSupabase, json } from "../_lib.js";
const ONCE_KEY = "insp-8k3n5p2q-v7r4t";
export const config = { maxDuration: 15 };
async function handler(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== ONCE_KEY) return json({ ok: false }, 401);
  const supabase = getSupabase();
  if (url.searchParams.get("publish") === "all") {
    const { data, error } = await supabase
      .from("products")
      .update({ status: "published" })
      .neq("name", "")
      .select("name");
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, published: (data || []).map((p) => p.name) });
  }
  const { data, error } = await supabase.from("products").select("id, name, status");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, rows: data });
}
export { handler as GET };
