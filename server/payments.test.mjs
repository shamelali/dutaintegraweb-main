import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";

import { handle } from "./handler.mjs";
import { resetAuthRateLimit } from "./auth.mjs";

/**
 * End-to-end payment tests against the real handler, JSONL store only
 * (DATA_DIR points at a throwaway dir). Provider HTTP calls are mocked so no
 * network is used; webhook signatures are real HMAC-SHA256.
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
const realFetch = globalThis.fetch;
let hitpayCalls = 0;
let billplzCalls = 0;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function sign(secret, body) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("api.hitpay.io/v1/payments")) {
    hitpayCalls += 1;
    return new Response(
      JSON.stringify({ id: "hp_test_1", url: "https://checkout.hitpay.co/pay/hp_test_1" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  if (u.includes("billplz.com/api/v3/payments")) {
    billplzCalls += 1;
    return new Response(
      JSON.stringify({ id: "bp_test_1", url: "https://www.billplz.com/api/v3/payments/bp_test_1" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  return realFetch(url, init);
};

async function post(path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

async function get(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers: { "x-forwarded-for": nextIp(), ...headers } });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

async function webhook(path, body, signature) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...(signature ? { "x-signature": signature } : {}) },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function sessionToken(headers) {
  const setCookie = headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("dutaos_session="));
  return cookie?.split(";")[0]?.split("=")?.[1] ?? null;
}

async function authenticatedCompany(overrides = {}) {
  const { headers } = await post("/api/auth/signup", { ...VALID, ...overrides });
  const token = sessionToken(headers);
  assert.ok(token, "signup should set a dutaos_session cookie");
  return { token };
}

function scrubEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.HITPAY_API_KEY;
  delete process.env.HITPAY_SECRET_KEY;
  delete process.env.BILLPLZ_API_KEY;
  delete process.env.BILLPLZ_COLLECTION_ID;
  delete process.env.WEBHOOK_BASE_URL;
}

before(async () => {
  server = createServer(handle);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((done) => server.close(done));
  server.closeAllConnections?.();
});

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "dutaos-payments-"));
  process.env.DATA_DIR = dir;
  scrubEnv();
  hitpayCalls = 0;
  billplzCalls = 0;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("POST /api/billing/checkout", () => {
  test("401 without a session", async () => {
    const res = await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" });
    assert.equal(res.status, 401);
  });

  test("400 when provider or plan is missing", async () => {
    const { token } = await authenticatedCompany();
    for (const body of [{}, { provider: "hitpay" }, { plan: "starter" }]) {
      const res = await post("/api/billing/checkout", body, { cookie: `dutaos_session=${token}` });
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  test("400 for unknown provider", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/billing/checkout", { provider: "stripe", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Unknown payment provider");
  });

  test("400 when HitPay is not configured", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "HitPay not configured");
  });

  test("400 when Billplz is not configured", async () => {
    const { token } = await authenticatedCompany();
    const res = await post("/api/billing/checkout", { provider: "billplz", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Billplz not configured");
  });

  test("HitPay checkout creates a pending payment and returns the checkout URL", async () => {
    process.env.HITPAY_API_KEY = "hp_key";
    process.env.HITPAY_SECRET_KEY = "hp_secret";
    const { token } = await authenticatedCompany();
    const res = await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(hitpayCalls, 1);
    assert.equal(res.body.payment.status, "pending");
    assert.equal(res.body.payment.provider, "hitpay");
    assert.equal(res.body.payment.plan, "starter");
    assert.equal(res.body.payment.amount, 79900);
    assert.equal(res.body.payment.currency, "MYR");
    assert.equal(res.body.checkoutUrl, "https://checkout.hitpay.co/pay/hp_test_1");
    assert.ok(res.body.payment.id);
    assert.ok(res.body.payment.metadata.orderId);
  });

  test("Billplz checkout creates a pending payment and returns the checkout URL", async () => {
    process.env.BILLPLZ_API_KEY = "bp_key";
    process.env.BILLPLZ_COLLECTION_ID = "bp_coll";
    const { token } = await authenticatedCompany();
    const res = await post("/api/billing/checkout", { provider: "billplz", plan: "growth" }, { cookie: `dutaos_session=${token}` });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(billplzCalls, 1);
    assert.equal(res.body.payment.provider, "billplz");
    assert.equal(res.body.payment.plan, "growth");
    assert.equal(res.body.payment.amount, 189900);
    assert.equal(res.body.checkoutUrl, "https://www.billplz.com/api/v3/payments/bp_test_1");
  });

  test("payment history lists only the authenticated company's payments", async () => {
    process.env.HITPAY_API_KEY = "hp_key";
    process.env.HITPAY_SECRET_KEY = "hp_secret";
    const { token: tokenA } = await authenticatedCompany({ email: "A@x.my" });
    const { token: tokenB } = await authenticatedCompany({ email: "B@x.my" });

    await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" }, { cookie: `dutaos_session=${tokenA}` });
    await post("/api/billing/checkout", { provider: "hitpay", plan: "growth" }, { cookie: `dutaos_session=${tokenB}` });

    const resA = await get("/api/billing/payments", { cookie: `dutaos_session=${tokenA}` });
    assert.equal(resA.status, 200);
    assert.equal(resA.body.payments.length, 1);
    assert.equal(resA.body.payments[0].plan, "starter");

    const resB = await get("/api/billing/payments", { cookie: `dutaos_session=${tokenB}` });
    assert.equal(resB.body.payments.length, 1);
    assert.equal(resB.body.payments[0].plan, "growth");
  });

  test("payment history is newest first", async () => {
    process.env.HITPAY_API_KEY = "hp_key";
    process.env.HITPAY_SECRET_KEY = "hp_secret";
    const { token } = await authenticatedCompany();
    const first = await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    const second = await post("/api/billing/checkout", { provider: "hitpay", plan: "growth" }, { cookie: `dutaos_session=${token}` });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const res = await get("/api/billing/payments", { cookie: `dutaos_session=${token}` });
    assert.equal(res.body.payments[0].id, second.body.payment.id);
  });
});

describe("POST /api/payments/webhook/hitpay", () => {
  test("401 with invalid signature", async () => {
    const res = await webhook("/api/payments/webhook/hitpay", JSON.stringify({ order_id: "x", paid: true }), "bad");
    assert.equal(res.status, 401);
    assert.equal(res.body.error, "Invalid signature");
  });

  test("flips payment to paid and activates the company subscription", async () => {
    process.env.HITPAY_API_KEY = "hp_key";
    process.env.HITPAY_SECRET_KEY = "hp_secret";
    const { token } = await authenticatedCompany();
    const checkout = await post("/api/billing/checkout", { provider: "hitpay", plan: "growth" }, { cookie: `dutaos_session=${token}` });
    assert.equal(checkout.status, 200);
    const orderId = checkout.body.payment.metadata.orderId;

    const meBefore = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    assert.equal(meBefore.body.company.subscriptionStatus, "active");
    assert.equal(meBefore.body.company.subscriptionTier, "starter");

    const body = JSON.stringify({ order_id: orderId, paid: true, id: "evt_1" });
    const sig = sign("hp_secret", body);
    const res = await webhook("/api/payments/webhook/hitpay", body, sig);
    assert.equal(res.status, 200);
    assert.equal(res.body.received, true);

    const meAfter = await get("/api/companies", { cookie: `dutaos_session=${token}` });
    assert.equal(meAfter.body.company.subscriptionTier, "growth");
    assert.equal(meAfter.body.company.subscriptionStatus, "active");

    const payments = await get("/api/billing/payments", { cookie: `dutaos_session=${token}` });
    const paid = payments.body.payments.find((p) => p.metadata.orderId === orderId);
    assert.ok(paid);
    assert.equal(paid.status, "paid");
  });

  test("marks payment failed when not paid", async () => {
    process.env.HITPAY_API_KEY = "hp_key";
    process.env.HITPAY_SECRET_KEY = "hp_secret";
    const { token } = await authenticatedCompany();
    const checkout = await post("/api/billing/checkout", { provider: "hitpay", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    const orderId = checkout.body.payment.metadata.orderId;

    const body = JSON.stringify({ order_id: orderId, paid: false, id: "evt_2" });
    const res = await webhook("/api/payments/webhook/hitpay", body, sign("hp_secret", body));
    assert.equal(res.status, 200);

    const payments = await get("/api/billing/payments", { cookie: `dutaos_session=${token}` });
    const failed = payments.body.payments.find((p) => p.metadata.orderId === orderId);
    assert.equal(failed.status, "failed");
  });
});

describe("POST /api/payments/webhook/billplz", () => {
  test("401 with invalid signature", async () => {
    const res = await webhook("/api/payments/webhook/billplz", JSON.stringify({ metadata: { orderId: "x" }, paid: true }), "bad");
    assert.equal(res.status, 401);
  });

  test("flips payment to paid", async () => {
    process.env.BILLPLZ_API_KEY = "bp_key";
    process.env.BILLPLZ_COLLECTION_ID = "bp_coll";
    const { token } = await authenticatedCompany();
    const checkout = await post("/api/billing/checkout", { provider: "billplz", plan: "starter" }, { cookie: `dutaos_session=${token}` });
    assert.equal(checkout.status, 200);
    const orderId = checkout.body.payment.metadata.orderId;

    const body = JSON.stringify({ id: "inv_1", metadata: { orderId }, paid: true });
    const res = await webhook("/api/payments/webhook/billplz", body, sign("bp_key", body));
    assert.equal(res.status, 200);

    const payments = await get("/api/billing/payments", { cookie: `dutaos_session=${token}` });
    const paid = payments.body.payments.find((p) => p.metadata.orderId === orderId);
    assert.ok(paid);
    assert.equal(paid.status, "paid");
  });
});
