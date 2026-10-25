import test from "node:test";
import assert from "node:assert/strict";
import { __test, handleWorkspaceApi } from "./workspace-cloudflare.mjs";

const { scoreAssessment, proposalInput, projectInput, taskInput } = __test;

test("digital assessment scoring returns a bounded score and actionable recommendations", () => {
  const low = scoreAssessment(1, ["security", "automation"]);
  assert.equal(low.score, 24);
  assert.equal(low.label, "Digital Foundations");
  assert.ok(low.recommendations.some(x => x.includes("core systems")));
  assert.ok(low.recommendations.some(x => x.includes("MFA")));
  const high = scoreAssessment(5, ["sales", "automation", "security", "ai", "operations"]);
  assert.equal(high.score, 100);
  assert.equal(high.label, "Advanced Digital");
  assert.ok(high.recommendations.length <= 5);
});

test("proposal validation requires a title, summary and non-negative MYR amount", () => {
  assert.ok(proposalInput({ title: "", summary: "scope", amountMyr: 100 }).error);
  assert.ok(proposalInput({ title: "Proposal", summary: "scope", amountMyr: -1 }).error);
  const valid = proposalInput({ title: "SME automation", summary: "Automate intake", amountMyr: 2500, scope: ["Discovery", "Implementation"] });
  assert.equal(valid.value.amount_myr, 2500);
  assert.equal(valid.value.scope.length, 2);
  assert.equal(valid.value.status, "draft");
});

test("project and task input validation rejects missing foreign keys", () => {
  assert.ok(projectInput({ name: "Project" }).error);
  assert.ok(taskInput({ title: "Task" }).error);
  const projectId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(taskInput({ title: "Review plan", projectId, priority: "urgent" }).value.priority, "urgent");
});

test("workspace admin endpoints are closed without server-side admin token", async () => {
  const previous = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  const res = await handleWorkspaceApi(new Request("https://example.test/api/workspace/admin/leads"));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, "Admin authentication required");
  if (previous !== undefined) process.env.ADMIN_TOKEN = previous;
});

test("assessment endpoint validates input before requiring a configured database", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await handleWorkspaceApi(new Request("https://example.test/api/workspace/assessments", {
    method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.80" }, body: JSON.stringify({}),
  }));
  assert.equal(res.status, 400);
  if (previousUrl !== undefined) process.env.SUPABASE_URL = previousUrl;
  if (previousKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
});

test("operations login issues a short-lived HttpOnly cookie without returning the secret", async () => {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "test-only-operations-token-32-characters";
  const login = await handleWorkspaceApi(new Request("https://example.test/api/workspace/admin/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: process.env.ADMIN_TOKEN }),
  }));
  assert.equal(login.status, 200);
  const body = await login.json();
  assert.equal(body.ok, true);
  assert.equal(JSON.stringify(body).includes(process.env.ADMIN_TOKEN), false);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  const value = cookie.match(/di_admin=([^;]+)/)?.[1];
  assert.ok(value);
  const me = await handleWorkspaceApi(new Request("https://example.test/api/workspace/admin/me", { headers: { cookie: `di_admin=${value}` } }));
  assert.equal(me.status, 200);
  const logout = await handleWorkspaceApi(new Request("https://example.test/api/workspace/admin/logout", { method: "POST" }));
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  if (previous !== undefined) process.env.ADMIN_TOKEN = previous; else delete process.env.ADMIN_TOKEN;
});

test("Node/Vercel gateway forwards workspace routes to the shared API handler", async () => {
  const { Readable } = await import("node:stream");
  const { handle } = await import("./handler.mjs");
  const req = Readable.from([]);
  req.url = "/api/workspace/admin/leads";
  req.method = "GET";
  req.headers = { host: "dutaintegra.test" };
  const headers = {};
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { this.body = value?.toString() || ""; this.headersSent = true; },
  };
  const previous = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  await handle(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).error, "Admin authentication required");
  if (previous !== undefined) process.env.ADMIN_TOKEN = previous;
});
