// api/lib/slack.js — Incoming Webhook with soft-fail + retry
import { config } from "./config.js";
import { logger } from "./logger.js";

export async function postToSlack(text, extra = {}) {
  const webhook = config.slackWebhookUrl;
  if (!webhook) {
    logger.warn("postToSlack skipped — SLACK_WEBHOOK_URL not set");
    return null;
  }
  const payload = JSON.stringify({ text: String(text || "").slice(0, 3500), ...extra });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      if (res.ok) return res;
      const body = await res.text().catch(() => "");
      logger.warn("postToSlack non-ok", { status: res.status, body: body.slice(0, 400) });
      if (res.status >= 500 && attempt === 0) { await new Promise(r => setTimeout(r, 600)); continue; }
      return res;
    } catch (err) {
      logger.error("postToSlack error", { error: err?.message, attempt });
      if (attempt === 0) { await new Promise(r => setTimeout(r, 600)); continue; }
      return null;
    }
  }
  return null;
}
