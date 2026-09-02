// api/_lib.js — backward-compatible facade over api/lib/*
// Keeps existing import paths working while routing to the enterprise modules.
// New code should import directly from api/lib/<module>.js

export { config } from "../lib/config.js";
export { logger } from "../lib/logger.js";
export { AppError, toHttpError, errorBody } from "../lib/errors.js";

// Supabase
export { getSupabase, getAnonSupabase, getAdminSupabase, pingSupabase } from "../lib/supabase.js";

// CORS
export { getAllowedOrigin, json, corsResponse, corsHeaders } from "../lib/cors.js";

// Auth
export { hmacSign, verifyAdminToken, getAuthUser, createToken, isCronAuthorized } from "../lib/auth.js";

// Validation
export { sanitize, sanitizeHTML, isEmail, validateContactPayload } from "../lib/validate.js";

// Security
export { isPrivateHost, timingSafeEqual } from "../lib/security.js";

// Rate limit — provide legacy signature createRateLimiter(max, windowMs)
import { createRateLimiter as _newLimiter } from "../lib/rate-limit.js";
export function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  return _newLimiter({ maxRequests, windowMs, keyPrefix: `legacy:${maxRequests}:${windowMs}` });
}

// Misc utilities kept here (stable, no deps)
export function makeId(len = 10) {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function healthCheck() {
  return { status: "healthy", timestamp: new Date().toISOString(), uptime: typeof process !== "undefined" && process.uptime ? process.uptime() : undefined };
}

export function cronJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Slack — re-export from lib/slack (soft-fail, retry)
export { postToSlack } from "../lib/slack.js";
