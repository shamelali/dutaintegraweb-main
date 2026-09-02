// api/lib/logger.js — structured JSON logger for autonomous ops
// Usage: logger.info("event", { requestId, ...meta }); logs to stdout as JSON
// Vercel log drains can ingest this; no external dep required.

function baseFields() {
  return {
    ts: new Date().toISOString(),
    service: "dutaintegra-api",
    vercelEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || "production",
  };
}

function log(level, msg, meta = {}) {
  const entry = { level, msg, ...baseFields(), ...meta };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, meta) => log("debug", msg, meta),
  info:  (msg, meta) => log("info", msg, meta),
  warn:  (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  // convenience: log with request context
  withRequest: (req) => {
    const requestId = req?.headers?.get?.("x-vercel-id") || req?.headers?.get?.("x-request-id") || crypto.randomUUID().slice(0, 8);
    return {
      requestId,
      debug: (m, meta) => log("debug", m, { requestId, ...meta }),
      info:  (m, meta) => log("info",  m, { requestId, ...meta }),
      warn:  (m, meta) => log("warn",  m, { requestId, ...meta }),
      error: (m, meta) => log("error", m, { requestId, ...meta }),
    };
  }
};
