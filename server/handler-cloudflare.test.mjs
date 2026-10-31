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

describe("ops task surface removed; admin token still gated", () => {
  let originalFetch;

  before(() => {
    delete process.env.ADMIN_TOKEN;
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

  test("the /api/ops task routes are gone", async () => {
    const id = "0f1e2d3c-4b5a-4678-9abc-def012345678";
    const paths = [
      "/api/ops/tasks",
      "/api/ops/task-stats",
      "/api/ops/audit-log",
      `/api/ops/tasks/${id}`,
      `/api/ops/tasks/${id}/approve`,
      `/api/ops/tasks/${id}/request-approval`,
    ];
    for (const pathname of paths) {
      const res = await call(pathname);
      assert.equal(res.status, 404, `${pathname} still answers ${res.status}`);
    }
  });

  test("the public ops routes still answer", async () => {
    // /api/ops/feed, /consent and /events are the autonomous-ops endpoints and
    // gate themselves; removing the task family must not take them down.
    for (const pathname of ["/api/ops/feed", "/api/ops/consent"]) {
      const res = await call(pathname);
      assert.notEqual(res.status, 404, `${pathname} disappeared with the task routes`);
      assert.notEqual(res.status, 500, `${pathname} crashed`);
    }
  });

  test("ADMIN_TOKEN is read per call, so a valid token authenticates", async () => {
    // functions/api/[[path]].js copies the Pages bindings into process.env
    // inside the request. A module-scope capture meant this path could never
    // authenticate, whatever the deployment configured.
    process.env.ADMIN_TOKEN = "cf-ops-test-token";
    try {
      const good = await call("/admin/clients", { headers: { "x-admin-token": "cf-ops-test-token" } });
      assert.equal(good.status, 200, `expected 200, got ${good.status}`);
      const bad = await call("/admin/clients", { headers: { "x-admin-token": "not-it" } });
      assert.equal(bad.status, 401);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  test("the admin routes fail closed with no ADMIN_TOKEN configured", async () => {
    const res = await call("/admin/clients");
    assert.equal(res.status, 401);
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

describe("portal auth — the route names the React portal actually calls", () => {
  let env;
  before(() => {
    env = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
  });
  after(() => { Object.assign(process.env, env); });

  test("POST /api/portal/login validates the body instead of answering 404", async () => {
    const res = await call("/api/portal/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400, "a missing body must be a validation error, not an unrouted 404");
    assert.match((await res.json()).error, /Email and password/);
  });

  test("GET /api/portal/me without a token is 401, not 404", async () => {
    const res = await call("/api/portal/me");
    assert.equal(res.status, 401);
  });

  test("POST /api/portal/logout clears di_session", async () => {
    const res = await call("/api/portal/logout", { method: "POST" });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /di_session=.*Max-Age=0/);
  });
});

describe("DutaOS auth, compliance and catalog on the Pages entrypoint", () => {
  let originalFetch;
  let sessions;

  before(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    sessions = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const method = (init.method ?? "GET").toUpperCase();
      const body = init.body ? JSON.parse(init.body) : null;
      if (url.pathname.endsWith("/dutaos_sessions")) {
        if (method === "POST") {
          const row = Array.isArray(body) ? body[0] : body;
          sessions.push(row);
          return Response.json([row], { status: 201 });
        }
        if (method === "GET") {
          const tokenHash = (url.searchParams.get("token_hash") ?? "").replace(/^eq\./, "");
          return Response.json(sessions.filter((s) => s.token_hash === tokenHash));
        }
        return Response.json([]);
      }
      if (method === "POST") return Response.json([body], { status: 201 });
      return Response.json([]);
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  async function signup() {
    const res = await call("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `cf-${nextIp()}@example.my`,
        password: "securePass1",
        companyName: "CF Test Sdn Bhd",
      }),
    });
    assert.equal(res.status, 201);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /dutaos_session=/, "signup must mint a DutaOS session");
    assert.doesNotMatch(setCookie, /(^|,\s*)di_session=/, "must not clobber the portal cookie");
    return { cookie: setCookie.split(";")[0] };
  }

  test("signup authenticates, and compliance answers with that session", async () => {
    const { cookie } = await signup();
    const res = await call("/api/compliance-items", { headers: { cookie } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.items, []);
  });

  test("compliance without a session is 401, not a crash", async () => {
    const res = await call("/api/compliance-items");
    assert.equal(res.status, 401);
  });

  test("catalog is closed to anonymous callers and open to a DutaOS session", async () => {
    const anonymous = await call("/api/catalog/items");
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const list = await call("/api/catalog/items", { headers: { cookie } });
    assert.equal(list.status, 200);

    const created = await call("/api/catalog/items", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "CF chair" }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).item.title, "CF chair");
  });

  test("the DutaOS brief is session-gated and zeroed for a fresh company", async () => {
    const anonymous = await call("/api/dutaos/brief");
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const res = await call("/api/dutaos/brief", { headers: { cookie } });
    assert.equal(res.status, 200);
    const { brief } = await res.json();
    assert.equal(brief.compliance.pending, 0);
    assert.equal(brief.compliance.overdue, 0);
    assert.equal(brief.compliance.nextDue, null);
  });

  test("chat on Pages is session-gated and falls back when the model call fails", async () => {
    const anonymous = await call("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const res = await call("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ message: "What should I do this month?", lang: "en" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.model, "fallback");
    assert.match(body.response, /0 compliance item\(s\) still pending, 0 overdue/);
  });
});
