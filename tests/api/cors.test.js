import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAllowedOrigin, corsHeaders } from "../../lib/cors.js";

function reqWithOrigin(o) {
  return { headers: { get: (k) => (k === "origin" ? o : null) } };
}

describe("getAllowedOrigin", () => {
  it("returns allowed origin exact match", () => {
    const r = reqWithOrigin("https://dutaintegra.my");
    assert.equal(getAllowedOrigin(r), "https://dutaintegra.my");
  });

  it("returns www variant", () => {
    const r = reqWithOrigin("https://www.dutaintegra.my");
    assert.equal(getAllowedOrigin(r), "https://www.dutaintegra.my");
  });

  it("falls back to primary for evil suffix", () => {
    const r = reqWithOrigin("https://dutaintegra.my.evil.com");
    assert.notEqual(getAllowedOrigin(r), "https://dutaintegra.my.evil.com");
  });

  it("falls back to primary when origin is null", () => {
    const r = reqWithOrigin(null);
    const result = getAllowedOrigin(r);
    assert.equal(result, "https://dutaintegra.my");
  });

  it("falls back to primary for disallowed origin", () => {
    const r = reqWithOrigin("https://evil.com");
    const result = getAllowedOrigin(r);
    assert.equal(result, "https://dutaintegra.my");
  });

  // Note: Vercel preview URL testing depends on NODE_ENV timing due to
  // ESM module caching. This test verifies the core origin-matching security.
  it("blocks subdomain spoofing (evil suffix attack)", () => {
    // Attack: spoofing a subdomain of a trusted origin
    const r = reqWithOrigin("https://dutaintegra.my.malicious-site.com");
    const result = getAllowedOrigin(r);
    assert.notEqual(result, "https://dutaintegra.my.malicious-site.com");
    assert.equal(result, "https://dutaintegra.my");
  });
});

describe("corsHeaders", () => {
  it("includes Access-Control-Allow-Origin", () => {
    const r = reqWithOrigin("https://dutaintegra.my");
    const headers = corsHeaders(r);
    assert.equal(headers["Access-Control-Allow-Origin"], "https://dutaintegra.my");
  });

  it("includes Vary header", () => {
    const r = reqWithOrigin("https://dutaintegra.my");
    const headers = corsHeaders(r);
    assert.equal(headers["Vary"], "Origin");
  });

  it("includes standard CORS headers", () => {
    const r = reqWithOrigin(null);
    const headers = corsHeaders(r);
    assert.equal(headers["Access-Control-Allow-Methods"], "GET, POST, PATCH, DELETE, OPTIONS");
    assert.equal(headers["Access-Control-Allow-Headers"], "Content-Type, Authorization");
    assert.equal(headers["Access-Control-Allow-Credentials"], "true");
  });
});
