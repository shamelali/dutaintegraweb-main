// Shared Supabase client + small helpers for Duta Integra API routes.
// Prefers SUPABASE_SERVICE_ROLE_KEY for server-side writes (bypasses RLS);
// falls back to the publishable/anon key so existing setups keep working.
// A service key that doesn't look like a Supabase key (legacy "eyJ…" JWT or
// new-style "sb_secret_…") is ignored rather than poisoning every request.

import { createClient } from "@supabase/supabase-js";

function plausibleSecret(key) {
  return !!key && (key.startsWith("eyJ") || key.startsWith("sb_secret_"));
}

export function getSupabase() {
  const url = process.env.SUPABASE_URL || "";
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  const key = plausibleSecret(role) ? role : anon;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://dutaintegra.my",
  "https://www.dutaintegra.my",
  "https://dutaintegraweb-main-mpjnmndfb-shamelalis-projects.vercel.app",
  "https://dutaintegraweb-main-efunpqs0m-shamelalis-projects.vercel.app",
];

function getAllowedOrigin(req) {
  const origin = req?.headers?.get?.("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

export function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": getAllowedOrigin(req),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    },
  });
}

export function corsResponse(req) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getAllowedOrigin(req),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    },
  });
}

const JWT_SECRET =
  process.env.JWT_SECRET || "duta-integra-admin-secret-change-in-production";

function b64urlToObj(part) {
  return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
}

export async function verifyAdminToken(token) {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expected = await hmacSign(`${header}.${body}`);
    if (signature !== expected) return null;
    const payload = b64urlToObj(body);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hmacSign(data, secret = JWT_SECRET) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function sanitize(str, max = 500) {
  return String(str ?? "").trim().slice(0, max);
}

// URL-safe random id (Crockford-ish base32, no ambiguous chars)
export function makeId(len = 10) {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Rate limiting helper (in-memory with cleanup)
const rateLimitStores = new Map();

export function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  return function checkRateLimit(req) {
    const ip = req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
               req?.headers?.get?.("cf-connecting-ip") ||
               "unknown";
    const now = Date.now();
    const store = rateLimitStores.get(ip) || [];
    const validRequests = store.filter(t => now - t < windowMs);
    
    if (validRequests.length >= maxRequests) {
      rateLimitStores.set(ip, validRequests);
      return false;
    }
    
    validRequests.push(now);
    rateLimitStores.set(ip, validRequests);
    
    // Periodic cleanup
    if (rateLimitStores.size > 10000) {
      for (const [k, v] of rateLimitStores) {
        if (!v.some(t => now - t < windowMs)) rateLimitStores.delete(k);
      }
    }
    
    return true;
  };
}

// SSRF protection - check if hostname is private/internal
export function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("fe80:") || host.startsWith("fc:") || host.startsWith("fd:")) return true;
  if (/^\[?::/.test(host)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

// Health check helper
export function healthCheck() {
  return { status: "healthy", timestamp: new Date().toISOString(), uptime: process.uptime() };
}
