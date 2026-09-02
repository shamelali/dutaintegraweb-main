// ============================================================================
// Lead scoring + role assignment heuristics (P0 automation).
//
// Pure, dependency-free module so it can be shared by every lead-entry point:
//   - api/admin/leads.js  → POST /api/admin/leads (contact form)
//   - api/audit.js        → free-audit lead upsert
//
// Nets out to: base score by source → keyword boosts → cap → routing hint for
// the two ops roles (technical = Shamel, operations = Amar).
// ============================================================================

const SCORE = {
  cap: 50,
  base: {
    free_audit: 10,
    form_with_service: 15,
    form_generic: 5,
  },
  keywords: [
    // High-signal, buy-now urgency
    { points: 15, words: ["urgent", "asap", "downtime", "breach", "hacked", "ransomware", "emergency", "critical", "crash"] },
    // Core service interest
    { points: 10, words: ["ai", "chatbot", "automation", "rpa", "migrat", "cloud", "security", "pdpa", "website", "web app", "integration", "crm"] },
    // Shopping signals
    { points: 5, words: ["quote", "pricing", "cost", "budget", "proposal", "estimate"] },
  ],
};

const TECHNICAL_WORDS = [
  "server", "cloud", "migrat", "dev", "deploy", "website", "bug", "ai", "chatbot",
  "automation", "rpa", "security", "pdpa", "hack", "breach", "network", "email",
  "hosting", "backup", "hardware", "firewall", "incident", "code", "crm",
  "integration", "database", "sql", "vpn", "linux", "docker", "uptime",
];

const OPERATIONS_WORDS = [
  "pricing", "quote", "contract", "billing", "invoice", "support", "branding",
  "social", "marketing", "logo", "copy", "advertis", "seo", "training",
  "warranty", "renewal", "onboard", "process", "sla", "salary", "payment",
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary match on a space-padded haystack: "ai" won't match inside "email".
function hasAny(hay, words) {
  const text = ` ${String(hay || "").toLowerCase()} `;
  return words.some(
    (w) => new RegExp(`[^a-z0-9]${escapeRe(w)}[^a-z0-9]`, "i").test(text)
  );
}

/**
 * @param {{source?:string, service?:string, message?:string, company?:string}} lead
 * @returns {{ lead_score:number, assigned_role:string|null }}
 */
export function scoreLead({ source, service, message, company } = {}) {
  const serviceTxt = String(service || "").trim();
  const generic = !serviceTxt || /general|inquiry|n\/a|none/i.test(serviceTxt);

  let lead_score;
  if (source === "free-audit") lead_score = SCORE.base.free_audit;
  else if (!generic) lead_score = SCORE.base.form_with_service;
  else lead_score = SCORE.base.form_generic;

  const hay = `${serviceTxt} ${String(message || "")} ${String(company || "")}`;
  for (const rule of SCORE.keywords) {
    if (hasAny(hay, rule.words)) lead_score += rule.points;
  }
  lead_score = Math.max(0, Math.min(SCORE.cap, lead_score));

  let assigned_role = null;
  if (source === "free-audit") {
    assigned_role = "operations"; // audit follow-ups are Amar's lane
  } else if (hasAny(hay, TECHNICAL_WORDS)) {
    assigned_role = "technical";
  } else if (hasAny(hay, OPERATIONS_WORDS)) {
    assigned_role = "operations";
  }

  return { lead_score, assigned_role };
}