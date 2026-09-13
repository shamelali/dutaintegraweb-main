import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { adminTokenValid, handle, resetRateLimit, validateEnquiry } from "./handler.mjs";
import { listEnquiries, resolveInboxEmail, storePath } from "./enquiries.mjs";

/**
 * End-to-end tests against a real HTTP server running the real handler —
 * the same code path a browser hits on dutaintegra.my.
 */

const VALID = {
  name: "Ahmad Mokhtar",
  company: "Mokhtar Trading Sdn Bhd",
  email: "Ahmad@Mokhtar-Trading.MY",
  phone: "+60 12-345 6789",
  service: "Managed IT Services",
  message: "We have 18 staff and no IT support. Can you audit our setup?",
};

let server;
let base;
let store;
let ipCounter = 0;

/** Each request gets its own client IP so the 5/min limiter doesn't bleed
 * between cases. */
function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function post(body, headers = {}) {
  const res = await fetch(`${base}/api/send-email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": nextIp(),
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

before(async () => {
  server = createServer(handle);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done) => server.close(done));
  server.closeAllConnections?.();
});

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "enquiries-"));
  store = join(dir, "enquiries.jsonl");
  process.env.ENQUIRY_STORE = store;
  process.env.CONTACT_INBOX_EMAIL = "sales@dutaintegrasolutions.com";
  delete process.env.ADMIN_EMAIL;
  delete process.env.ALLOWED_ORIGINS;
  resetRateLimit();
});

afterEach(async () => {
  if (store) await rm(store, { force: true });
});

describe("POST /api/send-email", () => {
  test("stores the enquiry and reports success", async () => {
    const res = await post(VALID);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, delivered: false }); // no mail provider configured

    const rows = await listEnquiries();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Ahmad Mokhtar");
    assert.equal(rows[0].company, "Mokhtar Trading Sdn Bhd");
    assert.equal(rows[0].service, "Managed IT Services");
    assert.equal(rows[0].ip, "198.51.100.1");
    assert.equal(rows[0].emailed_at, null);
  });

  test("lowercases and trims the email address", async () => {
    await post(VALID);
    const rows = await listEnquiries();
    assert.equal(rows[0].email, "ahmad@mokhtar-trading.my");
  });

  test("writes a real JSONL record to disk", async () => {
    await post(VALID);
    const raw = await readFile(store, "utf8");
    const line = JSON.parse(raw.trim());
    assert.equal(line.service, "Managed IT Services");
    assert.ok(line.id);
    assert.ok(line.created_at);
  });

  test("rejects a missing name with 400 and stores nothing", async () => {
    const res = await post({ ...VALID, name: "   " });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Name is required");
    assert.equal((await listEnquiries()).length, 0);
  });

  test("rejects an invalid email with 400", async () => {
    const res = await post({ ...VALID, email: "not-an-email" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "A valid email is required");
    assert.equal((await listEnquiries()).length, 0);
  });

  test("rejects a missing service with 400", async () => {
    const res = await post({ ...VALID, service: "" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Service is required");
  });

  test("rejects malformed JSON with 400", async () => {
    const res = await post("{not json");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Invalid JSON body");
  });

  test("rejects a non-object payload with 400", async () => {
    const res = await post([1, 2, 3]);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Invalid payload");
  });

  test("blocks a cross-origin POST that is not allowlisted", async () => {
    const res = await post(VALID, { origin: "https://evil.example" });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "Invalid origin");
    assert.equal((await listEnquiries()).length, 0);
  });

  test("accepts a cross-origin POST from an allowlisted origin and sends CORS headers", async () => {
    process.env.ALLOWED_ORIGINS = "https://dutaintegra.my";
    const res = await post(VALID, { origin: "https://dutaintegra.my" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "https://dutaintegra.my");
    assert.equal((await listEnquiries()).length, 1);
  });

  test("answers the CORS preflight with 204", async () => {
    process.env.ALLOWED_ORIGINS = "https://dutaintegra.my";
    const res = await fetch(`${base}/api/send-email`, {
      method: "OPTIONS",
      headers: { origin: "https://dutaintegra.my" },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
  });

  test("rate-limits repeated submissions from one IP", async () => {
    const ip = "203.0.113.7";
    const statuses = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await fetch(`${base}/api/send-email`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify(VALID),
      });
      statuses.push(res.status);
      await res.text();
    }
    assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
    assert.equal(statuses[5], 429);
    assert.equal(statuses[6], 429);
    assert.equal((await listEnquiries()).length, 5);
  });

  test("rejects GET on the endpoint", async () => {
    const res = await fetch(`${base}/api/send-email`);
    assert.equal(res.status, 405);
    await res.text();
  });
});

describe("static site and health", () => {
  test("serves the marketing homepage", async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    const html = await res.text();
    assert.match(html, /Duta Integra Solutions/);
  });

  test("serves a nested page and refuses path traversal", async () => {
    const ok = await fetch(`${base}/pricing.html`);
    assert.equal(ok.status, 200);
    await ok.text();

    const traversal = await fetch(`${base}/../../etc/passwd`);
    assert.notEqual(traversal.status, 200);
    await traversal.text();
  });

  test("404s an unknown file and unknown API route", async () => {
    const missing = await fetch(`${base}/nope.html`);
    assert.equal(missing.status, 404);
    await missing.text();

    const api = await fetch(`${base}/api/unknown`);
    assert.equal(api.status, 404);
    await api.text();
  });

  test("reports inbox configuration on /api/health", async () => {
    const withInbox = await fetch(`${base}/api/health`);
    assert.deepEqual(await withInbox.json(), { ok: true, inboxConfigured: true });

    delete process.env.CONTACT_INBOX_EMAIL;
    const without = await fetch(`${base}/api/health`);
    assert.deepEqual(await without.json(), { ok: true, inboxConfigured: false });
  });
});

describe("inbox resolution", () => {
  test("falls through a blank CONTACT_INBOX_EMAIL to ADMIN_EMAIL", () => {
    process.env.CONTACT_INBOX_EMAIL = "   ";
    process.env.ADMIN_EMAIL = "  sales@trimmed.my  ";
    assert.equal(resolveInboxEmail(), "sales@trimmed.my");
  });

  test("returns null when neither is set", () => {
    delete process.env.CONTACT_INBOX_EMAIL;
    delete process.env.ADMIN_EMAIL;
    assert.equal(resolveInboxEmail(), null);
  });
});

describe("validateEnquiry", () => {
  test("rejects oversized fields", () => {
    const res = validateEnquiry({ ...VALID, name: "x".repeat(121) });
    assert.equal(res.error, "Name is too long");
  });

  test("treats optional fields as null when absent", () => {
    const res = validateEnquiry({ name: "Siti", email: "siti@x.my", service: "Free IT Audit" });
    assert.equal(res.error, undefined);
    assert.equal(res.value.company, null);
    assert.equal(res.value.phone, null);
    assert.equal(res.value.message, null);
  });
});

describe("store location", () => {
  test("defaults to the project's data/ directory, independent of process.cwd()", () => {
    const saved = process.env.ENQUIRY_STORE;
    delete process.env.ENQUIRY_STORE;
    try {
      const resolved = storePath();
      // Absolute, and anchored to this project rather than to process.cwd().
      assert.ok(resolved.startsWith("/"), `expected an absolute path, got ${resolved}`);
      assert.ok(resolved.endsWith("data/enquiries.jsonl"), `unexpected store path ${resolved}`);
      assert.ok(
        !resolved.includes(".."),
        `store path should be fully resolved, got ${resolved}`,
      );
    } finally {
      if (saved === undefined) delete process.env.ENQUIRY_STORE;
      else process.env.ENQUIRY_STORE = saved;
    }
  });
});

describe("GET /admin/enquiries", () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "s3cret-token";
  });

  test("401s without a token", async () => {
    const res = await fetch(`${base}/admin/enquiries`);
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "Unauthorized" });
  });

  test("401s with a wrong token", async () => {
    const res = await fetch(`${base}/admin/enquiries`, { headers: { "x-admin-token": "nope" } });
    assert.equal(res.status, 401);
    await res.text();
  });

  test("returns JSON for a valid header token", async () => {
    await post(VALID);
    const res = await fetch(`${base}/admin/enquiries`, {
      headers: { "x-admin-token": "s3cret-token", accept: "application/json" },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.count, 1);
    assert.equal(data.enquiries[0].email, "ahmad@mokhtar-trading.my");
  });

  test("accepts the token as a query parameter (routes on pathname)", async () => {
    await post(VALID);
    const res = await fetch(`${base}/admin/enquiries?token=s3cret-token`, {
      headers: { accept: "application/json" },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.count, 1);
  });

  test("renders an HTML table when the browser asks for HTML, and escapes content", async () => {
    await post({ ...VALID, name: "<script>alert(1)</script>" });
    const res = await fetch(`${base}/admin/enquiries`, {
      headers: { "x-admin-token": "s3cret-token", accept: "text/html" },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
    const html = await res.text();
    assert.ok(!html.includes("<script>alert(1)</script>"), "HTML was not escaped");
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Inbound enquiries/);
  });

  test("rejects a token of the wrong length without throwing", () => {
    assert.equal(adminTokenValid(""), false);
    assert.equal(adminTokenValid(undefined), false);
    assert.equal(adminTokenValid("short"), false);
    assert.equal(adminTokenValid("s3cret-token"), true);
  });
});
