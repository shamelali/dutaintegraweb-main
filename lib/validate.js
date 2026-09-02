// api/lib/validate.js — shared validation helpers (no deps)

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function sanitize(str, max = 500) {
  return String(str ?? "").trim().slice(0, max);
}

export function sanitizeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function validateContactPayload(raw = {}) {
  const name = sanitize(raw.name, 120);
  const company = sanitize(raw.company, 160);
  const email = sanitize(raw.email, 160);
  const phone = sanitize(raw.phone, 40);
  const service = sanitize(raw.service, 120);
  const message = sanitize(raw.message, 5000);
  const errors = [];
  if (!name) errors.push("Name is required");
  if (!service) errors.push("Service is required");
  if (!email) errors.push("Email is required");
  else if (!isEmail(email)) errors.push("Invalid email address");
  return { values: { name, company, email, phone, service, message }, errors, valid: errors.length === 0 };
}

export function clampInt(n, min, max, fallback) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : fallback;
}
