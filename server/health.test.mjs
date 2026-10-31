import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { healthReport, resetHealthProbeCache } from "./health.mjs";
import { resetBackendWarnings } from "./store.mjs";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NODE_ENV", "VERCEL", "CONTACT_INBOX_EMAIL", "ADMIN_EMAIL", "HITPAY_API_KEY", "HITPAY_SECRET_KEY", "BILLPLZ_API_KEY", "BILLPLZ_COLLECTION_ID"];

let saved;
let originalFetch;
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  resetBackendWarnings();
  resetHealthProbeCache();
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function configureSupabase() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-value";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("jsonl backend on a durable filesystem reports healthy without probing", async () => {
  const report = await healthReport();
  assert.equal(report.status, 200);
  assert.equal(report.ok, true);
  assert.equal(report.datastore.backend, "jsonl");
  assert.equal(report.datastore.probe, "skipped");
  assert.equal(report.storageDurable, true);
  assert.ok(report.datastore.checkedAt);
});

test("jsonl on serverless is not durable and answers 503", async () => {
  process.env.VERCEL = "1";
  const report = await healthReport();
  assert.equal(report.status, 503);
  assert.equal(report.ok, false);
  assert.equal(report.storageDurable, false);
  assert.match(report.warnings.join(" "), /will not persist across cold starts/);
});

test("a partially configured pair answers 503 as unconfigured", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  const report = await healthReport();
  assert.equal(report.status, 503);
  assert.equal(report.datastore.backend, null);
  assert.equal(report.datastore.probe, "unconfigured");
  // No usable backend: claiming durability here would be the exact lie this
  // endpoint was rewritten to stop telling.
  assert.equal(report.storageDurable, false);
});

test("supabase health runs a write, read and delete round-trip", async () => {
  configureSupabase();
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET" });
    if (init.method === "POST") return jsonResponse([], 201);
    if (init.method === "DELETE") return jsonResponse([], 204);
    return jsonResponse([{ id: "sentinel" }]);
  };

  const report = await healthReport();
  assert.equal(report.status, 200);
  assert.equal(report.datastore.backend, "supabase");
  assert.equal(report.datastore.probe, "roundtrip");

  const methods = calls.map((c) => c.method);
  assert.deepEqual(methods, ["POST", "GET", "DELETE"]);
  assert.ok(calls.every((c) => c.url.includes("/rest/v1/health_probe")));
});

test("a missing probe table reads as an unapplied migration, not as downtime", async () => {
  configureSupabase();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ code: "42P01", message: 'relation "public.health_probe" does not exist' }),
      { status: 404, headers: { "content-type": "application/json" }, },
    );

  const report = await healthReport();
  assert.equal(report.status, 503);
  assert.equal(report.datastore.probe, "migration_missing");
  assert.match(report.warnings.join(" "), /apply supabase\/migrations/);
});

test("an unreachable datastore answers 503", async () => {
  configureSupabase();
  globalThis.fetch = async () => {
    throw new Error("connect ETIMEDOUT");
  };
  const report = await healthReport();
  assert.equal(report.status, 503);
  assert.equal(report.datastore.probe, "unreachable");
});

test("a write that succeeds without a readable row fails the probe", async () => {
  configureSupabase();
  globalThis.fetch = async (url, init = {}) => {
    if ((init.method ?? "GET") === "POST") return jsonResponse([], 201);
    if ((init.method ?? "GET") === "DELETE") return jsonResponse([], 204);
    return jsonResponse([]);
  };
  const report = await healthReport();
  assert.equal(report.status, 503);
  assert.equal(report.datastore.probe, "read_failed");
});

test("the response never echoes provider error bodies or credentials", async () => {
  configureSupabase();
  process.env.ADMIN_EMAIL = "ops@dutaintegra.my";
  globalThis.fetch = async () =>
    new Response(
      'column leads.internal_notes does not exist for key ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      { status: 500 },
    );

  const report = await healthReport();
  const serialised = JSON.stringify(report);
  assert.doesNotMatch(serialised, /service-role-value/);
  assert.doesNotMatch(serialised, /internal_notes/);
});

test("probe results are cached for 60s and bypassed with force", async () => {
  configureSupabase();
  let probes = 0;
  globalThis.fetch = async (url, init = {}) => {
    if ((init.method ?? "GET") === "POST") probes += 1;
    if ((init.method ?? "GET") === "DELETE") return jsonResponse([], 204);
    return jsonResponse([{ id: "sentinel" }]);
  };

  const t0 = 1_700_000_000_000;
  await healthReport({ now: t0 });
  const cached = await healthReport({ now: t0 + 30_000 });
  assert.equal(probes, 1);
  assert.equal(cached.cached, true);

  await healthReport({ now: t0 + 61_000 });
  assert.equal(probes, 2, "cache expires after the TTL");

  await healthReport({ now: t0 + 61_000, force: true });
  assert.equal(probes, 3, "force re-probes inside the TTL");
});

test("inbox status is reported separately from the datastore", async () => {
  const report = await healthReport();
  assert.equal(report.inbox.ok, false);
  assert.equal(report.datastore.ok, true);
  assert.equal(report.ok, true, "a missing inbox alone does not make the datastore unhealthy");
  assert.match(report.warnings.join(" "), /enquiry notifications disabled/);
});

test("payments.providersConfigured reflects whether each provider has its keys", async () => {
  let report = await healthReport();
  assert.deepEqual(report.payments.providersConfigured, { hitpay: false, billplz: false });

  process.env.HITPAY_API_KEY = "hp_key";
  process.env.HITPAY_SECRET_KEY = "hp_secret";
  resetHealthProbeCache();
  report = await healthReport();
  assert.equal(report.payments.providersConfigured.hitpay, true);
  assert.equal(report.payments.providersConfigured.billplz, false);

  process.env.BILLPLZ_API_KEY = "bp_key";
  process.env.BILLPLZ_COLLECTION_ID = "bp_coll";
  resetHealthProbeCache();
  report = await healthReport();
  assert.deepEqual(report.payments.providersConfigured, { hitpay: true, billplz: true });
});
