import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handle } from "./handler.mjs";
import { resetAuthRateLimit } from "./auth.mjs";

/**
 * End-to-end tests against a real HTTP server running the real handler —
 * the same code path a browser hits on dutaintegra.my. Runs against the
 * JSONL store (DATA_DIR points at a throwaway dir), never at Supabase.
 */

const VALID = {
  email: "Ahmad@Mokhtar-Trading.MY",
  password: "securePass1",
  companyName: "Mokhtar Trading Sdn Bhd",
  industry: "Managed IT Services",
};

let server;
let base;
let ipCounter = 0;

/** Each request gets its own client IP so the 5/min limiter doesn't bleed
 * between cases. */
function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
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

async function get(path, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { "x-forwarded-for": nextIp(), ...headers },
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

function sessionToken(headers) {
  const setCookie = headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("di_session="));
  return cookie?.split(";")[0]?.split("=")?.[1] ?? null;
}

async function signup(overrides = {}, headers = {}) {
  return post("/api/auth/signup", { ...VALID, ...overrides }, headers);
}

async function login(email, password, ip = nextIp()) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password }),
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
  const dir = await mkdtemp(join(tmpdir(), "dutaos-auth-"));
  process.env.DATA_DIR = dir;
  // Force the JSONL backend so tests never reach Supabase.
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("POST /api/auth/signup", () => {
  test("creates a company, mints a session, and sets a cookie", async () => {
    const res = await signup();
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.company.name, "Mokhtar Trading Sdn Bhd");
    assert.equal(res.body.company.email, "ahmad@mokhtar-trading.my");
    assert.equal(res.body.company.industry, "Managed IT Services");
    assert.equal(res.body.company.subscriptionTier, "starter");
    assert.equal(res.body.company.subscriptionStatus, "active");
    assert.ok(res.body.company.id);
    assert.ok(sessionToken(res.headers), "should set a di_session cookie");
    const setCookie = res.headers.getSetCookie?.() ?? [];
    assert.ok(setCookie.some((c) => c.includes("HttpOnly") && c.includes("SameSite=Lax")));
  });

  test("rejects missing required fields", async () => {
    const res = await signup({ companyName: "" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "email, password, and companyName are required");
  });

  test("rejects duplicate email", async () => {
    await signup();
    const res = await signup();
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "Email already registered");
  });

  test("rejects malformed JSON", async () => {
    const res = await post("/api/auth/signup", "{not json");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Invalid JSON body");
  });

  test("rejects GET on the endpoint", async () => {
    const res = await get("/api/auth/signup");
    assert.equal(res.status, 405);
  });
});

describe("POST /api/auth/login", () => {
  test("logs in with correct credentials and sets a cookie", async () => {
    await signup();
    const { status, body, headers } = await login(VALID.email, VALID.password);
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.company.email, VALID.email.toLowerCase());
    assert.ok(sessionToken(headers), "should set a di_session cookie");
  });

  test("rejects wrong password", async () => {
    await signup();
    const { status, body } = await login(VALID.email, "wrong");
    assert.equal(status, 401);
    assert.equal(body.error, "Invalid credentials");
  });

  test("rejects unknown email", async () => {
    const { status } = await login("nobody@x.my", "pass");
    assert.equal(status, 401);
  });

  test("rejects inactive account is not applicable in v1 — all companies are active", async () => {
    // v1 creates every company as active; documented for when tiers change.
    await signup();
    const { status } = await login(VALID.email, VALID.password);
    assert.equal(status, 200);
  });

  test("rejects missing fields", async () => {
    const res = await post("/api/auth/login", JSON.stringify({ email: VALID.email }), { "x-forwarded-for": nextIp() });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "email and password are required");
  });

  test("rejects GET on the endpoint", async () => {
    const res = await get("/api/auth/login");
    assert.equal(res.status, 405);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the company when authenticated", async () => {
    const { headers } = await signup();
    const token = sessionToken(headers);
    assert.ok(token);

    const res = await get("/api/auth/me", { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.company.email, VALID.email.toLowerCase());
    assert.equal(res.body.company.name, "Mokhtar Trading Sdn Bhd");
  });

  test("401s without a cookie", async () => {
    const res = await get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Not authenticated");
  });

  test("401s with an unknown session cookie", async () => {
    const res = await get("/api/auth/me", { cookie: "di_session=deadbeef" });
    assert.equal(res.status, 401);
  });

  test("rejects non-GET methods", async () => {
    const { headers } = await signup();
    const token = sessionToken(headers);
    const res = await post("/api/auth/me", {}, { cookie: `di_session=${token}` });
    assert.equal(res.status, 405);
  });
});

describe("POST /api/auth/logout", () => {
  test("clears the cookie and revokes the session", async () => {
    const { headers } = await signup();
    const token = sessionToken(headers);
    assert.ok(token);

    const res = await post("/api/auth/logout", {}, { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const cookies = res.headers.getSetCookie?.() ?? [];
    assert.ok(cookies.some((c) => c.startsWith("di_session=") && c.includes("Max-Age=0")));

    const me = await get("/api/auth/me", { cookie: `di_session=${token}` });
    assert.equal(me.status, 401);
  });

  test("answers 200 even with no session cookie", async () => {
    const res = await post("/api/auth/logout");
    assert.equal(res.status, 200);
  });

  test("rejects non-POST methods", async () => {
    const res = await get("/api/auth/logout");
    assert.equal(res.status, 405);
  });
});

describe("rate limiting", () => {
  test("blocks login after 5 attempts from one IP", async () => {
    await signup();
    const ip = nextIp();

    for (let i = 0; i < 5; i += 1) {
      const { status } = await login(VALID.email, "wrong", ip);
      assert.equal(status, 401, `attempt ${i + 1} should reach the handler`);
    }

    const blocked = await login(VALID.email, VALID.password, ip);
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get("retry-after"), "should advise when to retry");
    assert.equal(blocked.body.error, "Too many requests");
  });

  test("a correct password does not bypass the limit", async () => {
    await signup();
    const ip = nextIp();

    for (let i = 0; i < 6; i += 1) await login(VALID.email, "wrong", ip);
    const blocked = await login(VALID.email, VALID.password, ip);
    assert.equal(blocked.status, 429);
  });

  test("one IP's limit does not affect another", async () => {
    await signup();
    const noisy = nextIp();

    for (let i = 0; i < 6; i += 1) await login(VALID.email, "wrong", noisy);
    assert.equal((await login(VALID.email, "wrong", noisy)).status, 429);

    const quiet = await login(VALID.email, VALID.password, nextIp());
    assert.equal(quiet.status, 200);
  });

  test("signup shares the per-IP budget with login", async () => {
    const ip = nextIp();

    for (let i = 0; i < 5; i += 1) {
      const res = await post("/api/auth/signup", { ...VALID, email: `signup-${i}-${Date.now()}@my.com` }, { "x-forwarded-for": ip });
      assert.equal(res.status, 201, `attempt ${i + 1} should reach the handler`);
    }

    const blocked = await login(VALID.email, VALID.password, ip);
    assert.equal(blocked.status, 429);
  });
});
