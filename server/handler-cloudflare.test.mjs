import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "./handler-cloudflare.mjs";

/**
 * The first test over the entrypoint production actually runs.
 *
 * server/handler-cloudflare.mjs is what functions/api/[[path]].js imports on
 * Cloudflare Pages; handler.test.mjs covers the Vercel/Node entrypoint, which
 * shares no route table with it. These cases pin the auth gate on the ops task
 * family, which reached the data layer with no check at all and answered 500
 * only because ops_tasks was never created.
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
