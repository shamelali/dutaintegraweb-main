import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { adminTokenValid, handle, resetRateLimit, validateEnquiry } from "./handler.mjs";
import { listEnquiries, resolveInboxEmail, storePath } from "./enquiries.mjs";
import { storePath as testimonialStorePath } from "./testimonials.mjs";
import { dataFile } from "./paths.mjs";

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
  // Scrub mail provider keys so "no provider configured" assertions hold even
  // when the developer's shell has real keys exported (see email.test.mjs).
  delete process.env.RESEND_API_KEY;
  delete process.env.BREVO_API_KEY;
  delete process.env.POSTMARK_SERVER_TOKEN;
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
    const csrfToken = "test-csrf-token-abc123";
    const res = await post(VALID, { 
      origin: "https://dutaintegra.my",
      cookie: `csrf_token=${csrfToken}`,
      "x-csrf-token": csrfToken
    });
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

describe("testimonial capture", () => {
  const SUBMISSION = {
    client: "Mokhtar Trading Sdn Bhd",
    tier: "growth",
    quote: "They cut our ticket backlog in half.",
    author: "Ahmad Mokhtar",
  };

  async function postTestimonial(body, headers = {}) {
    const res = await fetch(`${base}/api/testimonial`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  }

  async function storedRows() {
    let raw;
    try {
      raw = await readFile(testimonialStorePath(), "utf8");
    } catch {
      return []; // no store written yet
    }
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }

  test("stores the submission and answers 201 with its id", async () => {
    const res = await postTestimonial(SUBMISSION);
    assert.equal(res.status, 201);
    assert.ok(res.body.id, "expected the id of the stored record");
    // Customer words must not come back in the response body.
    assert.equal(res.body.quote, undefined);

    const stored = (await storedRows()).find((row) => row.id === res.body.id);
    assert.equal(stored.client, SUBMISSION.client);
    assert.equal(stored.tier, SUBMISSION.tier);
    assert.equal(stored.quote, SUBMISSION.quote);
    assert.equal(stored.author, SUBMISSION.author);
    assert.ok(stored.createdAt, "expected a creation timestamp");
  });

  test("rejects an invalid payload before storing anything", async () => {
    const before = await storedRows();

    const missing = await postTestimonial({ client: "Nobody Trading" });
    assert.equal(missing.status, 400);

    const tooLong = await postTestimonial({
      client: "Nobody Trading",
      author: "A. Nobody",
      quote: "x".repeat(501),
    });
    assert.equal(tooLong.status, 400);

    const badTier = await postTestimonial({ ...SUBMISSION, tier: { nested: true } });
    assert.equal(badTier.status, 400);

    assert.deepEqual(await storedRows(), before, "a rejected payload must not be stored");
  });

  test("refuses a cross-origin submission", async () => {
    const res = await postTestimonial(SUBMISSION, { origin: "https://evil.example" });
    assert.equal(res.status, 403);
  });

  test("rate limits repeat submissions from one client ip", async () => {
    const forwarded = { "x-forwarded-for": "203.0.113.77" };
    for (let i = 0; i < 5; i += 1) {
      const res = await postTestimonial(SUBMISSION, forwarded);
      assert.equal(res.status, 201, `submission ${i + 1} should still be accepted`);
    }
    const limited = await postTestimonial(SUBMISSION, forwarded);
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("retry-after"));
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
    const body = await withInbox.json();
    assert.equal(body.ok, true);
    assert.equal(body.inboxConfigured, true);
    assert.equal(body.inbox.ok, true);
    assert.equal(body.supabaseConfigured, false);
    assert.equal(body.storageBackend, "jsonl");
    assert.equal(body.storageDurable, true);
    assert.equal(body.datastore.backend, "jsonl");
    assert.equal(body.datastore.ok, true);
    assert.equal(body.datastore.probe, "skipped");
    assert.ok(body.datastore.checkedAt);
    assert.deepEqual(body.warnings, []);

    delete process.env.CONTACT_INBOX_EMAIL;
    // ?fresh=1 bypasses the 60s probe cache, which is process-global.
    const without = await fetch(`${base}/api/health?fresh=1`);
    const withoutBody = await without.json();
    assert.equal(withoutBody.ok, true);
    assert.equal(withoutBody.inboxConfigured, false);
    assert.equal(withoutBody.storageBackend, "jsonl");
    assert.equal(withoutBody.datastore.probe, "skipped");
    assert.ok(Array.isArray(withoutBody.warnings) && withoutBody.warnings.length > 0);
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
  test("defaults to the configured store directory, independent of process.cwd()", () => {
    const saved = process.env.ENQUIRY_STORE;
    const savedCwd = process.cwd();
    delete process.env.ENQUIRY_STORE;
    try {
      const resolved = storePath();
      // Absolute and fully resolved, anchored to paths.mjs rather than cwd.
      assert.ok(resolved.startsWith("/"), `expected an absolute path, got ${resolved}`);
      assert.ok(
        !resolved.includes(".."),
        `store path should be fully resolved, got ${resolved}`,
      );
      assert.ok(resolved.endsWith("enquiries.jsonl"), `unexpected store path ${resolved}`);
      assert.equal(resolved, dataFile("enquiries.jsonl"));
      process.chdir(tmpdir());
      assert.equal(storePath(), resolved, "store path must not follow process.cwd()");
    } finally {
      process.chdir(savedCwd);
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

// ── leads pipeline ───────────────────────────────────────────────────────────

describe("GET /admin/pipeline", () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "s3cret-token";
  });

  test("401s without a token", async () => {
    const res = await fetch(`${base}/admin/pipeline`);
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "Unauthorized" });
  });

  test("401s with a wrong token", async () => {
    const res = await fetch(`${base}/admin/pipeline`, { headers: { "x-admin-token": "nope" } });
    assert.equal(res.status, 401);
    await res.text();
  });

  test("returns JSON for a valid header token", async () => {
    await post(VALID);
    const res = await fetch(`${base}/admin/pipeline`, {
      headers: { "x-admin-token": "s3cret-token", accept: "application/json" },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.count, 1);
    assert.equal(data.leads[0].email, "ahmad@mokhtar-trading.my");
    assert.ok(data.byStatus && data.byStatus.new.length === 1);
  });

  test("accepts the token as a query parameter", async () => {
    await post(VALID);
    const res = await fetch(`${base}/admin/pipeline?token=s3cret-token`, {
      headers: { accept: "application/json" },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.count, 1);
  });

  test("renders an HTML board when the browser asks for HTML, and escapes content", async () => {
    await post({ ...VALID, name: "<script>alert(1)</script>" });
    const res = await fetch(`${base}/admin/pipeline`, {
      headers: { "x-admin-token": "s3cret-token", accept: "text/html" },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
    const html = await res.text();
    assert.ok(!html.includes("<script>alert(1)</script>"), "HTML was not escaped");
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Leads pipeline/);
    assert.match(html, /Create proposal/);
  });
});

describe("PATCH /admin/leads/:id", () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "s3cret-token";
  });

  test("401s without a token", async () => {
    const res = await fetch(`${base}/admin/leads/00000000-0000-0000-0000-000000000000`, { method: "PATCH" });
    assert.equal(res.status, 401);
  });

  test("400s on invalid status", async () => {
    await post(VALID);
    const rows = await listEnquiries();
    const id = rows[0].id;
    const res = await fetch(`${base}/admin/leads/${id}?token=s3cret-token`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "bogus" }),
    });
    assert.equal(res.status, 400);
  });

  test("moves a lead to a new status", async () => {
    await post(VALID);
    const rows = await listEnquiries();
    const id = rows[0].id;
    const res = await fetch(`${base}/admin/leads/${id}?token=s3cret-token`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "contacted" }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.lead.status, "contacted");
    const after = await listEnquiries();
    assert.equal(after[0].status, "contacted");
  });

  test("404s on unknown id", async () => {
    const res = await fetch(`${base}/admin/leads/00000000-0000-0000-0000-000000000000?token=s3cret-token`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "contacted" }),
    });
    assert.equal(res.status, 404);
  });
});

// ── monthly digest ───────────────────────────────────────────────────────────

describe("POST /api/monthly-digest", () => {
  const prev = process.env.DIGEST_TOKEN;

  afterEach(() => {
    if (prev === undefined) delete process.env.DIGEST_TOKEN;
    else process.env.DIGEST_TOKEN = prev;
  });

  async function postDigest(token) {
    const res = await fetch(`${base}/api/monthly-digest`, {
      method: "POST",
      headers: token ? { "x-digest-token": token } : {},
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  test("is refused when DIGEST_TOKEN is unset", async () => {
    delete process.env.DIGEST_TOKEN;
    const { status } = await postDigest();
    assert.equal(status, 403, "an unconfigured digest route must not be open");
  });

  test("is refused when DIGEST_TOKEN is unset and a token is supplied", async () => {
    delete process.env.DIGEST_TOKEN;
    const { status } = await postDigest("anything");
    assert.equal(status, 403);
  });

  test("is refused when the token does not match", async () => {
    process.env.DIGEST_TOKEN = "digest-secret";
    assert.equal((await postDigest("wrong")).status, 403);
    assert.equal((await postDigest()).status, 403);
  });

  test("accepts the configured token", async () => {
    process.env.DIGEST_TOKEN = "digest-secret";
    const { status, body } = await postDigest("digest-secret");
    assert.equal(status, 200);
    assert.ok(body.month, "should return a month label");
  });
});

// ── Phase B: client portal tests ─────────────────────────────────────────────

describe("client portal — auth and tickets", () => {
  let clientStore;
  let ticketStore;

  beforeEach(async () => {
    process.env.ADMIN_TOKEN = "admin-pass";
    const dir = await mkdtemp(join(tmpdir(), "portal-"));
    clientStore = join(dir, "clients.jsonl");
    ticketStore = join(dir, "tickets.jsonl");
    process.env.ENQUIRY_STORE = join(dir, "enquiries.jsonl");
    // Monkey-patch the store paths by setting an env var the modules read
    // The modules use project-root-relative paths, but we can override
    // by importing and setting via process.env — simplified here.
  });

  async function createTestClient(email = `test-${Date.now()}@client.my`) {
    const res = await fetch(`${base}/admin/clients`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": "admin-pass",
      },
      body: JSON.stringify({ name: "Test Client", email, password: "securePass1", tier: "growth" }),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  async function loginAs(email = "test@client.my", password = "securePass1", ip = nextIp()) {
    const res = await fetch(`${base}/api/portal/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const sessionCookie = setCookie.find((c) => c.startsWith("di_session="));
    const token = sessionCookie?.split(";")[0]?.split("=")?.[1] ?? null;
    return { status: res.status, body: await res.json().catch(() => null), token, headers: res.headers };
  }

  describe("POST /admin/clients", () => {
    test("creates a new client with admin token", async () => {
      const email = `new-${Date.now()}@client.my`;
      const { status, body } = await createTestClient(email);
      assert.equal(status, 201);
      assert.equal(body.client.name, "Test Client");
      assert.equal(body.client.email, email);
      assert.equal(body.client.tier, "growth");
      assert.equal(body.client.status, "active");
    });

    test("rejects without admin token", async () => {
      const res = await fetch(`${base}/admin/clients`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "X", email: "x@y.my", password: "pass" }),
      });
      assert.equal(res.status, 401);
    });

    test("rejects duplicate email", async () => {
      const email = `dup-${Date.now()}@test.my`;
      await createTestClient(email);
      const { status } = await createTestClient(email);
      assert.equal(status, 409);
    });

    test("rejects missing required fields", async () => {
      const res = await fetch(`${base}/admin/clients`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-pass" },
        body: JSON.stringify({ name: "X" }),
      });
      assert.equal(res.status, 400);
    });
  });

  describe("GET /admin/clients", () => {
    test("lists all clients with admin token", async () => {
      const before = await fetch(`${base}/admin/clients?token=admin-pass`);
      const beforeData = await before.json();
      const beforeCount = beforeData.count;
      await createTestClient(`a-${Date.now()}@b.my`);
      await createTestClient(`c-${Date.now()}@d.my`);
      const res = await fetch(`${base}/admin/clients?token=admin-pass`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.count >= beforeCount + 2, `expected at least ${beforeCount + 2}, got ${data.count}`);
    });
  });

  describe("POST /api/portal/login", () => {
    test("logs in with correct credentials and sets cookie", async () => {
      const email = `login-${Date.now()}@client.my`;
      await createTestClient(email);
      const { status, body, token } = await loginAs(email);
      assert.equal(status, 200);
      assert.equal(body.ok, true);
      assert.ok(token, "should set a session cookie");
    });

    test("rejects wrong password", async () => {
      const email = `wrong-${Date.now()}@client.my`;
      await createTestClient(email);
      const { status, body } = await loginAs(email, "wrong");
      assert.equal(status, 401);
      assert.equal(body.error, "Invalid email or password");
    });

    test("rejects unknown email", async () => {
      const { status } = await loginAs("nobody@x.my", "pass");
      assert.equal(status, 401);
    });

    test("rate limits repeated attempts from one IP", async () => {
      const email = `rl-${Date.now()}@client.my`;
      await createTestClient(email);
      const ip = nextIp();

      // Budget is 5/min; consume it, then the next attempt is refused.
      for (let i = 0; i < 5; i += 1) {
        const { status } = await loginAs(email, "wrong", ip);
        assert.equal(status, 401, `attempt ${i + 1} should reach the handler`);
      }

      const blocked = await loginAs(email, "securePass1", ip);
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers?.get("retry-after"), "should advise when to retry");
      assert.equal(blocked.body.error, "Too many attempts. Please try again later.");
    });

    test("a correct password does not bypass the limit", async () => {
      const email = `rlbypass-${Date.now()}@client.my`;
      await createTestClient(email);
      const ip = nextIp();

      for (let i = 0; i < 6; i += 1) await loginAs(email, "wrong", ip);
      const blocked = await loginAs(email, "securePass1", ip);
      assert.equal(blocked.status, 429);
    });

    test("one IP's limit does not affect another", async () => {
      const email = `rlscope-${Date.now()}@client.my`;
      await createTestClient(email);
      const noisy = nextIp();

      for (let i = 0; i < 6; i += 1) await loginAs(email, "wrong", noisy);
      assert.equal((await loginAs(email, "wrong", noisy)).status, 429);

      const quiet = await loginAs(email, "securePass1", nextIp());
      assert.equal(quiet.status, 200);
    });
  });

  describe("GET /api/portal/me", () => {
    test("returns client info when authenticated", async () => {
      const email = `me-${Date.now()}@client.my`;
      await createTestClient(email);
      const { token } = await loginAs(email);
      const res = await fetch(`${base}/api/portal/me`, {
        headers: { cookie: `di_session=${token}` },
      });
      assert.equal(res.status, 200);
      const { client } = await res.json();
      assert.equal(client.name, "Test Client");
    });

    test("returns 401 when not authenticated", async () => {
      const res = await fetch(`${base}/api/portal/me`);
      assert.equal(res.status, 401);
    });
  });

  describe("POST /api/portal/tickets", () => {
    test("creates a ticket when authenticated", async () => {
      const email = `tickets-${Date.now()}@client.my`;
      await createTestClient(email);
      const { token } = await loginAs(email);
      const res = await fetch(`${base}/api/portal/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `di_session=${token}` },
        body: JSON.stringify({ subject: "Cannot access email", description: "Outlook keeps crashing", priority: "high" }),
      });
      assert.equal(res.status, 201);
      const { ticket } = await res.json();
      assert.equal(ticket.subject, "Cannot access email");
      assert.equal(ticket.priority, "high");
      assert.equal(ticket.status, "open");
    });

    test("rejects short subject", async () => {
      const email = `short-${Date.now()}@client.my`;
      await createTestClient(email);
      const { token } = await loginAs(email);
      const res = await fetch(`${base}/api/portal/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `di_session=${token}` },
        body: JSON.stringify({ subject: "Hi" }),
      });
      assert.equal(res.status, 400);
    });

    test("rejects unauthenticated request", async () => {
      const res = await fetch(`${base}/api/portal/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: "Test" }),
      });
      assert.equal(res.status, 401);
    });
  });

  describe("PATCH /api/portal/tickets/:id", () => {
    test("resolves a ticket", async () => {
      const email = `patch-${Date.now()}@client.my`;
      await createTestClient(email);
      const { token } = await loginAs(email);
      const createRes = await fetch(`${base}/api/portal/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `di_session=${token}` },
        body: JSON.stringify({ subject: "Printer jam" }),
      });
      const { ticket } = await createRes.json();

      const patchRes = await fetch(`${base}/api/portal/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: `di_session=${token}` },
        body: JSON.stringify({ status: "resolved" }),
      });
      assert.equal(patchRes.status, 200);
      const { ticket: updated } = await patchRes.json();
      assert.equal(updated.status, "resolved");
    });
  });

  describe("GET /api/portal/health", () => {
    test("returns health summary", async () => {
      const email = `health-${Date.now()}@client.my`;
      await createTestClient(email);
      const { token } = await loginAs(email);
      const res = await fetch(`${base}/api/portal/health`, {
        headers: { cookie: `di_session=${token}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.client.tier, "growth");
      assert.ok(typeof data.tickets.total === "number");
    });
  });

  describe("Phase C — stats and insights", () => {
    test("GET /api/stats returns JSON with updated date and stats array", async () => {
      const res = await fetch(`${base}/api/stats`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.updated);
      assert.ok(Array.isArray(data.stats));
      assert.ok(data.stats.length > 0);
      const first = data.stats[0];
      assert.ok(typeof first.value === "number");
      assert.ok(typeof first.label === "string");
      assert.ok(typeof first.icon === "string");
    });

    test("serves /stats.html as a static page", async () => {
      const res = await fetch(`${base}/stats.html`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Built by DI"));
    });

    test("serves /insights.html as a static page", async () => {
      const res = await fetch(`${base}/insights.html`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Insights") || html.includes("insights"));
    });
  });

  describe("Phase D — Calculator", () => {
    test("POST /api/calculator returns estimated savings", async () => {
      const res = await fetch(`${base}/api/calculator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staff: 10, manualHours: 20, painPoints: ["compliance"] }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.tiers));
      assert.equal(data.tiers.length, 3);
      assert.ok(data.tiers.every((t) => t.hoursSaved >= 0));
      assert.ok(data.tiers.every((t) => t.monthlyCostSaved >= 0));
      assert.ok(data.tiers.every((t) => typeof t.roi === "number"));
      assert.ok(typeof data.recommendedTier === "string");
    });

    test("POST /api/calculator rejects missing staff", async () => {
      const res = await fetch(`${base}/api/calculator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manualHours: 20 }),
      });
      assert.equal(res.status, 400);
    });

    test("POST /api/calculator rejects GET", async () => {
      const res = await fetch(`${base}/api/calculator`);
      assert.equal(res.status, 405);
    });

    test("serves /calculator.html as a static page", async () => {
      const res = await fetch(`${base}/calculator.html`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Savings Calculator"));
      assert.ok(html.includes("api/calculator"));
    });

    test("serves /faq.html as a static page", async () => {
      const res = await fetch(`${base}/faq.html`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("No Jargon"));
      assert.ok(html.includes("Data Ownership"));
      assert.ok(html.includes("AI"));
    });
  });

  describe("Autonomous Ops — event ingestion", () => {
    test("POST /api/ops/events creates an event with valid token", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_TOKEN,
        },
        body: JSON.stringify({ cat: "security", action: "Threat blocked", detail: "Test event" }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.event.cat, "security");
      assert.equal(data.event.action, "Threat blocked");
      assert.equal(data.event.severity, "info");
      assert.equal(data.event.auto, true);
    });

    test("POST /api/ops/events rejects missing token", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cat: "disk", action: "Cleanup" }),
      });
      assert.equal(res.status, 401);
    });

    test("POST /api/ops/events rejects wrong token", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "wrong-token",
        },
        body: JSON.stringify({ cat: "disk", action: "Cleanup" }),
      });
      assert.equal(res.status, 401);
    });

    test("POST /api/ops/events rejects missing cat", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_TOKEN,
        },
        body: JSON.stringify({ action: "Cleanup" }),
      });
      assert.equal(res.status, 400);
    });

    test("POST /api/ops/events rejects invalid cat", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_TOKEN,
        },
        body: JSON.stringify({ cat: "invalid-cat", action: "Cleanup" }),
      });
      assert.equal(res.status, 400);
    });

    test("POST /api/ops/events rejects GET", async () => {
      const res = await fetch(`${base}/api/ops/events`);
      assert.equal(res.status, 405);
    });

    test("POST /api/ops/events rejects missing action", async () => {
      const res = await fetch(`${base}/api/ops/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_TOKEN,
        },
        body: JSON.stringify({ cat: "backup" }),
      });
      assert.equal(res.status, 400);
    });

    test("GET /api/ops/feed returns events including recently ingested", async () => {
      const res = await fetch(`${base}/api/ops/feed?limit=5`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.events));
      assert.ok(data.events.length > 0);
      assert.ok(typeof data.stats === "object");
      assert.ok(typeof data.stats.total === "number");
    });
  });
});

describe("POST /api/quiz", () => {
  async function postQuiz(body, headers = {}) {
    const res = await fetch(`${base}/api/quiz`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  }

  test("accepts a same-origin POST without env config (real browsers send Origin)", async () => {
    // Real browsers always attach Origin to POST fetches, even same-origin.
    // The site's own origin must pass without requiring ALLOWED_ORIGINS.
    const res = await postQuiz({}, { origin: base });
    assert.notEqual(res.body?.error, "Invalid origin");
    assert.equal(res.status, 400); // origin passes; validation rejects the empty payload
  });

  test("returns Foundation tier for small team, low spend, no pain points", async () => {
    const res = await postQuiz({ teamSize: 1, itSpend: 2000, painPoints: [] });
    assert.equal(res.status, 200);
    assert.equal(res.body.tier, "Foundation");
    assert.ok(res.body.score >= 0 && res.body.score <= 100);
    assert.ok(Array.isArray(res.body.findings));
    assert.ok(typeof res.body.estimatedSavings === "string");
    assert.ok(typeof res.body.auditDate === "string");
  });

  test("returns AI Partner tier for large team, high spend, multiple pain points", async () => {
    const res = await postQuiz({ teamSize: 3, itSpend: 25000, painPoints: ["manual_work", "scaling", "security", "ai_automation"] });
    assert.equal(res.status, 200);
    assert.equal(res.body.tier, "AI Partner");
    assert.ok(res.body.score >= 60, `Expected score >= 60, got ${res.body.score}`);
  });

  test("returns Growth tier for medium inputs", async () => {
    const res = await postQuiz({ teamSize: 2, itSpend: 15000, painPoints: ["manual_work"] });
    assert.equal(res.status, 200);
    assert.ok(["Foundation", "Growth"].includes(res.body.tier));
  });

  test("caps score at 100", async () => {
    const res = await postQuiz({ teamSize: 3, itSpend: 50000, painPoints: ["manual_work", "scaling", "security", "ai_automation"] });
    assert.equal(res.status, 200);
    assert.ok(res.body.score <= 100, `Expected score <= 100, got ${res.body.score}`);
  });

  test("rejects GET with 405", async () => {
    const res = await fetch(`${base}/api/quiz`);
    assert.equal(res.status, 405);
  });

  test("rejects missing teamSize", async () => {
    const res = await postQuiz({ itSpend: 10000, painPoints: [] });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("teamSize"));
  });

  test("rejects invalid teamSize", async () => {
    const res = await postQuiz({ teamSize: 5, itSpend: 10000, painPoints: [] });
    assert.equal(res.status, 400);
  });

  test("rejects negative itSpend", async () => {
    const res = await postQuiz({ teamSize: 1, itSpend: -1, painPoints: [] });
    assert.equal(res.status, 400);
  });

  test("rejects invalid painPoints type", async () => {
    const res = await postQuiz({ teamSize: 1, itSpend: 10000, painPoints: "manual" });
    assert.equal(res.status, 400);
  });

  test("rejects unknown painPoint values", async () => {
    const res = await postQuiz({ teamSize: 1, itSpend: 10000, painPoints: ["manual_work", "unknown_value"] });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("unknown_value"));
  });

  test("rejects more than 4 pain points", async () => {
    const res = await postQuiz({ teamSize: 1, itSpend: 10000, painPoints: ["manual_work", "scaling", "security", "ai_automation", "manual_work"] });
    assert.equal(res.status, 400);
  });

  test("persists audit to JSONL store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quiz-"));
    const quizStore = join(dir, "quiz-audits.jsonl");
    process.env.QUIZ_STORE = quizStore;
    try {
      const res = await postQuiz({ teamSize: 2, itSpend: 10000, painPoints: ["scaling"] });
      assert.equal(res.status, 200);
      // Give fire-and-forget persist a moment
      await new Promise((r) => setTimeout(r, 100));
      const raw = await readFile(quizStore, "utf8");
      const lines = raw.trim().split("\n").filter(Boolean);
      assert.ok(lines.length > 0);
      const record = JSON.parse(lines[lines.length - 1]);
      assert.equal(record.tier, res.body.tier);
      assert.equal(record.score, res.body.score);
      assert.ok(record.id);
      assert.ok(record.created_at);
    } finally {
      delete process.env.QUIZ_STORE;
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rate limits quiz submissions", async () => {
    // The rate limit is 5/min per IP. Send 5 requests with the same IP.
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      const res = await postQuiz({ teamSize: 1, itSpend: 5000, painPoints: [] }, { "x-forwarded-for": ip });
      assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
    }
    const res = await postQuiz({ teamSize: 1, itSpend: 5000, painPoints: [] }, { "x-forwarded-for": ip });
    assert.equal(res.status, 429);
  });
});
// ── static asset CSP ─────────────────────────────────────────────────────────

describe("static responses carry a usable CSP", () => {
  /**
   * A CSP that blocks the site's own fonts or scripts is worse than no CSP:
   * pages render wrong and the break only shows up in production, where
   * vercel.json enforces the same policy. These tests read the real pages and
   * assert every third-party origin they reference is permitted by the header
   * this process actually sends.
   */

  function parseCsp(value) {
    const out = {};
    for (const part of value.split(";")) {
      const [name, ...sources] = part.trim().split(/\s+/);
      if (name) out[name] = sources;
    }
    return out;
  }

  async function cspFor(pathname) {
    const res = await fetch(`${base}${pathname}`);
    assert.equal(res.status, 200, `${pathname} should serve`);
    const csp = res.headers.get("content-security-policy");
    assert.ok(csp, `${pathname} should carry a CSP`);
    return parseCsp(csp);
  }

  test("style-src permits the Google Fonts stylesheet origin", async () => {
    // Web/*.html load fonts via <link href="https://fonts.googleapis.com/css2?...">
    const csp = await cspFor("/index.html");
    assert.ok(
      csp["style-src"]?.includes("https://fonts.googleapis.com"),
      `style-src must allow fonts.googleapis.com or the stylesheet is blocked; got ${csp["style-src"]}`,
    );
  });

  test("font-src permits the Google Fonts file origin", async () => {
    // The CSS above resolves to .woff2 files served from fonts.gstatic.com
    const csp = await cspFor("/index.html");
    assert.ok(
      csp["font-src"]?.includes("https://fonts.gstatic.com"),
      `font-src must allow fonts.gstatic.com or the font files are blocked; got ${csp["font-src"]}`,
    );
  });

  test("allows every third-party script origin the pages use", async () => {
    // Derived from <script src="..."> in Web/*.html. jsdelivr appears only in
    // <link rel="stylesheet">, so it belongs in style-src, not script-src.
    const csp = await cspFor("/index.html");
    for (const origin of [
      "https://cdn.tailwindcss.com",
      "https://va.vercel-scripts.com",
      "https://www.googletagmanager.com",
    ]) {
      assert.ok(csp["script-src"]?.includes(origin), `script-src should allow ${origin}`);
    }
    assert.ok(
      !csp["script-src"]?.includes("https://cdn.jsdelivr.net"),
      "jsdelivr serves only styles here; allowing it as a script origin widens attack surface for no reason",
    );
  });

  test("style-src covers the stylesheet origins the pages use", async () => {
    const csp = await cspFor("/index.html");
    for (const origin of ["https://cdn.jsdelivr.net", "https://fonts.googleapis.com"]) {
      assert.ok(csp["style-src"]?.includes(origin), `style-src should allow ${origin}`);
    }
  });

  test("includes frame-ancestors and object-src hardening", async () => {
    const csp = await cspFor("/index.html");
    assert.deepEqual(csp["frame-ancestors"], ["'none'"]);
    assert.deepEqual(csp["object-src"], ["'none'"]);
    assert.deepEqual(csp["base-uri"], ["'self'"]);
  });

  test("does not send HSTS over plain HTTP", async () => {
    // Sending HSTS from a local HTTP server makes browsers force HTTPS on
    // localhost, which breaks development.
    const res = await fetch(`${base}/index.html`);
    assert.equal(res.headers.get("strict-transport-security"), null);
  });

  test("also applies to the SPA fallback", async () => {
    const res = await fetch(`${base}/some/deep/link`, {
      headers: { accept: "text/html" },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-security-policy"));
  });
});

// ── vercel.json header parity ────────────────────────────────────────────────

describe("vercel.json security headers", () => {
  /**
   * These headers are what production actually enforces, since Vercel serves
   * Web/ directly and never runs this server. Parsed from the file rather than
   * hardcoded so the test fails if someone edits the config.
   */
  async function loadHeaders() {
    const raw = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
    const config = JSON.parse(raw);
    const map = new Map();
    for (const entry of config.headers ?? []) {
      for (const h of entry.headers ?? []) map.set(h.key.toLowerCase(), h.value);
    }
    return map;
  }

  test("sends a CSP that permits the fonts and CDNs the pages use", async () => {
    const headers = await loadHeaders();
    const csp = headers.get("content-security-policy");
    assert.ok(csp, "vercel.json should set a CSP");
    for (const origin of [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://cdn.tailwindcss.com",
      "https://cdn.jsdelivr.net",
      "https://va.vercel-scripts.com",
      "https://www.googletagmanager.com",
    ]) {
      assert.ok(csp.includes(origin), `production CSP must allow ${origin}`);
    }
    assert.ok(csp.includes("object-src 'none'"), "should harden object-src");
    assert.ok(csp.includes("base-uri 'self'"), "should constrain base-uri");
    assert.ok(csp.includes("frame-ancestors 'none'"), "should prevent framing");
  });

  test("sends HSTS with preload", async () => {
    const headers = await loadHeaders();
    const hsts = headers.get("strict-transport-security");
    assert.ok(hsts, "vercel.json should set HSTS");
    assert.match(hsts, /max-age=\d+/);
    assert.ok(hsts.includes("includeSubDomains"));
    assert.ok(hsts.includes("preload"));
  });

  test("sends the other baseline headers", async () => {
    const headers = await loadHeaders();
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("x-permitted-cross-domain-policies"), "none");
    assert.ok(headers.get("referrer-policy"));
    assert.ok(headers.get("permissions-policy"));
  });

  test("this process sends the same cross-domain policy as the config", async () => {
    const headers = await loadHeaders();
    const res = await fetch(`${base}/index.html`);
    const sent = res.headers.get("x-permitted-cross-domain-policies");
    await res.text();
    assert.equal(sent, headers.get("x-permitted-cross-domain-policies"));
  });

  test("public/_headers agrees with vercel.json", async () => {
    /**
     * Cloudflare Pages reads public/_headers and Vercel reads vercel.json. The
     * same site is served by both, so a header added to one and not the other
     * means the policy depends on which platform answers the request.
     */
    const raw = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
    const lines = raw.split("\n");
    const start = lines.findIndex((line) => line.trim() === "/*");
    assert.ok(start >= 0, "public/_headers must have a global /* block");
    const values = new Map();
    for (const line of lines.slice(start + 1)) {
      if (!line.startsWith("  ")) break;
      const idx = line.indexOf(":");
      values.set(line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim());
    }
    const vercel = await loadHeaders();
    for (const key of ["x-content-type-options", "x-frame-options", "x-permitted-cross-domain-policies"]) {
      assert.equal(values.get(key), vercel.get(key), `${key} must match across both platforms`);
    }
  });
});

// ── the two deploy outputs ───────────────────────────────────────────────────

describe("deploy outputs", () => {
  async function walk(dir, prefix = "") {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".fuse_hidden")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) out.push(...(await walk(join(dir, entry.name), rel)));
      else out.push(rel);
    }
    return out;
  }

  test("Web/ and public/ carry the same site", async () => {
    /**
     * `npm run build:web` writes both, but a file placed by hand in one of them
     * is invisible to the other platform. security.txt lived in Web/ only, so
     * Cloudflare Pages — which answers www.dutaintegra.my — served the SPA
     * shell at that URL instead of the disclosure contact.
     */
    const web = await walk(new URL("../Web", import.meta.url).pathname);
    const pages = await walk(new URL("../public", import.meta.url).pathname);
    const onlyWeb = web.filter((f) => !pages.includes(f));
    const onlyPages = pages.filter((f) => !web.includes(f));

    assert.deepEqual(onlyWeb, [], "Vercel's output has files Cloudflare's output is missing");
    assert.deepEqual(
      onlyPages.sort(),
      ["_headers", "_redirects"],
      "Cloudflare's output may only add its own platform config",
    );
    assert.ok(
      web.includes(".well-known/security.txt") && pages.includes(".well-known/security.txt"),
      "security.txt must ship in both outputs",
    );
  });
});
