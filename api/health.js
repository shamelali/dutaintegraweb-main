// Health check endpoint for monitoring and load balancers
// GET /api/health -> { status: "healthy", timestamp, uptime, version }

import { json, corsResponse, healthCheck } from "./_lib.js";

export const config = { maxDuration: 10 };

async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, req);
  }
  
  const health = healthCheck();
  health.version = process.env.npm_package_version || "1.0.0";
  health.env = process.env.NODE_ENV || "production";
  
  return json(health, 200, req);
}

export { handler as GET };