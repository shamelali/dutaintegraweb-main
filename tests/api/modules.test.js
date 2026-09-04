import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Regression guard for the "duplicate declaration" class of bug: every
// serverless entry module must parse and load cleanly. A SyntaxError here
// means every request to that function would 500 on Vercel — and the unit
// tests below never imported the entry files, which is how the bug in
// api/admin.js (getAdminSupabase declared twice) shipped undetected.
//
// Env stubs are set before any import so module-load-time config parsing
// (lib/config.js, ADMIN_USERS JSON.parse in api/admin.js) stays quiet.

process.env.JWT_SECRET ||= "test-jwt-secret-for-module-load-checks";
process.env.ADMIN_USERS ||= JSON.stringify([
  { email: "admin@example.com", password: "test-password", name: "Test Admin", role: "technical" },
]);
process.env.SUPABASE_URL ||= "https://test-project.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key";
process.env.CRON_SECRET ||= "test-cron-secret";

const BASE = "https://dutaintegra.my";

describe("API entry modules must load", () => {
  it("api/admin.js loads and exports routing handlers", async () => {
    const mod = await import("../../api/admin.js");
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal(typeof mod[method], "function", `admin.js must export ${method}`);
    }
  });

  it("api/audit.js loads and exports GET/POST + runAudit", async () => {
    const mod = await import("../../api/audit.js");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
    assert.equal(typeof mod.runAudit, "function");
  });

  it("api/cron.js loads and exports GET", async () => {
    const mod = await import("../../api/cron.js");
    assert.equal(typeof mod.GET, "function");
  });

  it("api/public.js loads and exports routing handlers", async () => {
    const mod = await import("../../api/public.js");
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal(typeof mod[method], "function", `public.js must export ${method}`);
    }
  });

  it("api/send-email.js loads and exports GET/POST", async () => {
    const mod = await import("../../api/send-email.js");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("api/_lib.js facade loads and re-exports the shared helpers", async () => {
    const mod = await import("../../api/_lib.js");
    for (const name of [
      "getAdminSupabase",
      "getAnonSupabase",
      "json",
      "corsResponse",
      "sanitize",
      "makeId",
      "verifyAdminToken",
      "getAllowedOrigin",
      "createRateLimiter",
      "postToSlack",
      "isCronAuthorized",
    ]) {
      assert.equal(typeof mod[name], "function", `_lib.js must export ${name}`);
    }
  });
});

describe("API routers reject unknown resources without touching the DB", () => {
  it("admin handler returns 404 for an unknown resource", async () => {
    const { GET } = await import("../../api/admin.js");
    const res = await GET(new Request(`${BASE}/api/admin?resource=nope`));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.ok, false);
  });

  it("public handler returns 404 for an unknown resource", async () => {
    const { GET } = await import("../../api/public.js");
    const res = await GET(new Request(`${BASE}/api/public?resource=nope`));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.ok, false);
  });

  it("cron handler returns 404 for an unknown job", async () => {
    const { GET } = await import("../../api/cron.js");
    const res = await GET(new Request(`${BASE}/api/cron?job=nope`));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.ok, false);
  });
});
