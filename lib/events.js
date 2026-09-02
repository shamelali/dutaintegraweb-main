// api/lib/events.js — first-party event bus for autonomous business
// All product analytics and lead lifecycle events flow through here.
// Writes to Supabase events table + optional webhook fanout.

import { getSupabase } from "./supabase.js";
import { logger } from "./logger.js";
import { config } from "./config.js";

const ALLOWED_TYPES = new Set([
  "page_view", "preview_register", "preview_click",
  "lead_created", "audit_run", "audit_shared",
  "lead_status_changed", "product_viewed", "case_viewed",
]);

export function isAllowedEventType(t) { return ALLOWED_TYPES.has(String(t)); }

export async function trackEvent({ type, path = "/", meta = {}, _req } = {}) {
  if (!isAllowedEventType(type)) throw new Error(`Unknown event type: ${type}`);
  const row = {
    type: String(type),
    path: String(path).slice(0, 300),
    meta: meta && typeof meta === "object" ? meta : { value: String(meta).slice(0, 500) },
  };
  try {
    const { error } = await getSupabase().from("events").insert(row);
    if (error) logger.warn("trackEvent insert failed", { error: error.message, type });
    else logger.info("event tracked", { type, path: row.path });
  } catch (e) {
    logger.error("trackEvent threw", { error: e?.message, type });
  }
  // optional webhook fanout for autonomous CRM sync (Zapier/Make)
  const webhook = config.slackWebhookUrl ? null : null; // placeholder: add WEBHOOK_URL for CRM
  if (webhook) {
    fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) }).catch(() => {});
  }
  return row;
}
