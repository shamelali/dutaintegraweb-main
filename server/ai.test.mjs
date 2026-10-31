import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handle } from "./handler.mjs";
import { resetAuthRateLimit } from "./auth.mjs";

/**
 * End-to-end tests for the DutaOS AI chatbar. The model provider is a real
 * local HTTP server so no global fetch stub can leak into the HTTP client the
 * tests themselves use.
 */

const VALID = {
  email: "Aisyah@Kedai-Maju.MY",
  password: "securePass1",
  companyName: "Kedai Maju Sdn Bhd",
  industry: "Retail",
};

let server;
let base;
let ollama;
let ollamaBase;
let ollamaMode = "ok";
let lastOllamaBody = null;
let ipCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers },
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
  const cookie = setCookie.find((c) => c.startsWith("dutaos_session="));
  return cookie?.split(";")[0]?.split("=")?.[1] ?? null;
}

async function authenticatedCompany() {
  const { headers } = await post("/api/auth/signup", VALID);
  const token = sessionToken(headers);
  assert.ok(token, "signup should set a dutaos_session cookie");
  return `dutaos_session=${token}`;
}

async function readActions() {
  const raw = await readFile(join(process.env.DATA_DIR, "ai-actions.jsonl"), "utf8");
  return raw.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

before(async () => {
  ollama = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      lastOllamaBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (ollamaMode === "fail") {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "model overloaded" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: { role: "assistant", content: "Sila semak item SSM anda." } }));
    });
  });
  await new Promise((done) => ollama.listen(0, "127.0.0.1", done));
  ollamaBase = `http://127.0.0.1:${ollama.address().port}`;

  server = createServer(handle);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done) => server.close(done));
  server.closeAllConnections?.();
  await new Promise((done) => ollama.close(done));
  ollama.closeAllConnections?.();
});

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "dutaos-ai-"));
  process.env.DATA_DIR = dir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LLM_BASE_URL;
  process.env.OLLAMA_HOST = ollamaBase;
  delete process.env.OLLAMA_CHAT_MODEL;
  ollamaMode = "ok";
  lastOllamaBody = null;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("GET /api/dutaos/brief", () => {
  test("anonymous access is a 401", async () => {
    const res = await get("/api/dutaos/brief");
    assert.equal(res.status, 401);
  });

  test("summarises the signed-in company's compliance items", async () => {
    const cookie = await authenticatedCompany();
    await post("/api/compliance-items", { type: "ssm", dueDate: "2020-01-01" }, { cookie });
    await post("/api/compliance-items", { type: "pdpa", dueDate: "2099-12-31" }, { cookie });

    const res = await get("/api/dutaos/brief", { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.brief.company.name, "Kedai Maju Sdn Bhd");
    assert.equal(res.body.brief.company.tier, "starter");
    assert.equal(res.body.brief.compliance.total, 2);
    assert.equal(res.body.brief.compliance.pending, 2);
    assert.equal(res.body.brief.compliance.overdue, 1);
    assert.deepEqual(res.body.brief.compliance.nextDue, { type: "pdpa", dueDate: "2099-12-31" });
  });
});

describe("POST /api/ai/chat", () => {
  test("anonymous access is a 401 and never reaches the model", async () => {
    const res = await post("/api/ai/chat", { message: "hello" });
    assert.equal(res.status, 401);
    assert.equal(lastOllamaBody, null);
  });

  test("answers from the brief, records an executed ai_action", async () => {
    const cookie = await authenticatedCompany();
    await post("/api/compliance-items", { type: "ssm", dueDate: "2099-01-01" }, { cookie });

    const res = await post("/api/ai/chat", { message: "Apa status pematuhan saya?", lang: "bm" }, { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.response, "Sila semak item SSM anda.");
    assert.equal(res.body.model, "llama3.2");
    assert.equal(res.body.provider, "ollama");

    const system = lastOllamaBody.messages[0].content;
    assert.match(system, /DUTA CEO/);
    assert.match(system, /"pending": 1/);
    assert.match(system, /Bahasa Melayu/);
    assert.equal(lastOllamaBody.messages[1].content, "Apa status pematuhan saya?");

    const [action] = await readActions();
    assert.equal(action.action_type, "recommendation");
    assert.equal(action.approval_level, 0);
    assert.equal(action.tool_name, "daily_brief");
    assert.equal(action.status, "executed");
    assert.equal(action.input_data.message, "Apa status pematuhan saya?");
    assert.equal(action.output_data.model, "llama3.2");
  });

  test("falls back to a data summary when the model is unreachable", async () => {
    const cookie = await authenticatedCompany();
    await post("/api/compliance-items", { type: "ssm", dueDate: "2020-01-01" }, { cookie });
    ollamaMode = "fail";

    const res = await post("/api/ai/chat", { message: "Apa status?", lang: "en" }, { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.model, "fallback");
    assert.match(res.body.response, /1 compliance item\(s\) still pending, 1 overdue/);

    const [action] = await readActions();
    assert.equal(action.status, "failed");
    assert.match(action.error_message, /model responded 500/);
  });

  test("rejects an empty or oversized message", async () => {
    const cookie = await authenticatedCompany();
    const empty = await post("/api/ai/chat", { message: "   " }, { cookie });
    assert.equal(empty.status, 400);
    const huge = await post("/api/ai/chat", { message: "x".repeat(2001) }, { cookie });
    assert.equal(huge.status, 400);
  });
});
