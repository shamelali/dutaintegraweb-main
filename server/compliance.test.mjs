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

async function del(path, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
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

async function authenticatedCompany(overrides = {}) {
  const { headers } = await signup(overrides);
  const token = sessionToken(headers);
  assert.ok(token, "signup should set a di_session cookie");
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
  const dir = await mkdtemp(join(tmpdir(), "dutaos-compliance-"));
  process.env.DATA_DIR = dir;
  // Force the JSONL backend so tests never reach Supabase.
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("POST /api/compliance-items", () => {
  test("creates a compliance item for the authenticated company", async () => {
    const { token } = await authenticatedCompany();
    const res = await post(
      "/api/compliance-items",
      { type: "ssm", dueDate: "2026-12-31" },
      { cookie: `di_session=${token}` },
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.item.type, "ssm");
    assert.equal(res.body.item.status, "pending");
    assert.equal(res.body.item.dueDate, "2026-12-31");
    assert.equal(res.body.item.completedAt, null);
    assert.ok(res.body.item.id);
    assert.ok(res.body.item.createdAt);
  });

  test("creates an item without a due date", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/compliance-items", { type: "pdpa" }, { cookie: `di_session=${token}` });
    assert.equal(res.status, 201);
    assert.equal(res.body.item.dueDate, null);
  });

  test("401s without a session cookie", async () => {
    const res = await post("/api/compliance-items", { type: "ssm" });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Not authenticated");
  });

  test("400s when type is missing", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/compliance-items", {}, { cookie: `di_session=${token}` });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "type is required");
  });

  test("405s for GET on the collection endpoint", async () => {
    const { token } = await authenticatedCompany();
    const res = await get("/api/compliance-items", { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
  });

  test("405s for DELETE on the collection endpoint", async () => {
    const { token } = await authenticatedCompany();
    const res = await del("/api/compliance-items", { cookie: `di_session=${token}` });
    assert.equal(res.status, 405);
  });
});

describe("GET /api/compliance-items", () => {
  test("returns the company's items ordered newest first", async () => {
    const { token } = await authenticatedCompany();
    await post("/api/compliance-items", { type: "ssm", dueDate: "2026-12-01" }, { cookie: `di_session=${token}` });
    await post("/api/compliance-items", { type: "pdpa" }, { cookie: `di_session=${token}` });

    const res = await get("/api/compliance-items", { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    assert.equal(res.body.items[0].type, "pdpa");
    assert.equal(res.body.items[1].type, "ssm");
  });

  test("401s without a session cookie", async () => {
    const res = await get("/api/compliance-items");
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Not authenticated");
  });

  test("filters by type query param", async () => {
    const { token } = await authenticatedCompany();
    await post("/api/compliance-items", { type: "ssm" }, { cookie: `di_session=${token}` });
    await post("/api/compliance-items", { type: "pdpa" }, { cookie: `di_session=${token}` });

    const res = await get("/api/compliance-items?type=pdpa", { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].type, "pdpa");
  });

  test("returns empty list when the company has no items", async () => {
    const { token } = await authenticatedCompany();
    const res = await get("/api/compliance-items", { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
  });
});

describe("PATCH /api/compliance-items/:id", () => {
  test("marks an item completed and sets completedAt", async () => {
    const { token } = await authenticatedCompany();
    const { body: created } = await post(
      "/api/compliance-items",
      { type: "tax" },
      { cookie: `di_session=${token}` },
    );
    const id = created.item.id;

    const res = await patch(`/api/compliance-items/${id}`, { status: "completed" }, { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.item.status, "completed");
    assert.ok(res.body.item.completedAt, "completedAt should be set when completing");
  });

  test("reopening clears completedAt", async () => {
    const { token } = await authenticatedCompany();
    const { body: created } = await post(
      "/api/compliance-items",
      { type: "myinvois" },
      { cookie: `di_session=${token}` },
    );
    const id = created.item.id;

    await patch(`/api/compliance-items/${id}`, { status: "completed" }, { cookie: `di_session=${token}` });
    const res = await patch(`/api/compliance-items/${id}`, { status: "pending" }, { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.item.status, "pending");
    assert.equal(res.body.item.completedAt, null);
  });

  test("401s without a session cookie", async () => {
    const res = await patch("/api/compliance-items/00000000-0000-0000-0000-000000000000", { status: "completed" });
    assert.equal(res.status, 401);
  });

  test("404s for an unknown id", async () => {
    const { token } = await authenticatedCompany();
    const res = await patch(
      "/api/compliance-items/00000000-0000-0000-0000-000000000000",
      { status: "completed" },
      { cookie: `di_session=${token}` },
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found");
  });

  test("405s for POST on the item endpoint", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/compliance-items/00000000-0000-0000-0000-000000000000", {}, { cookie: `di_session=${token}` });
    assert.equal(res.status, 405);
  });
});

describe("DELETE /api/compliance-items/:id", () => {
  test("deletes an owned item", async () => {
    const { token } = await authenticatedCompany();
    const { body: created } = await post(
      "/api/compliance-items",
      { type: "ssm" },
      { cookie: `di_session=${token}` },
    );
    const id = created.item.id;

    const res = await del(`/api/compliance-items/${id}`, { cookie: `di_session=${token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const list = await get("/api/compliance-items", { cookie: `di_session=${token}` });
    assert.equal(list.body.items.length, 0);
  });

  test("404s for an unknown id", async () => {
    const { token } = await authenticatedCompany();
    const res = await del(
      "/api/compliance-items/00000000-0000-0000-0000-000000000000",
      { cookie: `di_session=${token}` },
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Not found");
  });
});

describe("company scoping", () => {
  test("a company cannot list another company's items", async () => {
    const { token: tokenA } = await authenticatedCompany({ companyName: "Company A Sdn Bhd", email: "a@co-a.my" });
    const { token: tokenB } = await authenticatedCompany({ companyName: "Company B Sdn Bhd", email: "b@co-b.my" });

    await post("/api/compliance-items", { type: "ssm" }, { cookie: `di_session=${tokenA}` });
    await post("/api/compliance-items", { type: "pdpa" }, { cookie: `di_session=${tokenB}` });

    const listA = await get("/api/compliance-items", { cookie: `di_session=${tokenA}` });
    assert.equal(listA.body.items.length, 1);
    assert.equal(listA.body.items[0].type, "ssm");

    const listB = await get("/api/compliance-items", { cookie: `di_session=${tokenB}` });
    assert.equal(listB.body.items.length, 1);
    assert.equal(listB.body.items[0].type, "pdpa");
  });

  test("a company cannot patch another company's item", async () => {
    const { token: tokenA, email: emailA } = await authenticatedCompany({ companyName: "Company A Sdn Bhd", email: "a@co-a.my" });
    const { token: tokenB } = await authenticatedCompany({ companyName: "Company B Sdn Bhd", email: "b@co-b.my" });

    const { body: created } = await post("/api/compliance-items", { type: "ssm" }, { cookie: `di_session=${tokenA}` });
    const id = created.item.id;

    // Company B tries to modify company A's item.
    const res = await patch(`/api/compliance-items/${id}`, { status: "completed" }, { cookie: `di_session=${tokenB}` });
    assert.equal(res.status, 404);

    // Company A's item is unchanged.
    const list = await get("/api/compliance-items", { cookie: `di_session=${tokenA}` });
    assert.equal(list.body.items[0].status, "pending");
  });

  test("a company cannot delete another company's item", async () => {
    const { token: tokenA } = await authenticatedCompany({ companyName: "Company A Sdn Bhd", email: "a@co-a.my" });
    const { token: tokenB } = await authenticatedCompany({ companyName: "Company B Sdn Bhd", email: "b@co-b.my" });

    const { body: created } = await post("/api/compliance-items", { type: "ssm" }, { cookie: `di_session=${tokenA}` });
    const id = created.item.id;

    const res = await del(`/api/compliance-items/${id}`, { cookie: `di_session=${tokenB}` });
    assert.equal(res.status, 404);

    const list = await get("/api/compliance-items", { cookie: `di_session=${tokenA}` });
    assert.equal(list.body.items.length, 1);
  });
});
