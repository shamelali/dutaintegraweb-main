// api/lib/email.js — Resend wrapper (correct SDK surface: resend.emails.send)

import { Resend } from "resend";
import { config } from "./config.js";
import { sanitizeHTML } from "./validate.js";
import { logger } from "./logger.js";

function getResend() {
  if (!config.resendApiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(config.resendApiKey);
}

export async function sendEmail({ to, subject, html, replyTo }) {
  const resend = getResend();
  const payload = {
    from: config.emailFrom,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  };
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

export function buildAdminHtml({ name, company, email, phone, service, message }) {
  const buildLabel = (l) => String(l).replace(/\b\w/g, (c) => c.toUpperCase());
  const buildValue = (v) => sanitizeHTML(v);
  const row = (label, value) => {
    if (!value) return "";
    return `
      <div style="margin-bottom: 12px;">
        <strong style="display: block; margin-bottom: 4px;">${buildLabel(label)}</strong>
        <p>${buildValue(value)}</p>
      </div>
    `;
  };
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #1a1a2e;">New Contact Form Submission</h2>
      <p style="color: #4a4a6a;">Received from dutaintegra.my website</p>
      <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 16px;">
        ${row("Name", name)}
        ${row("Company", company)}
        ${row("Email", email)}
        ${row("Phone", phone)}
        ${row("Service", service)}
        ${row("Message", message)}
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #6a6a8a; font-size: 0.875rem;">
        Origin: Server-side<br>
        Received at: ${new Date().toISOString()}
      </p>
    </div>
  `;
}

export async function sendAdminNotification(lead) {
  try {
    await sendEmail({
      to: config.emailTo,
      subject: `New contact: ${lead.name || "Unknown"} — ${lead.service || "no service"}`,
      html: buildAdminHtml(lead),
      replyTo: lead.email,
    });
  } catch (e) {
    logger.error("sendAdminNotification failed", { error: e?.message });
    throw e;
  }
}

export async function sendAutoreply(to, { name, message } = {}) {
  if (!config.emailAutoreply) return null;
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h3 style="color: #1a1a2e;">Thank you for contacting Duta Integra${name ? `, ${sanitizeHTML(name)}` : ""}</h3>
      <p style="color: #4a4a6a;">We have received your message and will get back to you within 24 hours.</p>
      ${message ? `<p style="color: #4a4a6a; background:#f8f9fb; padding:12px; border-left:3px solid #e08560;">${sanitizeHTML(message).slice(0, 800)}</p>` : ""}
      <p style="color: #6a6a8a;">Best regards,<br>Duta Integra Solutions Team<br><a href="https://dutaintegra.my">dutaintegra.my</a> · <a href="https://wa.me/601154034051">WhatsApp</a></p>
    </div>`;
  return sendEmail({ to, subject: "Receipt of your contact form submission — Duta Integra", html });
}
