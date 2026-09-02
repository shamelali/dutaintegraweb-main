// api/lib/cors.js
import { config, primaryOrigin } from "./config.js";

export function getAllowedOrigin(req) {
  const origin = req?.headers?.get?.("origin") || "";
  if (!origin) return primaryOrigin();
  if (config.allowedOrigins.includes(origin)) return origin;
  // allow Vercel preview deploys in non-production (configurable via ALLOWED_ORIGINS)
  if (!config.isProd && origin.endsWith(".vercel.app")) return origin;
  // also allow if ALLOWED_ORIGINS contains a wildcard pattern (e.g. https://*.vercel.app)
  for (const pattern of config.allowedOrigins) {
    if (pattern.includes("*")) {
      const re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
      if (re.test(origin)) return origin;
    }
  }
  return primaryOrigin();
}

export function isOriginAllowed(req) {
  const origin = req?.headers?.get?.("origin") || "";
  if (!origin) return true; // same-origin / non-browser callers
  return getAllowedOrigin(req) === origin || (!config.isProd && origin.endsWith(".vercel.app"));
}

export function corsHeaders(req, { methods = "GET, POST, PATCH, DELETE, OPTIONS" } = {}) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export function json(data, status = 200, req, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(req),
      ...extraHeaders,
    },
  });
}

export function corsResponse(req, methods) {
  return new Response(null, { status: 204, headers: corsHeaders(req, { methods }) });
}
