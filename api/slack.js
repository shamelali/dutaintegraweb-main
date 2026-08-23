// ============================================================================
// Slack Relay API — Vercel Serverless Function
//
// POST /api/slack  { text }
// Requires: Authorization: Bearer <admin JWT>
// Posts the message to the Slack channel via Incoming Webhook.
// Env: SLACK_WEBHOOK_URL (required), JWT_SECRET
// ============================================================================

export const config = { maxDuration: 10 };

const JWT_SECRET = process.env.JWT_SECRET || "duta-integra-admin-secret-change-in-production";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function verifyToken(token) {
  try {
    const [header, body, signature] = token.split(".");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (signature !== expected) return null;
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return json({ ok: false, error: "Slack not configured — set SLACK_WEBHOOK_URL on Vercel." }, 501);
  }

  // Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const user = token ? await verifyToken(token) : null;
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const text = String(body.text || "").trim().slice(0, 3000);
  if (!text) return json({ ok: false, error: "Message text is required." }, 400);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        username: "Duta Integra Admin",
        icon_emoji: ":briefcase:",
      }),
    });
    if (!res.ok) {
      console.error("Slack webhook error:", res.status, await res.text());
      return json({ ok: false, error: "Slack rejected the message (" + res.status + ")" }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("Slack post error:", err);
    return json({ ok: false, error: "Failed to reach Slack." }, 502);
  }
}

export { handler as GET, handler as POST };
