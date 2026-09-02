// api/lib/auth.js — JWT HS256 with constant-time compare
import { config } from "./config.js";
import { timingSafeEqual } from "./security.js";

function ephemeralSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

let _secret = config.jwtSecret;
if (!_secret) {
  console.warn("[auth] JWT_SECRET not set — using ephemeral secret (sessions will not survive restarts). Set it in production.");
  _secret = ephemeralSecret();
}

function b64urlEncode(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(part) {
  return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
}

export async function hmacSign(data, secret = _secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createToken(payload, { expiresInMs = 24 * 3600 * 1000 } = {}) {
  const header = b64urlEncode({ alg: "HS256", typ: "JWT" });
  const body = b64urlEncode({ ...payload, iat: Date.now(), exp: Date.now() + expiresInMs });
  const sig = await hmacSign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyAdminToken(token) {
  try {
    const [header, body, signature] = String(token || "").split(".");
    if (!header || !body || !signature) return null;
    const expected = await hmacSign(`${header}.${body}`);
    if (!timingSafeEqual(signature, expected)) return null;
    const payload = b64urlDecode(body);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function isCronAuthorized(req) {
  if (req?.headers?.get?.("x-vercel-cron")) return true;
  const auth = req?.headers?.get?.("authorization") || "";
  const secret = config.cronSecret;
  return !!secret && timingSafeEqual(auth, `Bearer ${secret}`);
}
