import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateContactPayload, sanitizeHTML, isEmail } from "../../lib/validate.js";
import { scoreLead } from "../../api/_scoring.js";

describe("send-email handler (unit tests)", () => {
  describe("validateContactPayload", () => {
    it("accepts a valid contact payload", () => {
      const { valid, values } = validateContactPayload({
        name: "Ali",
        email: "ali@example.com",
        service: "AI Chatbot",
        message: "Need help",
      });
      assert.equal(valid, true);
      assert.equal(values.name, "Ali");
      assert.equal(values.email, "ali@example.com");
      assert.equal(values.service, "AI Chatbot");
    });

    it("rejects missing name", () => {
      const { valid, errors } = validateContactPayload({
        name: "",
        email: "ali@example.com",
        service: "AI",
      });
      assert.equal(valid, false);
      assert.ok(errors.includes("Name is required"));
    });

    it("rejects missing email", () => {
      const { valid, errors } = validateContactPayload({
        name: "Ali",
        email: "",
        service: "AI",
      });
      assert.equal(valid, false);
      assert.ok(errors.includes("Email is required"));
    });

    it("rejects missing service", () => {
      const { valid, errors } = validateContactPayload({
        name: "Ali",
        email: "ali@example.com",
        service: "",
      });
      assert.equal(valid, false);
      assert.ok(errors.includes("Service is required"));
    });

    it("rejects invalid email format", () => {
      const { valid, errors } = validateContactPayload({
        name: "Ali",
        email: "not-an-email",
        service: "AI",
      });
      assert.equal(valid, false);
      assert.ok(errors.includes("Invalid email address"));
    });

    it("trims whitespace from fields", () => {
      const { valid, values } = validateContactPayload({
        name: "  Ali  ",
        email: "  ali@example.com  ",
        service: "AI",
      });
      assert.equal(valid, true);
      assert.equal(values.name, "Ali");
      assert.equal(values.email, "ali@example.com");
    });

    it("truncates overly long fields", () => {
      const longName = "A".repeat(200);
      const { values } = validateContactPayload({
        name: longName,
        email: "ali@example.com",
        service: "AI",
      });
      assert.equal(values.name.length, 120);
    });
  });

  describe("sanitizeHTML (used in Slack notifications)", () => {
    it("escapes script tags", () => {
      assert.equal(sanitizeHTML(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("escapes ampersands", () => {
      assert.equal(sanitizeHTML(`a & b`), "a &amp; b");
    });

    it("escapes quotes", () => {
      assert.equal(sanitizeHTML(`"x" 'y'`), "&quot;x&quot; &#039;y&#039;");
    });

    it("handles null/undefined", () => {
      assert.equal(sanitizeHTML(null), "");
      assert.equal(sanitizeHTML(undefined), "");
    });
  });

  describe("isEmail", () => {
    it("validates correct emails", () => {
      assert.equal(isEmail("hello@dutaintegra.my"), true);
      assert.equal(isEmail("ali@example.com"), true);
    });

    it("rejects invalid emails", () => {
      assert.equal(isEmail("not-an-email"), false);
      assert.equal(isEmail(""), false);
      assert.equal(isEmail(null), false);
    });
  });

  describe("scoreLead integration", () => {
    it("scores contact-form leads and assigns role", () => {
      const result = scoreLead({ source: "contact-form", service: "AI Chatbot", message: "" });
      assert.ok(typeof result.lead_score === "number");
      assert.ok(["technical", "operations", null].includes(result.assigned_role));
    });

    it("scores free-audit leads at operations role", () => {
      const result = scoreLead({ source: "free-audit", service: "Free brand audit" });
      assert.equal(result.assigned_role, "operations");
    });

    it("routes cloud migration to technical", () => {
      const result = scoreLead({ service: "Cloud migration", message: "need kubernetes" });
      assert.equal(result.assigned_role, "technical");
    });
  });

  describe("handler exports", () => {
    it("exports both GET and POST handlers", async () => {
      const mod = await import("../../api/send-email.js");
      assert.equal(typeof mod.GET, "function");
      assert.equal(typeof mod.POST, "function");
      assert.equal(mod.GET, mod.POST);
    });
  });
});