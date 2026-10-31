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

async function patch(path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": nextIp(),
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

function sessionToken(headers) {
  const setCookie = headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("dutaos_session="));
  return cookie?.split(";")[0]?.split("=")?.[1] ?? null;
}

async function signup(overrides = {}, headers = {}) {
  return post("/api/auth/signup", { ...VALID, ...overrides }, headers);
}

async function authenticatedCompany(overrides = {}) {
  const { headers } = await signup(overrides);
  const token = sessionToken(headers);
  assert.ok(token, "signup should set a dutaos_session cookie");
  return { token, email: VALID.email.toLowerCase() };
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
  const dir = await mkdtemp(join(tmpdir(), "dutaos-companies-"));
  process.env.DATA_DIR = dir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("GET /api/companies", () => {
  test("returns the authenticated company's profile", async () => {
    const { token } = await authenticatedCompany();
    const res = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.company.name, VALID.companyName);
    assert.equal(res.body.company.email, VALID.email.toLowerCase());
    assert.equal(res.body.company.industry, VALID.industry);
    assert.equal(res.body.company.subscriptionTier, "starter");
    assert.equal(res.body.company.subscriptionStatus, "active");
    assert.ok(res.body.company.id);
  });

  test("401s without a session cookie", async () => {
    const res = await get("/api/companies");
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Not authenticated");
  });

  test("405s for PATCH on the collection endpoint", async () => {
    const { token } = await authenticatedCompany();
    const res = await patch("/api/companies", { name: "X" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 405);
  });
});

describe("PATCH /api/companies/:id", () => {
  test("updates the company's profile fields", async () => {
    const { token } = await authenticatedCompany();
    const { body: me } = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    const id = me.company.id;

    const res = await patch(`/api/companies/${id}`, {
      name: "Updated Trading Sdn Bhd",
      ssmNumber: "123456789",
      phone: "+60123456789",
    }, { cookie: `dutaos_session=${token}` });

    assert.equal(res.status, 200);
    assert.equal(res.body.company.name, "Updated Trading Sdn Bhd");
    assert.equal(res.body.company.ssmNumber, "123456789");
    assert.equal(res.body.company.phone, "+60123456789");
    assert.equal(res.body.company.email, VALID.email.toLowerCase());
    assert.ok(res.body.company.updatedAt);
  });

  test("maps camelCase input to snake_case storage", async () => {
    const { token } = await authenticatedCompany();
    const { body: me } = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    const id = me.company.id;

    await patch(`/api/companies/${id}`, { ssmNumber: "SSM-999" }, { cookie: `dutaos_session=${token}` });
    const res = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    assert.equal(res.body.company.ssmNumber, "SSM-999");
  });

  test("ignores non-updatable fields such as subscription tier", async () => {
    const { token } = await authenticatedCompany();
    const { body: me } = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    const id = me.company.id;

    await patch(`/api/companies/${id}`, { subscriptionTier: "enterprise", name: "Renamed" }, { cookie: `dutaos_session=${token}` });
    const res = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    assert.equal(res.body.company.name, "Renamed");
    assert.equal(res.body.company.subscriptionTier, "starter");
  });

  test("401s without a session cookie", async () => {
    const res = await patch("/api/companies/00000000-0000-0000-0000-000000000000", { name: "X" });
    assert.equal(res.status, 401);
  });

  test("404s when the id does not match the session's company", async () => {
    const { token: tokenA } = await authenticatedCompany({ companyName: "Company A Sdn Bhd", email: "a@co-a.my" });
    const { token: tokenB } = await authenticatedCompany({ companyName: "Company B Sdn Bhd", email: "b@co-b.my" });
    const { body: me } = await get("/api/companies", { cookie: `dutaos_session=${tokenA}` });

    // Company B tries to PATCH company A's record — 404 to avoid leaking
    // that company A's record exists.
    const res = await patch(`/api/companies/${me.company.id}`, { name: "Hacked" }, { cookie: `dutaos_session=${tokenB}` });
    assert.equal(res.status, 404);
  });

  test("404s for an unknown id", async () => {
    const { token } = await authenticatedCompany();
    const res = await patch(
      "/api/companies/00000000-0000-0000-0000-000000000000",
      { name: "X" },
      { cookie: `dutaos_session=${token}` },
    );
    assert.equal(res.status, 404);
  });

  test("405s for GET on the item endpoint", async () => {
    const { token } = await authenticatedCompany();
    const { body: me } = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    const res = await get(`/api/companies/${me.company.id}`, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 405);
  });
});

describe("company scoping", () => {
  test("a company cannot read another company's profile via the item endpoint", async () => {
    const { token: tokenA } = await authenticatedCompany({ companyName: "Company A Sdn Bhd", email: "a@co-a.my" });
    const { token: tokenB } = await authenticatedCompany({ companyName: "Company B Sdn Bhd", email: "b@co-b.my" });
    const { body: meA } = await get("/api/companies", { cookie: `dutaos_session=${tokenA}` });

    // Company B tries to PATCH company A's record — 404 to avoid leaking
    // that company A's record exists.
    const res = await patch(`/api/companies/${meA.company.id}`, { name: "Hacked" }, { cookie: `dutaos_session=${tokenB}` });
    assert.equal(res.status, 404);

    // Company A's record is unchanged.
    const check = await get("/api/companies", { cookie: `dutaos_session=${tokenA}` });
    assert.equal(check.body.company.name, "Company A Sdn Bhd");
  });
});
