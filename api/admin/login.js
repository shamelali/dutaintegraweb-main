// ============================================================================
// Admin Login API — Vercel Serverless Function
//
// POST /api/admin/login  { email, password }
// Returns a JWT token on success.
//
// Credentials stored in env var ADMIN_USERS (JSON array) or defaults below.
// JWT_SECRET — secret for signing tokens
// ============================================================================

export const config = { maxDuration: 10 };

const DEFAULT_USERS = [
  { email: "shamel@dutaintegra.my", password: "Duta7777@", name: "Shamel", role: "technical" },
  { email: "wasilah@dutaintegra.my", password: "Duta7777@", name: "Amar", role: "operations" },
];

let USERS = DEFAULT_USERS;
try {
  if (process.env.ADMIN_USERS) {
    USERS = JSON.parse(process.env.ADMIN_USERS);
  }
} catch { /* fall back to defaults */ }

const JWT_SECRET = process.env.JWT_SECRET || "duta-integra-admin-secret-change-in-production";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Simple HMAC-SHA256 for JWT signing (no external deps)
async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createToken(payload) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const body = base64url(payload);
  const signature = await hmacSign(`${header}.${body}`, JWT_SECRET);
  return `${header}.${body}.${signature}`;
}

async function verifyToken(token) {
  try {
    const [header, body, signature] = token.split(".");
    const expected = await hmacSign(`${header}.${body}`, JWT_SECRET);
    if (signature !== expected) return null;
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Rate limiting
let loginAttempts = 0;
let loginReset = Date.now();
function checkLoginRate() {
  const now = Date.now();
  if (now - loginReset > 60000) {
    loginAttempts = 0;
    loginReset = now;
  }
  return loginAttempts < 10;
}

async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!checkLoginRate()) {
    return json({ ok: false, error: "Too many login attempts. Try again in a minute." }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { email, password } = body;

  if (!email || !password) {
    return json({ ok: false, error: "Email and password are required." }, 400);
  }

  // Find matching user
  const matchedUser = USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!matchedUser) {
    loginAttempts++;
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }

  // Create token (expires in 24 hours)
  const token = await createToken({
    sub: matchedUser.email,
    name: matchedUser.name,
    role: matchedUser.role,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });

  return json({
    ok: true,
    token,
    user: { email: matchedUser.email, name: matchedUser.name, role: matchedUser.role },
  });
}

export { handler as GET, handler as POST };
