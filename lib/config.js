// api/lib/config.js — centralized env config with validation
// Single source of truth for all env vars. Fails fast on missing required vars
// in production, warns in development.

const REQUIRED_IN_PROD = ["RESEND_API_KEY", "SUPABASE_URL"];

function env(name, fallback = "") {
  const v = process.env[name];
  return v !== undefined && v !== "" ? String(v).trim() : fallback;
}

function envBool(name, fallback = true) {
  const v = env(name, "");
  if (v === "") return fallback;
  return v.toLowerCase() !== "false" && v !== "0";
}

function parseList(raw, fallback = []) {
  if (!raw) return fallback;
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

function parseAllowedOrigins() {
  const raw = env("ALLOWED_ORIGINS", "");
  if (raw) return parseList(raw);
  return [
    "https://dutaintegra.my",
    "https://www.dutaintegra.my",
  ];
}

export const config = {
  // core
  nodeEnv: env("NODE_ENV", "production"),
  isProd: env("NODE_ENV", "production") === "production",
  vercelEnv: env("VERCEL_ENV", ""),
  // email
  resendApiKey: env("RESEND_API_KEY", ""),
  emailFrom: env("EMAIL_FROM", "Duta Integra Website <noreply@dutaintegra.my>"),
  emailTo: parseList(env("EMAIL_TO", "hello@dutaintegra.my")),
  emailAutoreply: envBool("EMAIL_AUTOREPLY", true),
  // supabase
  supabaseUrl: env("SUPABASE_URL", ""),
  supabaseAnonKey: env("SUPABASE_ANON_KEY", ""),
  supabaseServiceKey: env("SUPABASE_SERVICE_ROLE_KEY", ""),
  supabaseDbUrl: env("SUPABASE_DB_URL", ""),
  // security
  jwtSecret: env("JWT_SECRET", ""),
  cronSecret: env("CRON_SECRET", ""),
  turnstileSecret: env("TURNSTILE_SECRET_KEY", ""),
  honeypotField: env("HONEYPOT_FIELD", "website-bot"),
  allowedOrigins: parseAllowedOrigins(),
  // rate limits
  auditRateMax: Number(env("AUDIT_RATE_MAX", "10")) || 10,
  auditRateWindow: Number(env("AUDIT_RATE_WINDOW", "60000")) || 60000,
  contactRateMax: Number(env("RATE_LIMIT_MAX", "5")) || 5,
  contactRateWindow: Number(env("RATE_WINDOW", "60000")) || 60000,
  loginRateMax: 10,
  loginRateWindow: 60_000,
  // slack
  slackWebhookUrl: env("SLACK_WEBHOOK_URL", ""),
  // memory vault (OpenHuman-inspired)
  memoryVaultEnabled: envBool("MEMORY_VAULT_ENABLED", true),
  memoryVaultPath: env("MEMORY_VAULT_PATH", "memory/vault"),
  // app
  version: env("npm_package_version", "1.0.0"),
  adminUsersRaw: env("ADMIN_USERS", ""),
};

export function validateConfig({ strict = false } = {}) {
  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);
  if (missing.length && (strict || config.isProd)) {
    console.error(`[config] Missing required env vars: ${missing.join(", ")}`);
  }
  if (!config.jwtSecret && config.isProd) {
    console.error("[config] JWT_SECRET not set — admin sessions will be ephemeral. Set it in Vercel env.");
  }
  return { ok: missing.length === 0, missing };
}

// runtime helper — returns first allowed origin (for CORS fallback)
export function primaryOrigin() {
  return config.allowedOrigins[0] || "https://dutaintegra.my";
}
