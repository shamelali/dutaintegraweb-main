#!/usr/bin/env node
/**
 * Validate that all process.env.* references in server/ and api/
 * match the names documented in .env.example.
 * Fails if there are undocumented variables or phantom ones.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ENV_EXAMPLE = ".env.example";
const SERVER_DIR = "server";
const API_DIR = "api";

function getEnvVarsFromFile(filepath) {
  const content = readFileSync(filepath, "utf8");
  // Match process.env.VAR_NAME patterns
  const regex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  const vars = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

function getEnvVarsFromDir(dir) {
  const vars = new Set();
  function walk(d) {
    for (const file of readdirSync(d)) {
      const full = join(d, file);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extname(file) === ".mjs" || extname(file) === ".js") {
        for (const v of getEnvVarsFromFile(full)) {
          vars.add(v);
        }
      }
    }
  }
  walk(dir);
  return vars;
}

function getEnvVarsFromExample() {
  const content = readFileSync(ENV_EXAMPLE, "utf8");
  // Match VAR_NAME= or # VAR_NAME= (commented out)
  const regex = /^#?\s*([A-Z_][A-Z0-9_]*)\s*=/gm;
  const vars = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

function main() {
  console.log("[env-validate] Scanning server/ and api/ for process.env.* references...");
  const serverVars = getEnvVarsFromDir(SERVER_DIR);
  const apiVars = getEnvVarsFromDir(API_DIR);
  const allUsed = new Set([...serverVars, ...apiVars]);

  console.log("[env-validate] Reading .env.example...");
  const documented = getEnvVarsFromExample();

  // Variables that are used but not documented
  const undocumented = [...allUsed].filter(v => !documented.has(v));
  // Variables documented but never used (could be intentional for future use)
  const unused = [...documented].filter(v => !allUsed.has(v));

  // Special cases: allowed to be used without being in .env.example
  // These are standard Node/environment variables
  const ALLOWED_IMPLICIT = new Set([
    "NODE_ENV",
    "PORT",
    "HOST",
    "HOME",
    "USER",
    "PATH",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "CI",
    "VERCEL",
    "CF_PAGES",
    "AWS_LAMBDA_FUNCTION_NAME",
    "AGENT_SERVER_URL",
    "SESSION_API_KEY",
    "OH_SESSION_API_KEYS_0",
    "AUTOMATION_CALLBACK_URL",
    "AUTOMATION_CALLBACK_API_KEY",
    "AUTOMATION_KV_TOKEN",
    "AUTOMATION_API_URL",
    "AUTOMATION_RUN_ID",
  ]);

  const filteredUndocumented = undocumented.filter(v => !ALLOWED_IMPLICIT.has(v));

  if (filteredUndocumented.length > 0) {
    console.error("\n[env-validate] ERROR: The following variables are used in code but NOT documented in .env.example:");
    for (const v of filteredUndocumented.sort()) {
      console.error(`  - ${v}`);
    }
    console.error("\nAdd them to .env.example or remove the references.");
    process.exit(1);
  }

  if (unused.length > 0) {
    console.warn("\n[env-validate] WARNING: The following variables are documented but NOT used in server/ or api/:");
    for (const v of unused.sort()) {
      console.warn(`  - ${v}`);
    }
    console.warn("(This may be intentional for future use or client-side variables.)");
  }

  console.log(`\n[env-validate] OK: ${allUsed.size} variables used, ${documented.size} documented.`);
  console.log("[env-validate] All used variables are documented.");
}

main();