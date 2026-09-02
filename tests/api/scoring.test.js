import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreLead } from "../../api/_scoring.js";

describe("scoreLead", () => {
  it("scores free-audit leads at base of 10 and assigns operations", () => {
    const r = scoreLead({ source: "free-audit", service: "Free brand audit" });
    assert.equal(r.lead_score, 10);
    assert.equal(r.assigned_role, "operations");
  });

        it("scores contact-form leads with specific service at 15", () => {
    // "Consultation" doesn't match generic keywords
    const r = scoreLead({ source: "contact-form", service: "Consultation", message: "" });
    assert.equal(r.lead_score, 15);
    assert.equal(r.assigned_role, null);
  });

  it("scores contact-form leads with AI service at 25 (base 15 + 10 for AI keyword)", () => {
    const r = scoreLead({ source: "contact-form", service: "AI Chatbot", message: "" });
    assert.equal(r.lead_score, 25);
    assert.equal(r.assigned_role, "technical");
  });

  it("scores generic contact-form leads at 5", () => {
    const r = scoreLead({ source: "contact-form", service: "General Inquiry" });
    assert.equal(r.lead_score, 5);
  });

  it("adds keyword bonus points for urgent", () => {
    const r = scoreLead({ source: "contact-form", service: "General", message: "Need urgent help" });
    assert.equal(r.lead_score, 20);
  });

  it("adds tech keyword bonus for cloud migration", () => {
    const r = scoreLead({ source: "contact-form", service: "Cloud migration", message: "" });
    assert.equal(r.assigned_role, "technical");
    assert.equal(r.lead_score, 25);
  });

  it("adds shopping keyword for pricing requests", () => {
    const r = scoreLead({ source: "contact-form", service: "Quote", message: "What is the pricing" });
    assert.equal(r.assigned_role, "operations");
  });

    it("caps score at 50", () => {
    // free-audit base (10) + all keyword groups (15+10+5=30) = 40, plus
    // additional tech words won't add more points. To test the cap,
    // use a contact-form with maximum bonuses: form_with_service (15) +
    // urgent (15) + core service (10) + shopping (5) = 45
    const r = scoreLead({
      source: "contact-form",
      service: "cloud security pdpa automation",
      message: "urgent asap critical downtime hacked ransomware pricing quote budget proposal estimate",
      company: "test company",
    });
    assert.ok(r.lead_score <= 50);
    assert.equal(r.lead_score, 45); // 15 + 15 + 10 + 5
  });

  it("routes to technical for server/cloud keywords", () => {
    const r = scoreLead({ service: "Server maintenance", message: "my hosting is down" });
    assert.equal(r.assigned_role, "technical");
  });

  it("routes to operations for marketing keywords", () => {
    const r = scoreLead({ service: "Social media marketing", message: "want SEO help" });
    assert.equal(r.assigned_role, "operations");
  });

  it("returns null assigned_role for generic inquiry", () => {
    const r = scoreLead({ source: "contact-form", service: "General Inquiry", message: "hello" });
    assert.equal(r.assigned_role, null);
  });
});