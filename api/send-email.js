import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.EMAIL_FROM || "Duta Integra Website <noreply@dutaintegra.my>";
const TO = (process.env.EMAIL_TO || "hello@dutaintegra.my")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPLY_COPY = process.env.EMAIL_AUTOREPLY !== "false";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function buildAdminHtml({ name, company, email, phone, service, message }) {
  const row = (label, value, highlight = false) => {
    if (!value) return "";
    return `
      <div class="field">
        <div class="field-label">${esc(label)}</div>
        <div class="field-value${highlight ? " highlight" : ""}">${value}</div>
      </div>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Inter, Segoe UI, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1E2D3D; max-width: 600px; margin: 0 auto; padding: 20px; background: #F8F9FB; }
    .card { background: #fff; border: 1px solid #D5D9E0; border-top: 3px solid #C9A227; border-radius: 2px; overflow: hidden; }
    .header { background: #1E2D3D; color: #F8F9FB; padding: 22px 24px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
    .header p { margin: 6px 0 0; color: #B8BEC8; font-size: 13px; }
    .content { padding: 22px 24px; }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8B919A; font-weight: 600; margin-bottom: 4px; }
    .field-value { font-size: 15px; color: #1E2D3D; background: #F8F9FB; padding: 10px 12px; border: 1px solid #E6E9EE; border-radius: 2px; }
    .field-value.highlight { border-left: 3px solid #C9A227; font-weight: 600; }
    .message-box { white-space: pre-wrap; background: #F8F9FB; padding: 14px; border: 1px solid #E6E9EE; border-radius: 2px; }
    a { color: #1E2D3D; }
    .footer { text-align: center; padding: 16px 8px 0; font-size: 12px; color: #8B919A; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New contact form submission</h1>
      <p>dutaintegra.my · ${esc(new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }))} MYT</p>
    </div>
    <div class="content">
      ${row("Name", esc(name), true)}
      ${row("Company", esc(company))}
      ${row("Email", `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
      ${row("Phone / WhatsApp", esc(phone))}
      ${row("Service interest", esc(service), true)}
      ${
        message
          ? `<div class="field"><div class="field-label">Message</div><div class="message-box">${esc(message)}</div></div>`
          : ""
      }
    </div>
  </div>
  <div class="footer">Sent from the Duta Integra Solutions website contact form.</div>
</body>
</html>`;
}

function buildAutoReplyHtml({ name, service }) {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Inter, Segoe UI, Helvetica, Arial, sans-serif; line-height: 1.65; color: #1E2D3D; max-width: 600px; margin: 0 auto; padding: 20px; background: #F8F9FB; }
    .card { background: #fff; border: 1px solid #D5D9E0; border-top: 3px solid #C9A227; border-radius: 2px; padding: 28px 24px; }
    h1 { margin: 0 0 12px; font-size: 20px; color: #1E2D3D; }
    p { margin: 0 0 12px; color: #5F5E5A; }
    .gold { color: #C9A227; font-weight: 600; }
    .meta { margin-top: 20px; padding-top: 16px; border-top: 1px solid #E6E9EE; font-size: 13px; color: #8B919A; }
    a { color: #1E2D3D; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Thanks, ${esc(first)} — we got your message.</h1>
    <p>The Duta Integra team will reply within <span class="gold">one business day</span>.</p>
    <p>You asked about: <strong>${esc(service)}</strong>.</p>
    <p>If something is urgent, WhatsApp us at <a href="https://wa.me/601154034051">+60 11-5403 4051</a>.</p>
    <div class="meta">
      Duta Integra Solutions · Cyberjaya, Malaysia<br />
      <a href="mailto:hello@dutaintegra.my">hello@dutaintegra.my</a> · <a href="https://dutaintegra.my">dutaintegra.my</a>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return res.status(503).json({
      error: "Email is not configured. Set RESEND_API_KEY in the environment.",
      code: "EMAIL_NOT_CONFIGURED",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  body = body || {};

  // Honeypot — bots fill hidden fields
  if (body.website || body.hp) {
    return res.status(200).json({ success: true, skipped: true });
  }

  // Verify Turnstile token
  if (TURNSTILE_SECRET_KEY) {
    const turnstileResponse = body.turnstile;
    if (!turnstileResponse) {
      return res.status(400).json({ error: "Turnstile verification failed." });
    }
    const turnstileVerify = await fetch(
      "https://challenges.cloudflare.com/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: turnstileResponse,
        }),
      }
    );
    const turnstileData = await turnstileVerify.json();
    if (!turnstileData.success) {
      console.error("Turnstile verification failed:", turnstileData);
      return res.status(400).json({ error: "Bot detection activated." });
    }
  }

  const name = String(body.name || "").trim();
  const company = String(body.company || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const service = String(body.service || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !service) {
    return res.status(400).json({ error: "Name, email, and service are required." });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (name.length > 120 || company.length > 160 || service.length > 160 || message.length > 5000) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `New enquiry · ${service} · ${name}`,
      html: buildAdminHtml({ name, company, email, phone, service, message }),
      text: [
        `New contact form submission`,
        ``,
        `Name: ${name}`,
        company ? `Company: ${company}` : null,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        `Service: ${service}`,
        message ? `Message:\n${message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: error.message || "Failed to send email." });
    }

    // Best-effort confirmation to the visitor
    if (REPLY_COPY && isEmail(email)) {
      try {
        await resend.emails.send({
          from: FROM,
          to: [email],
          replyTo: TO[0] || "hello@dutaintegra.my",
          subject: "We received your message — Duta Integra Solutions",
          html: buildAutoReplyHtml({ name, service }),
        });
      } catch (autoErr) {
        console.error("Auto-reply failed:", autoErr);
      }
    }

    // Best-effort Slack notification
    if (SLACK_WEBHOOK_URL) {
      try {
        const slackPayload = {
          text: `*New contact form submission*\n*Name:* ${name}\n*Email:* ${email}\n*Service:* ${service}\n${phone ? "*Phone:* " + phone : ""}\n${message ? "*Message:* " + (message.length > 200 ? message.substring(0, 200) + "..." : message) : ""}`,
         mrkdwn: true,
        };
        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        });
      } catch (slackErr) {
        console.error("Slack notification failed:", slackErr);
        // Don't break the email response if Slack fails
      }
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
