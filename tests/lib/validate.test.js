import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHTML, isEmail, validateContactPayload } from "../../api/lib/validate.js";
import { isPrivateHost } from "../../api/lib/security.js";
import { scoreLead } from "../../api/_scoring.js";

describe("sanitizeHTML", () => {
  it("escapes XSS payload", () => {
    assert.equal(sanitizeHTML(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
    assert.equal(sanitizeHTML(`a & b`), "a &amp; b");
    assert.equal(sanitizeHTML(`"x" 'y'`), "&quot;x&quot; &#039;y&#039;");
  });
});

describe("isEmail", () => {
  it("validates", () => {
    assert.equal(isEmail("hello@dutaintegra.my"), true);
    assert.equal(isEmail("bad@"), false);
    assert.equal(isEmail(""), false);
  });
});

describe("validateContactPayload", () => {
  it("rejects missing required", () => {
    const { valid, errors } = validateContactPayload({ name: "", email: "a@b.com", service: "" });
    assert.equal(valid, false);
    assert.ok(errors.length > 0);
  });
  it("accepts good payload", () => {
    const { valid } = validateContactPayload({ name: "Ali", email: "a@b.com", service: "AI", message: "hi" });
    assert.equal(valid, true);
  });
});

describe("isPrivateHost", () => {
  it("blocks private", () => {
    assert.equal(isPrivateHost("localhost"), true);
    assert.equal(isPrivateHost("192.168.1.1"), true);
    assert.equal(isPrivateHost("10.0.0.1"), true);
    assert.equal(isPrivateHost("dutaintegra.my"), false);
  });
});

describe("scoreLead", () => {
  it("scores free-audit", () => {
    const r = scoreLead({ source: "free-audit", service: "Free brand audit" });
    assert.ok(r.lead_score >= 10);
    assert.equal(r.assigned_role, "operations");
  });
  it("routes technical", () => {
    const r = scoreLead({ service: "Cloud migration", message: "need kubernetes" });
    assert.equal(r.assigned_role, "technical");
  });
});
