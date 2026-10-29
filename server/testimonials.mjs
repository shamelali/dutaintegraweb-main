import { appendFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { supabaseFetch, usingSupabase } from "./store.mjs";
import { dataFile } from "./paths.mjs";

/**
 * Testimonial persistence — Supabase (prod) or JSONL fallback (dev/tests).
 * Backend choice is delegated to store.mjs and made at call time, so tests can
 * toggle env vars between cases without re-importing.
 */

const TABLE = "testimonials";
const DEFAULT_STORE = dataFile("testimonials.jsonl");

/** Resolved per call, like enquiries.mjs, so a test can point this store at a
 *  throwaway file without re-importing the module. */
export function storePath() {
  return process.env.TESTIMONIAL_STORE || DEFAULT_STORE;
}

async function jsonlRecord(record) {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

function toRow(record) {
  return {
    id: record.id,
    client: record.client,
    tier: record.tier ?? null,
    quote: record.quote,
    author: record.author,
    created_at: record.createdAt,
  };
}

async function supabaseRecord(record) {
  const res = await supabaseFetch(TABLE, {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(toRow(record)),
  });
  if (!res.ok) throw new Error(`Supabase testimonial write failed: ${res.status}`);
  return record;
}

/**
 * @param {{ client: string, quote: string, author: string, tier?: string }} input
 * @returns {Promise<object>} the stored record
 */
export async function recordTestimonial({ client, quote, author, tier }) {
  const record = {
    id: randomUUID(),
    client,
    tier: tier ?? null,
    quote,
    author,
    createdAt: new Date().toISOString(),
  };
  return usingSupabase() ? supabaseRecord(record) : jsonlRecord(record);
}
