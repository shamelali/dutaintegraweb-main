import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { notifyEnquiry, recordEnquiry } from "./enquiries.mjs";
import { sendDigestEmail } from "./digest.mjs";

/**
 * Email provider wiring: priority Brevo > Resend > Postmark, identical in
 * enquiries.mjs and digest.mjs. Brevo was chosen for this project, so the
 * Brevo-only case is the one production must hit (exactly one key set).
 */

let calls;
let storeDir;

beforeEach(async () => {
  storeDir = await mkdtemp(join(tmpdir(), "email-"));
  process.env.ENQUIRY_STORE = join(storeDir, "enquiries.jsonl");
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.BREVO_API_KEY;
  delete process.env.POSTMARK_SERVER_TOKEN;
  process.env.CONTACT_INBOX_EMAIL = "hello@dutaintegra.my";
  delete process.env.ADMIN_EMAIL;
  process.env.EMAIL_FROM = "no-reply@dutaintegra.my";

  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  };
});

async function storedEnquiry() {
  return recordEnquiry({
    name: "Test Prospect",
    company: null,
    email: "prospect@example.com",
    phone: null,
    service: "General",
    message: "hi",
    ip: "127.0.0.1",
    userAgent: "test",
  });
}

test("brevo-only: posts to api.brevo.com with the dutaintegra.my sender", async () => {
  process.env.BREVO_API_KEY = "test-brevo-key";
  const delivered = await notifyEnquiry(await storedEnquiry());
  assert.equal(delivered, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.brevo\.com/);
  assert.equal(calls[0].body.sender.email, "no-reply@dutaintegra.my");
});

test("brevo wins when both brevo and resend keys are set", async () => {
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.BREVO_API_KEY = "test-brevo-key";
  const delivered = await notifyEnquiry(await storedEnquiry());
  assert.equal(delivered, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.brevo\.com/);
});

test("postmark is used when only its token is set", async () => {
  process.env.POSTMARK_SERVER_TOKEN = "test-postmark-token";
  const delivered = await notifyEnquiry(await storedEnquiry());
  assert.equal(delivered, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.postmarkapp\.com/);
});

test("no provider: returns false without calling fetch", async () => {
  const delivered = await notifyEnquiry(await storedEnquiry());
  assert.equal(delivered, false);
  assert.equal(calls.length, 0);
});

test("digest: postmark is supported and brevo outranks resend", async () => {
  const digest = {
    month: "2026-10",
    monthLabel: "October 2026",
    clientName: "Test Client",
    clientTier: "growth",
    enquiries: { total: 1, names: ["Prospect"] },
    tickets: { total: 0, open: 0, resolved: 0, recent: [] },
    health: "healthy",
  };
  const client = { id: "c1", email: "client@example.com" };

  // Size-restore cleanup: the digest log has no env override (data/digests.jsonl).
  const logPath = new URL("../data/digests.jsonl", import.meta.url);
  let before = 0;
  try {
    before = (await stat(logPath)).size;
  } catch {
    before = 0;
  }
  try {
    process.env.POSTMARK_SERVER_TOKEN = "test-postmark-token";
    assert.equal(await sendDigestEmail(client, digest), true);
    assert.match(calls.at(-1).url, /api\.postmarkapp\.com/);

    delete process.env.POSTMARK_SERVER_TOKEN;
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.BREVO_API_KEY = "test-brevo-key";
    assert.equal(await sendDigestEmail(client, digest), true);
    assert.match(calls.at(-1).url, /api\.brevo\.com/);
  } finally {
    const { writeFile, truncate } = await import("node:fs/promises");
    try {
      if (before === 0) await writeFile(logPath, "", "utf8");
      else await truncate(logPath, before);
    } catch {
      /* best-effort cleanup of a gitignored log */
    }
    const _unused = await readFile(logPath, "utf8").catch(() => "");
    assert.ok(typeof _unused === "string");
  }
});

test("digest: no provider returns false", async () => {
  const digest = {
    month: "2026-10",
    monthLabel: "October 2026",
    clientName: "Test Client",
    clientTier: "growth",
    enquiries: { total: 1, names: ["Prospect"] },
    tickets: { total: 0, open: 0, resolved: 0, recent: [] },
    health: "healthy",
  };
  assert.equal(await sendDigestEmail({ id: "c1", email: "c@example.com" }, digest), false);
  assert.equal(calls.length, 0);
});
