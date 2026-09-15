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

  async function loginAs(email = "test@client.my", password = "securePass1") {
    const res = await fetch(`${base}/api/portal/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const sessionCookie = setCookie.find((c) => c.startsWith("di_session="));
    const token = sessionCookie?.split(";")[0]?.split("=")?.[1] ?? null;
    return { status: res.status, body: await res.json().catch(() => null), token };
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
