import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeLead, chunkText, foldDaily, foldCompanies, synthesizeBatch } from "../../lib/memory.js";

describe("chunkText", () => {
  it("splits long text deterministically", () => {
    const text = "a\n\n".repeat(5000);
    const chunks = chunkText(text, 100);
    assert.ok(chunks.length > 1);
    assert.equal(chunks[0].id, "c0");
    assert.ok(chunks.every((c) => c.text.length <= 110));
  });
  it("keeps short text as single chunk", () => {
    assert.equal(chunkText("hello").length, 1);
  });
});

describe("canonicalizeLead", () => {
  it("produces markdown with frontmatter provenance", () => {
    const lead = {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Ali",
      email: "ali@example.com",
      company: "Lapango",
      service: "AI Chatbot",
      message: "need urgent help",
      status: "new",
      source: "contact-form",
      lead_score: 30,
      assigned_role: "technical",
      created_at: "2026-09-03T00:00:00.000Z",
    };
    const { markdown, slug, mytDate } = canonicalizeLead(lead);
    assert.ok(markdown.includes("---"));
    assert.ok(markdown.includes("Supabase leads.id=11111111"));
    assert.ok(markdown.includes("Ali"));
    assert.ok(markdown.includes("30"));
    assert.equal(slug, "lapango");
    assert.match(mytDate, /2026-09-0[23]/); // MYT offset may shift 2026-09-03T00Z -> 08:00 MYT
  });
});

describe("foldDaily", () => {
  it("groups by MYT date and computes stats", () => {
    const leads = [
      { name: "A", company: "X", service: "AI", lead_score: 20, assigned_role: "technical", created_at: "2026-09-02T10:00:00+08:00" },
      { name: "B", company: "Y", service: "Cloud", lead_score: 10, assigned_role: "operations", created_at: "2026-09-02T11:00:00+08:00" },
    ];
    const pages = foldDaily(leads);
    assert.equal(pages.length, 1);
    assert.ok(pages[0].markdown.includes("Daily digest"));
    assert.ok(pages[0].markdown.includes("2 leads"));
  });
  it("returns null for empty", () => {
    assert.equal(foldDaily([]), null);
  });
});

describe("foldCompanies", () => {
  it("aggregates by company slug", () => {
    const leads = [
      { name: "A", company: "Lapango", service: "AI", message: "hi", status: "new", lead_score: 15, created_at: new Date().toISOString() },
      { name: "B", company: "Lapango", service: "Cloud", message: "hello", status: "new", lead_score: 10, created_at: new Date().toISOString() },
    ];
    const pages = foldCompanies(leads);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].slug, "lapango");
    assert.ok(pages[0].markdown.includes("Company"));
  });
});

describe("synthesizeBatch", () => {
  it("writes via injected writer (memory)", async () => {
    const writes = new Map();
    const writer = {
      async writeFile(p, c) { writes.set(p, c); },
      async ensureDir() {},
    };
    const leads = [
      { id: "00000000-0000-0000-0000-000000000001", name: "Ali", email: "a@b.com", company: "Lapango", service: "AI", message: "urgent", status: "new", source: "contact-form", lead_score: 25, assigned_role: "technical", created_at: new Date().toISOString() },
    ];
    const res = await synthesizeBatch(leads, writer);
    assert.ok(res.leadWrites >= 1);
    assert.ok(res.companyWrites >= 1);
    assert.ok(res.dailyWrites >= 1);
    // path uses base config.memoryVaultPath default memory/vault
    assert.ok([...writes.keys()].some((k) => k.includes("memory/vault/leads/")));
    assert.ok([...writes.keys()].some((k) => k.includes("memory/vault/companies/lapango.md")));
    assert.ok([...writes.keys()].some((k) => k.includes("memory/vault/daily/")));
  });
});
