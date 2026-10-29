import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  backendStatus,
  resolveBackend,
  usingSupabase,
  supabaseReady,
  supabaseFetch,
  resetBackendWarnings,
  StorageConfigError,
} from "./store.mjs";
import { recordEnquiry } from "./enquiries.mjs";
import { recordTestimonial } from "./testimonials.mjs";

const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NODE_ENV",
  "ENQUIRY_STORE",
  "TESTIMONIAL_STORE",
];

let saved;
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  resetBackendWarnings();
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function configurePair() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-value";
}

test("resolveBackend: both unset outside production selects jsonl", () => {
  assert.equal(resolveBackend(), "jsonl");
});

test("resolveBackend: warns about the jsonl fallback exactly once per process", () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    resolveBackend();
    resolveBackend();
    resolveBackend();
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /data\//);
});

test("resolveBackend: URL without the key is a hard error, not a silent fallback", () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  assert.throws(() => resolveBackend(), StorageConfigError);
  assert.throws(() => resolveBackend(), /must both be set or both be unset/);
});

test("resolveBackend: key without URL is a hard error", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-value";
  assert.throws(() => resolveBackend(), StorageConfigError);
});

test("a partial pair errors in development too, not only in production", () => {
  process.env.NODE_ENV = "development";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  assert.throws(() => resolveBackend(), StorageConfigError);
});

test("resolveBackend: whitespace-only values count as unset", () => {
  process.env.SUPABASE_URL = "   ";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-value";
  assert.throws(() => resolveBackend(), StorageConfigError);
});

test("resolveBackend: both set selects supabase", () => {
  configurePair();
  assert.equal(resolveBackend(), "supabase");
  assert.equal(usingSupabase(), true);
  assert.equal(supabaseReady(), true);
});

test("resolveBackend: unconfigured in production is a hard error", () => {
  process.env.NODE_ENV = "production";
  assert.throws(() => resolveBackend(), /No storage backend configured/);
});

test("the production refusal does not fire when Supabase is configured", () => {
  process.env.NODE_ENV = "production";
  configurePair();
  assert.equal(resolveBackend(), "supabase");
});

test("backendStatus reports the error text instead of throwing", () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  const status = backendStatus();
  assert.equal(status.backend, null);
  assert.match(status.error, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("supabaseReady is non-throwing, for route guards answering 503", () => {
  process.env.NODE_ENV = "production";
  assert.equal(supabaseReady(), false);
  assert.doesNotThrow(() => supabaseReady());
});

test("supabaseFetch refuses to reach the database while jsonl is active", async () => {
  await assert.rejects(() => supabaseFetch("leads?select=id"), StorageConfigError);
});

test("a Supabase write failure propagates and does not fall back to the file", async () => {
  configurePair();
  const dir = await mkdtemp(join(tmpdir(), "di-store-"));
  const storeFile = join(dir, "enquiries.jsonl");
  process.env.ENQUIRY_STORE = storeFile;

  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("quota exceeded", { status: 507 });
  try {
    await assert.rejects(
      () => recordEnquiry({ name: "Aminah", email: "a@example.my", service: "AI" }),
      /507/,
    );
  } finally {
    globalThis.fetch = original;
  }

  await assert.rejects(() => readFile(storeFile, "utf8"), { code: "ENOENT" });
});

test("a successful Supabase write goes to the database, not the file", async () => {
  configurePair();
  const dir = await mkdtemp(join(tmpdir(), "di-store-"));
  const storeFile = join(dir, "enquiries.jsonl");
  process.env.ENQUIRY_STORE = storeFile;

  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    return new Response("[]", { status: 201, headers: { "content-type": "application/json" } });
  };
  try {
    const record = await recordEnquiry({ name: "Aminah", email: "a@example.my", service: "AI" });
    assert.equal(record.name, "Aminah");
  } finally {
    globalThis.fetch = original;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/leads$/);
  assert.equal(calls[0].method, "POST");
  await assert.rejects(() => readFile(storeFile, "utf8"), { code: "ENOENT" });
});

test("a testimonial write reaches the testimonials table, not the file", async () => {
  configurePair();
  const dir = await mkdtemp(join(tmpdir(), "di-testimonial-"));
  const storeFile = join(dir, "testimonials.jsonl");
  process.env.TESTIMONIAL_STORE = storeFile;

  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    return new Response("[]", { status: 201, headers: { "content-type": "application/json" } });
  };
  try {
    const record = await recordTestimonial({
      client: "Mokhtar Trading Sdn Bhd",
      quote: "Half the ticket backlog gone.",
      author: "Ahmad Mokhtar",
    });
    assert.equal(record.client, "Mokhtar Trading Sdn Bhd");
  } finally {
    globalThis.fetch = original;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/testimonials$/);
  assert.equal(calls[0].method, "POST");
  await assert.rejects(() => readFile(storeFile, "utf8"), { code: "ENOENT" });
});

test("a failed testimonial write surfaces instead of landing in the file", async () => {
  configurePair();
  const dir = await mkdtemp(join(tmpdir(), "di-testimonial-fail-"));
  const storeFile = join(dir, "testimonials.jsonl");
  process.env.TESTIMONIAL_STORE = storeFile;

  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("database unavailable", { status: 500 });
  try {
    await assert.rejects(
      () => recordTestimonial({ client: "Nobody Trading", quote: "q", author: "A. Nobody" }),
      /testimonial write failed: 500/,
    );
  } finally {
    globalThis.fetch = original;
  }
  await assert.rejects(() => readFile(storeFile, "utf8"), { code: "ENOENT" });
});

test("a half-configured backend refuses a testimonial write instead of choosing the file", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  const dir = await mkdtemp(join(tmpdir(), "di-testimonial-half-"));
  const storeFile = join(dir, "testimonials.jsonl");
  process.env.TESTIMONIAL_STORE = storeFile;

  await assert.rejects(
    () => recordTestimonial({ client: "Nobody Trading", quote: "q", author: "A. Nobody" }),
    StorageConfigError,
  );
  await assert.rejects(() => readFile(storeFile, "utf8"), { code: "ENOENT" });
});
