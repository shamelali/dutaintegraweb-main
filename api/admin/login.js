// ============================================================================
// Admin Login API — Vercel Serverless Function
//
// POST /api/admin/login  { email, password }
// Returns a JWT token on success.
//
// Credentials stored in env var ADMIN_USERS (JSON array) or defaults below.
// JWT_SECRET — secret for signing tokens
// ============================================================================

import { json, corsResponse, hmacSign, verifyAdminToken } from "../_lib.js";

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

function base64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createToken(payload) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const body = base64url(payload);
  const signature = await hmacSign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, req);
  }

  if (!checkLoginRate()) {
    return json({ ok: false, error: "Too many login attempts. Try again in a minute." }, 429, req);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { email, password } = body;

  if (!email || !password) {
    return json({ ok: false, error: "Email and password are required." }, 400, req);
  }

  // Find matching user
  const matchedUser = USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!matchedUser) {
    loginAttempts++;
    return json({ ok: false, error: "Invalid email or password." }, 401, req);
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
  }, 200, req);
}

export { handler as GET, handler as POST };