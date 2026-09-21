import assert from "node:assert/strict";
import test from "node:test";

import {
  isIgnoredPath,
  redact,
  scanText,
  summarize,
  verifyToken,
} from "../scripts/scan-secrets.mjs";

// Fixtures are assembled at runtime rather than written as literals. The
// scanner scans its own test file, and a raw credential-shaped literal here
// would be flagged (correctly) on every run, turning the working-tree scan
// permanently noisy and making a genuine finding harder to spot.
const FAKE_FG_PAT = ["github", "pat", "11ABCDEFG0HIJKLMNOPQRSTUVWXYZ0123456789abcdef"].join("_");
const FAKE_CLASSIC_PAT = ["ghp", "a".repeat(36)].join("_");
const FAKE_SLACK_HOOK =
  "https://hooks.slack.com/services/" + ["T00000000", "B00000000", "X".repeat(24)].join("/");
const FAKE_AWS_KEY = "AKIA" + "IOSFODNN7EXAMPLE";
const FAKE_PEM = "-----BEGIN RSA " + "PRIVATE KEY-----";

// ---------------------------------------------------------------------------
// Redaction — the scanner must never print a credential it found.
// ---------------------------------------------------------------------------

test("redact never returns the full value", () => {
  const secret = FAKE_FG_PAT;
  const out = redact(secret);
  assert.ok(!out.includes(secret), "must not echo the whole secret");
  assert.ok(out.includes(String(secret.length)), "should report the length");
  assert.ok(out.length < secret.length);
});

test("redact handles short and empty values without throwing", () => {
  assert.equal(redact(""), "<empty>");
  assert.ok(redact("short").startsWith("sh"));
  assert.ok(redact("mediumvalue1").includes("chars"));
});

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

test("detects a fine-grained GitHub PAT", () => {
  const found = scanText(`const t = "${FAKE_FG_PAT}";`);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "github-pat-fine-grained");
  assert.equal(found[0].confidence, "high");
});

test("detects a classic GitHub PAT", () => {
  const found = scanText(`const t = "${FAKE_CLASSIC_PAT}";`);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "github-pat-classic");
});

test("detects a Slack incoming webhook", () => {
  const found = scanText(FAKE_SLACK_HOOK);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "slack-webhook");
});

test("detects an AWS access key id", () => {
  const found = scanText(`AWS_KEY=${FAKE_AWS_KEY}`);
  assert.ok(found.some((f) => f.id === "aws-access-key"));
});

test("detects a PEM private key header", () => {
  const found = scanText(FAKE_PEM);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "private-key");
});

// ---------------------------------------------------------------------------
// Precision — things that must NOT be reported
// ---------------------------------------------------------------------------

test("ignores a JWT whose role is anon, as Supabase anon keys are public", () => {
  const anon =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxfQ." +
    "c2lnbmF0dXJlYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo";
  const found = scanText(`export const ANON = "${anon}";`);
  assert.equal(found.length, 0, "anon keys are public and must not be flagged");
});

test("flags a JWT whose role is service_role", () => {
  const svc =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjF9." +
    "c2lnbmF0dXJlYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo";
  const found = scanText(`export const SERVICE = "${svc}";`);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "supabase-service-role");
});

test("honours an allow marker on the line", () => {
  const found = scanText(
    'const t = "github_pat_11ABCDEFG0HIJKLMNOPQRSTUVWXYZ0123456789abcdef"; // secret-scan:allow',
  );
  assert.equal(found.length, 0);
});

test("ignores prose that merely contains a trigger word", () => {
  const found = scanText("Set the password field in the form to something long.");
  assert.equal(found.length, 0);
});

test("ignores an obviously non-random generic value", () => {
  // Low entropy: no credential looks like this.
  const found = scanText('const apikey = "aaaaaaaaaaaaaaaaaaaa";');
  assert.equal(found.filter((f) => f.id === "generic-assignment").length, 0);
});

test("ignores documentation placeholders referencing a real prefix", () => {
  const found = scanText("Use `github_pat_xxx` in your .env file.");
  assert.equal(found.length, 0, "short placeholder must not match");
});

// ---------------------------------------------------------------------------
// Ignore rules
// ---------------------------------------------------------------------------

test("ignores build output, dependencies, and binary assets", () => {
  assert.ok(isIgnoredPath("Web/assets/index-abc123.js"));
  assert.ok(isIgnoredPath("web-new/node_modules/pkg/index.js"));
  assert.ok(isIgnoredPath("assets/logo.png"));
  assert.ok(isIgnoredPath("web-new/dist/index.js"));
  assert.ok(!isIgnoredPath("server/handler.mjs"));
  assert.ok(!isIgnoredPath("scripts/scan-secrets.mjs"));
});

// ---------------------------------------------------------------------------
// Liveness verification — stubbed, never real network
// ---------------------------------------------------------------------------

function stubFetch(status, body = {}) {
  return async () => ({
    status,
    json: async () => body,
  });
}

test("a token the provider rejects is reported dead, not live", async () => {
  const finding = { verify: "github", value: "github_pat_dead" };
  assert.equal(await verifyToken(finding, stubFetch(401)), "dead");
});

test("a token the provider accepts is reported live", async () => {
  const finding = { verify: "github", value: "github_pat_live" };
  assert.equal(await verifyToken(finding, stubFetch(200)), "live");
});

test("a network failure is unknown, not dead and not live", async () => {
  const finding = { verify: "github", value: "github_pat_x" };
  const throwing = async () => {
    throw new Error("ENOTFOUND");
  };
  // Unknown matters: treating it as dead would hide a real leak, treating it as
  // live would break the build on a flaky network.
  assert.equal(await verifyToken(finding, throwing), "unknown");
});

test("a Slack token is judged on ok:false, which still returns HTTP 200", async () => {
  const finding = { verify: "slack", value: "xoxb-bad" };
  assert.equal(await verifyToken(finding, stubFetch(200, { ok: false })), "dead");
  assert.equal(await verifyToken(finding, stubFetch(200, { ok: true })), "live");
});

test("a Slack webhook is never verified, to avoid posting to a live channel", async () => {
  const finding = { verify: "slack-webhook", value: "https://hooks.slack.com/services/a/b/c" };
  assert.equal(await verifyToken(finding, stubFetch(200)), "unknown");
});

test("a pattern with no verifier is unknown rather than guessed", async () => {
  const finding = { verify: null, value: FAKE_AWS_KEY };
  assert.equal(await verifyToken(finding, stubFetch(200)), "unknown");
});

// ---------------------------------------------------------------------------
// Gate policy — warn on suspicion, fail only on confirmed liveness
// ---------------------------------------------------------------------------

test("high-confidence unverified hits warn but do not fail by default", () => {
  const findings = [{ confidence: "high", verdict: "unknown" }, { confidence: "low", verdict: "unknown" }];
  const r = summarize(findings);
  assert.equal(r.shouldFail, false, "an unverified pattern must not break the build");
  assert.equal(r.highUnverified.length, 1);
});

test("a confirmed-live credential always fails", () => {
  const findings = [{ confidence: "high", verdict: "live" }];
  assert.equal(summarize(findings).shouldFail, true);
});

test("strict mode fails on any high-confidence hit", () => {
  const findings = [{ confidence: "high", verdict: "unknown" }];
  assert.equal(summarize(findings).shouldFail, false);
  assert.equal(summarize(findings, { strict: true }).shouldFail, true);
});

test("a dead credential never fails, even under strict", () => {
  // Otherwise a revoked token would permanently break the build.
  const findings = [{ confidence: "high", verdict: "dead" }];
  assert.equal(summarize(findings, { strict: true }).shouldFail, false);
});
