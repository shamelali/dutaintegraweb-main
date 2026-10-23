import { handleApi } from "../../server/handler-cloudflare.mjs";

export async function onRequest(context) {
  const { request, env, params } = context;
  
  // Set environment variables from Cloudflare Pages env
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
  
  return handleApi(request);
}