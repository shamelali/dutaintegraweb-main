import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Security: only allow emails from verified origins
const ALLOWED_ORIGINS = [
  "https://dutaintegra.my",
  "https://www.dutaintegra.my",
  "https://dutaintegraweb-main-mpjnmndfb-shamelalis-projects.vercel.app"
];

const FROM =
  process.env.EMAIL_FROM || "Duta Integra Website <noreply@dutaintegra.my>";
const TO = (process.env.EMAIL_TO || "hello@dutaintegra.my")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPLY_COPY = process.env.EMAIL_AUTOREPLY !== "false";

// Honeypot field - should remain empty
const HONEYPOT = process.env.HONEYPOT_FIELD || "website-bot";

// Turnstile secret for bot verification
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

// Rate limiting config
const MAX_SUBMISSIONS = Number(process.env.RATE_LIMIT_MAX) || 5;
const RATE_WINDOW = Number(process.env.RATE_WINDOW) || 60000; // 1 minute

// Rate tracking (in-memory for serverless; use Redis in production)
let submissionCount = 0;
let lastReset = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastReset > RATE_WINDOW) {
    submissionCount = 0;
    lastReset = now;
  }
  return submissionCount < MAX_SUBMISSIONS;
}

function incrementSubmissionCount() {
  submissionCount++;
}

// Verify Turnstile token with Cloudflare
async function verifyTurnstile(token, remoteip) {
  if (!TURNSTILE_SECRET) {
    // No secret configured - skip verification (dev mode)
    return { success: true };
  }
  if (!token) return { success: false, "error-codes": ["missing-input"] };
  
  const params = new URLSearchParams();
  params.append("secret", TURNSTILE_SECRET);
  params.append("response", token);
  if (remoteip) params.append("remoteip", remoteip);
  
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    return await res.json();
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return { success: false, "error-codes": ["verification-failed"] };
  }
}

// Input validation and sanitation
function sanitizeHTML(value) {
  return String(value)
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
    const h = highlight ? "<strong>" : "";
    return `
      <div style="margin-bottom: 12px;">
        <strong style="display: block; margin-bottom: 4px;">${bUILDADMINLABEL(label)}</strong>
        <p>${bUILDADMINVALUE(value)}</p>
      </div>
    `;
  };

  const bUILDADMINLABEL = (l) => l.replace(/\b\w/g, c => c.toUpperCase());
  const bUILDADMINVALUE = (v) => sanitizeHTML(v);

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #1a1a2e;">New Contact Form Submission</h2>
      <p style="color: #4a4a6a;">Received from dutaintegra.my website</p>
      <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 16px;">
        ${row("Name", name, true)}
        ${row("Company", company)}
        ${row("Email", email, true)}
        ${row("Phone", phone)}
        ${row("Service", service, true)}
        ${row("Message", message)}
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #6a6a8a; font-size: 0.875rem;">
        This email was sent from the dutaintegra.my contact form.<br>
        Received at: ${new Date().toISOString()}<br>
        Origin: ${typeof window !== "undefined" ? window.location.origin : "Server-side"}
      </p>
    </div>
  `;
}

// Slack notification for new leads (fire-and-forget, never blocks the form)
async function notifySlack({ name, company, email, phone, service, message }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const text = [
    ":inbox_tray: *New Lead — dutaintegra.my*",
    `*Name:* ${name || "—"}`,
    company ? `*Company:* ${company}` : null,
    `*Email:* ${email || "—"}`,
    phone ? `*Phone:* ${phone}` : null,
    service ? `*Service:* ${service}` : null,
    message ? `*Message:* ${String(message).slice(0, 300)}` : null,
  ].filter(Boolean).join("\n");
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, username: "Duta Integra Leads", icon_emoji: ":lead:" }),
    });
  } catch (err) {
    console.error("Slack notify error:", err);
  }
}

// Parse the incoming request body (accepts multipart/form-data AND JSON —
// the site's JS posts JSON; legacy integrations may post form data)
async function readFields(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    let obj = {};
    try { obj = await request.json(); } catch { obj = {}; }
    return {
      get: (key) => (obj[key] === undefined || obj[key] === null ? null : String(obj[key])),
    };
  }
  const form = await request.formData();
  return { get: (key) => form.get(key) };
}

async function handler(request) {
  // Origin check
  const origin = request.headers.get("origin") || "";
  const originAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  if (!originAllowed) {
    return new Response(
      JSON.stringify({ error: "Forbidden: Invalid origin" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  let fields;
  try {
    fields = await readFields(request);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Honeypot check - if honeypot is filled, it's a bot
  const honeypot = fields.get(HONEYPOT) || fields.get("website") || "";
  if (honeypot && honeypot.trim() !== "") {
    return new Response(
      JSON.stringify({ error: "Bot detection triggered" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Turnstile verification
  const turnstileToken = fields.get("cf-turnstile-response");
  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  const turnstileResult = await verifyTurnstile(turnstileToken, clientIp);
  if (!turnstileResult.success) {
    console.error("Turnstile verification failed:", turnstileResult["error-codes"]);
    return new Response(
      JSON.stringify({ error: "Security check failed. Please try again." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit check
  if (!checkRateLimit()) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Form data validation
  const name = fields.get("name") || "";
  const company = fields.get("company") || "";
  const email = fields.get("email") || "";
  const phone = fields.get("phone") || "";
  const service = fields.get("service") || "";
  const message = fields.get("message") || "";

  // Email validation
  if (!isEmail(email)) {
    return new Response(
      JSON.stringify({ error: "Invalid email address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Increment rate counter
  incrementSubmissionCount();

  // Build the email content
  const adminHtml = buildAdminHtml({ name, company, email, phone, service, message });

  // Send via Resend
  try {
    const lang = fields.get("lang") || "en";
    const langPrefix = lang === "ms" ? "[MS] " : "";

    const data = {
      from: FROM,
      to: TO,
      subject: `${langPrefix}New contact form submission from ${name || "Unknown"}`,
      html: adminHtml,
      reply_to: email,
    };

    // Add reply copy if configured
    if (REPLY_COPY) {
      data["reply_to"] = email;
    }

    await resend.sendEmail(data);

    // Post the lead to Slack (does not block or fail the response)
    notifySlack({ name, company, email, phone, service, message });

    // Send auto-reply if configured
    if (process.env.EMAIL_AUTOREPLY) {
      const autoReplyHtml = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h3 style="color: #1a1a2e;">Thank you for contacting Duta Integra</h3>
          <p style="color: #4a4a6a;">We have received your message and will get back to you within 24 hours.</p>
          <p style="color: #4a4a6a;">Your message: "${sanitizeHTML(message || "")}</p>
          <p style="color: #6a6a8a;">Best regards,<br>Duta Integra Solutions Team</p>
        </div>
      `;
      await resend.sendEmail({
        from: FROM,
        to: email,
        subject: "Receipt of your contact form submission",
        html: autoReplyHtml,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// For Vercel Serverless Functions
export { handler as GET, handler as POST };

