// api/lib/rate-limit.js — sliding-window limiter (per warm instance)
// For serverless Hobby, in-memory is best-effort per isolate. For true global
// limiting, swap the store to Upstash Redis / Vercel KV via env flag.

const stores = new Map(); // key: ip -> number[] timestamps

export function createRateLimiter({ maxRequests = 10, windowMs = 60000, keyPrefix = "rl" } = {}) {
  const storeKey = `_rl:${keyPrefix}`;
  if (!stores.has(storeKey)) stores.set(storeKey, new Map());
  const store = stores.get(storeKey);

  function check(req) {
    const ip =
      req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers?.get?.("cf-connecting-ip") ||
      req?.headers?.get?.("x-real-ip") ||
      "unknown";
    const now = Date.now();
    const arr = store.get(ip) || [];
    const valid = arr.filter((t) => now - t < windowMs);
    if (valid.length >= maxRequests) {
      store.set(ip, valid);
      return false;
    }
    valid.push(now);
    store.set(ip, valid);
    if (store.size > 8000) {
      for (const [k, v] of store) {
        if (!v.some((t) => now - t < windowMs)) store.delete(k);
      }
    }
    return true;
  }

  // global throttle (for /api/track style)
  return check;
}

// singleton global throttle for high-volume endpoints
let globalHits = 0;
let globalWindowStart = Date.now();
export function globalThrottle({ max = 600, windowMs = 60000 } = {}) {
  return () => {
    const now = Date.now();
    if (now - globalWindowStart > windowMs) { globalHits = 0; globalWindowStart = now; }
    return ++globalHits <= max;
  };
}
