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

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
