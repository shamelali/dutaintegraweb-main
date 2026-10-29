import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "./handler-cloudflare.mjs";

/**
 * The first tests over the entrypoint production actually runs.
 *
 * server/handler-cloudflare.mjs is what functions/api/[[path]].js imports on
 * Cloudflare Pages; handler.test.mjs covers the Vercel/Node entrypoint, which
 * shares no route table with it. Everything here was red before the fixes it
 * now pins: the ops family answering 500 to unauthenticated callers, and the
 * portal family never resolving a token — createSupabaseClient nested auth
 * under from(), so verifyUser returned null for every user.
 */

const ORIGIN = "https://www.dutaintegra.my";
let ipSeq = 0;
function nextIp() {
  return `203.0.113.${++ipSeq % 250}`;
}

function call(pathname, init = {}) {
  const req = new Request(`${ORIGIN}${pathname}`, {
    ...init,
    headers: { "x-forwarded-for": nextIp(), ...(init.headers ?? {}) },
  });
  return handleApi(req);
}

describe("GET /api/ops/* — admin gate", () => {
  let originalFetch;

  before(() => {
    delete process.env.ADMIN_TOKEN;
    // The handlers behind this gate reach Supabase on every path, so give them
    // a stub instead of letting unmatched rejections escape the test.
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("fails closed with no ADMIN_TOKEN configured", async () => {
    for (const pathname of ["/api/ops/tasks", "/api/ops/task-stats", "/api/ops/audit-log"]) {
      const res = await call(pathname);
      assert.equal(res.status, 401, `${pathname} answered ${res.status} without any admin configured`);
    }
  });

  test("refuses an unauthenticated write to the task store", async () => {
    const res = await call("/api/ops/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Delete everything", createdBy: "nobody" }),
    });
    assert.equal(res.status, 401);
  });

  test("refuses the approval sub-routes", async () => {
    const id = "0f1e2d3c-4b5a-4678-9abc-def012345678";
    for (const suffix of ["approve", "request-approval"]) {
      const res = await call(`/api/ops/tasks/${id}/${suffix}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 401, `${suffix} answered ${res.status}`);
    }
  });

  test("accepts the ADMIN_TOKEN fallback", async () => {
    process.env.ADMIN_TOKEN = "cf-ops-test-token";
    try {
      const res = await call("/api/ops/tasks", { headers: { "x-admin-token": "cf-ops-test-token" } });
      assert.notEqual(res.status, 401, "a valid admin token must reach the handler");
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  test("rejects a wrong ADMIN_TOKEN", async () => {
    process.env.ADMIN_TOKEN = "cf-ops-test-token";
    try {
      const res = await call("/api/ops/tasks", { headers: { "x-admin-token": "not-it" } });
      assert.equal(res.status, 401);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  test("leaves the public ops routes alone", async () => {
    // /api/ops/feed, /consent and /events gate themselves; the task gate must
    // not swallow them, and /feed answers without credentials by design.
    const res = await call("/api/ops/feed");
    assert.notEqual(res.status, 401, "the public feed regressed behind the task gate");
  });
});

// ── the authenticated portal path ─────────────────────────────────────────────

const UID = "11111111-2222-3333-4444-555555555555";

const PROPOSAL_ROW = {
  id: "aaaa0000-0000-0000-0000-000000000001",
  client_id: UID,
  title: "Automation, phase one",
  summary: "Ticket triage and an intake bot.",
  scope: ["triage"],
  amount_myr: 12000,
  status: "draft",
  created_at: "2026-10-29T00:00:00Z",
};

/**
 * Stubs the two Supabase surfaces the portal handlers touch: the auth
 * userinfo endpoint that verifyUser calls, and the REST rows.
 */
function stubSupabase({ validToken = true } = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const json = (body, status) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.includes("/auth/v1/")) {
      return validToken
        ? json({ id: UID, aud: "authenticated", role: "authenticated" }, 200)
        : json({ error: "invalid token" }, 401);
    }
    return json([PROPOSAL_ROW], 200);
  };
  return {
    calls,
    restore: () => { globalThis.fetch = original; },
    rest: () => calls.filter((c) => c.url.includes("/rest/v1/")),
  };
}

async function asClient(pathname, init = {}) {
  const req = new Request(`${ORIGIN}${pathname}`, {
    ...init,
    headers: {
      "x-forwarded-for": nextIp(),
      authorization: `Bearer jwt-for-${UID}`,
      ...(init.headers ?? {}),
    },
  });
  return handleApi(req);
}

describe("portal proposals + projects — workspace_* tables, working auth", () => {
  let env;
  before(() => {
    env = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    };
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    delete process.env.ADMIN_TOKEN;
  });
  after(() => { Object.assign(process.env, env); });

  test("a bearer token authenticates, and the read is scoped to that client", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/proposals");
      const text = await res.text();
      assert.equal(res.status, 200, `expected 200, got ${text.slice(0, 160)}`);
      const body = JSON.parse(text);
      assert.equal(body.proposals.length, 1);
      const [get] = stub.rest();
      assert.match(get.url, /\/rest\/v1\/workspace_proposals\?/);
      assert.match(get.url, new RegExp(`client_id=eq\\.${UID}`));
      assert.match(get.url, /order=created_at\.desc/);
    } finally {
      stub.restore();
    }
  });

  test("an unverifiable token is a 401, not a crash", async () => {
    const stub = stubSupabase({ validToken: false });
    try {
      const res = await asClient("/api/portal/proposals");
      assert.equal(res.status, 401);
      assert.equal(stub.rest().length, 0, "must not reach the datastore");
    } finally {
      stub.restore();
    }
  });

  test("POST writes the columns the portal UI reads", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Phase two", description: "Reporting", totalAmount: 8000, tier: "growth" }),
      });
      assert.equal(res.status, 201, `expected 201, got ${res.status}`);
      const post = stub.rest().find((c) => c.init.method === "POST");
      const row = JSON.parse(post.init.body);
      assert.equal(row.summary, "Reporting");
      assert.equal(row.amount_myr, 8000);
      assert.deepEqual(row.scope, []);
      assert.equal(row.client_id, UID);
      assert.ok(!("tier" in row), "workspace_proposals has no tier column");
      assert.ok(!("total_amount" in row), "the Phase 3 column name must not survive");
    } finally {
      stub.restore();
    }
  });

  test("PATCH accepts a status the check constraint allows and refuses one it does not", async () => {
    const stub = stubSupabase();
    try {
      const bad = await asClient(`/api/portal/proposals/${PROPOSAL_ROW.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      assert.equal(bad.status, 400, "rejected is not in the workspace_proposals status check");

      const good = await asClient(`/api/portal/proposals/${PROPOSAL_ROW.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      assert.equal(good.status, 200);
      const patch = stub.rest().find((c) => c.init.method === "PATCH");
      assert.match(patch.url, /workspace_proposals\?/);
      assert.match(patch.url, new RegExp(`client_id=eq\\.${UID}`), "the write must stay ownership-scoped");
    } finally {
      stub.restore();
    }
  });

  test("projects reads workspace_projects", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/projects");
      assert.equal(res.status, 200);
      const [get] = stub.rest();
      assert.match(get.url, /\/rest\/v1\/workspace_projects\?/);
      assert.match(get.url, new RegExp(`client_id=eq\\.${UID}`));
    } finally {
      stub.restore();
    }
  });
});
