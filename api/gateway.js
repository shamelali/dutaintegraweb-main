// Single Vercel serverless entrypoint for all dynamic routes. vercel.json
// rewrites /api/send-email, /api/health, and /admin/enquiries here — req.url
// is preserved by the rewrite, so `handle()`'s own pathname-based routing
// (unchanged, unit-tested in server/handler.test.mjs) picks the right branch.
//
// Static files under Web/ are served directly by Vercel, not through this
// function — see vercel.json.
export { handle as default } from "../server/handler.mjs";

export const config = { runtime: "nodejs" };
