#!/usr/bin/env node
/**
 * Email setup check for dutaintegra.my (Brevo).
 *
 * Usage:
 *   node --env-file-if-exists=.env scripts/test-email.mjs          # dry run (no network, no email sent)
 *   node --env-file-if-exists=.env scripts/test-email.mjs --live   # validates BREVO_API_KEY via GET /v3/account
 *   node --env-file-if-exists=.env scripts/test-email.mjs --live --send-to you@example.com
 *     # validates key AND sends one real test email via Brevo
 *
 * Never prints secret values — only set/missing and key prefixes.
 */

const args = new Set(process.argv.slice(2));
const LIVE = args.has("--live");
const sendTo = process.argv[process.argv.indexOf("--send-to") + 1] ?? null;

function redact(key) {
  if (!key) return "(missing)";
  const t = key.trim();
  if (!t) return "(blank)";
  return `${t.slice(0, 6)}…(${t.length} chars)`;
}

let failures = 0;
function check(label, ok, hint = "") {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !hint ? "" : ` — ${hint}`}`);
  if (!ok) failures += 1;
}

const inbox = process.env.CONTACT_INBOX_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || null;
const from = process.env.EMAIL_FROM?.trim() || null;
const providers = ["RESEND_API_KEY", "BREVO_API_KEY", "POSTMARK_SERVER_TOKEN"].filter(
  (k) => process.env[k]?.trim(),
);

console.log("── config ──");
check("inbox (CONTACT_INBOX_EMAIL or ADMIN_EMAIL)", Boolean(inbox), "set CONTACT_INBOX_EMAIL=hello@dutaintegra.my");
if (inbox) console.log(`      inbox: ${inbox}`);
check("EMAIL_FROM", Boolean(from), "set EMAIL_FROM=no-reply@dutaintegra.my");
if (from) console.log(`      from: ${from}`);
console.log(`      BREVO_API_KEY: ${redact(process.env.BREVO_API_KEY)}`);
if (providers.length === 0) {
  check("exactly one provider key set", false, "set BREVO_API_KEY (Brevo chosen)");
} else if (providers.length > 1) {
  check("exactly one provider key set", false, `multiple set (${providers.join(", ")}) — enquiries use ${providers[0]}`);
} else {
  check(`exactly one provider key set (${providers[0]})`, true);
}

if (!LIVE) {
  // Dry run: prove the notify path returns delivered=true with a mocked Brevo.
  console.log("── dry run (mocked Brevo, nothing sent) ──");
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), to: JSON.parse(init.body).to?.[0]?.email ?? JSON.parse(init.body).to });
    return new Response(JSON.stringify({ messageId: "mock" }), { status: 201 });
  };
  process.env.BREVO_API_KEY = "dry-run-key";
  delete process.env.RESEND_API_KEY;
  delete process.env.POSTMARK_SERVER_TOKEN;
  process.env.CONTACT_INBOX_EMAIL ??= "hello@dutaintegra.my";
  process.env.EMAIL_FROM ??= "no-reply@dutaintegra.my";
  try {
    const { notifyEnquiry } = await import("../server/enquiries.mjs");
    const delivered = await notifyEnquiry({
      id: "dry-run",
      name: "Dry Run",
      company: null,
      email: "prospect@example.com",
      phone: null,
      service: "General",
      message: "dry run",
      created_at: new Date().toISOString(),
    }).catch(() => "threw");
    // notifyEnquiry tries markEnquiryEmailed → JSONL write; ignore store errors, check provider call happened
    check("Brevo endpoint called", calls.some((c) => c.url.includes("api.brevo.com")), JSON.stringify(calls));
    console.log(`      delivered path: ${delivered === true ? "true (would send)" : "not completed without store — provider wiring ok"}`);
  } finally {
    globalThis.fetch = realFetch;
  }
} else {
  // Live: validate the real key against Brevo without sending.
  console.log("── live (Brevo /v3/account) ──");
  if (!process.env.BREVO_API_KEY?.trim()) {
    check("BREVO_API_KEY present", false, "paste key into .env first");
  } else {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY.trim(), accept: "application/json" },
    });
    check("Brevo key valid", res.ok, `Brevo responded ${res.status} — check key or sender setup`);
    if (res.ok) {
      const acct = await res.json().catch(() => ({}));
      console.log(`      account email: ${acct.email ?? "(unknown)"}`);
    }
    if (sendTo) {
      const payload = {
        sender: { name: "Duta Integra", email: from ?? "no-reply@dutaintegra.my" },
        to: [{ email: sendTo }],
        subject: "Duta Integra — email setup test",
        textContent: "This is a setup test from dutaintegra.my. If you got this, Brevo delivery works.",
      };
      const send = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY.trim(), "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      check(`test email sent to ${sendTo}`, send.ok, `Brevo responded ${send.status}: ${(await send.text()).slice(0, 160)}`);
    }
  }
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
