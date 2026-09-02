#!/usr/bin/env node
// scripts/health-check.js — local smoke test for autonomous ops
const base = process.env.HEALTH_URL || "http://localhost:3000";
async function check(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    console.log(`${res.status} ${path} -> ${body.slice(0, 200)}`);
    return res.ok;
  } catch (e) {
    console.error(`FAIL ${path}: ${e.message}`);
    return false;
  }
}
await check("/api/health");
await check("/api/products");
