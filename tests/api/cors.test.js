import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAllowedOrigin } from "../../api/lib/cors.js";

function reqWithOrigin(o) { return { headers: { get: (k) => k === "origin" ? o : null } }; }

describe("getAllowedOrigin", () => {
  it("returns allowed origin exact match", () => {
    const r = reqWithOrigin("https://dutaintegra.my");
    assert.equal(getAllowedOrigin(r), "https://dutaintegra.my");
  });
  it("falls back to primary for evil suffix", () => {
    const r = reqWithOrigin("https://dutaintegra.my.evil.com");
    assert.notEqual(getAllowedOrigin(r), "https://dutaintegra.my.evil.com");
  });
});
