#!/usr/bin/env node
/**
 * Secret scanner for the Duta Integra repository.
 *
 * Two jobs, deliberately kept separate:
 *
 *   1. Find things that LOOK like credentials (pattern matching).
 *   2. Decide whether a finding is LIVE (ask the issuing provider).
 *
 * The exit code follows the second, not the first. Pattern matching alone
 * produces false positives — docs, tests, and example files all contain
 * credential-shaped strings — so a bare pattern hit is a warning. Only a
 * credential the provider confirms as live fails the run. That keeps the
 * signal trustworthy: a red build means a real, working secret is exposed.
 *
 * Usage:
 *   node scripts/scan-secrets.mjs              # tracked files, warn only
 *   node scripts/scan-secrets.mjs --verify     # confirm liveness, fail on live
 *   node scripts/scan-secrets.mjs --history    # also scan git history
 *   node scripts/scan-secrets.mjs --strict     # fail on any high-confidence hit
 *   node scripts/scan-secrets.mjs --json       # machine-readable
 *
 * Verification sends candidate credentials to the official API of the provider
 * that issued them, and nowhere else. That is the only way to distinguish a
 * live key from a dead one, and it is what GitHub's own secret scanning does.
 * No output from this script ever contains a full credential.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

/**
 * `verify` names the provider whose API can confirm liveness. Patterns without
 * it are reported but can never fail the build on their own.
 */
export const PATTERNS = [
  {
    id: "github-pat-fine-grained",
    label: "GitHub fine-grained PAT",
    // github_pat_<22+ chars of id/secret>
    regex: /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
    confidence: "high",
    verify: "github",
  },
  {
    id: "github-pat-classic",
    label: "GitHub classic PAT",
    regex: /\bghp_[A-Za-z0-9]{36}\b/g,
    confidence: "high",
    verify: "github",
  },
  {
    id: "github-oauth",
    label: "GitHub OAuth/app token",
    regex: /\b(gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/g,
    confidence: "high",
    verify: "github",
  },
  {
    id: "slack-token",
    label: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
    confidence: "high",
    verify: "slack",
  },
  {
    id: "slack-webhook",
    label: "Slack incoming webhook",
    regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9+/]{8,}\/[A-Za-z0-9+/]{8,}\/[A-Za-z0-9+/]{20,}/g,
    confidence: "high",
    verify: "slack-webhook",
  },
  {
    id: "aws-access-key",
    label: "AWS access key ID",
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    confidence: "high",
    // No verification: confirming an AWS key requires signing a request, which
    // is more machinery than this script needs, and a false negative here is
    // cheap because the pattern is already low-noise.
  },
  {
    id: "google-api-key",
    label: "Google API key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    confidence: "high",
  },
  {
    id: "stripe-secret",
    label: "Stripe live secret key",
    regex: /\bsk_live_[0-9a-zA-Z]{24,}/g,
    confidence: "high",
    verify: "stripe",
  },
  {
    id: "private-key",
    label: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    confidence: "high",
  },
  {
    id: "supabase-service-role",
    label: "Supabase service_role JWT",
    // A JWT whose payload names the service_role. Matched by decoding, not by
    // regex alone — see findSupabaseServiceRole().
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    confidence: "high",
    decoder: "supabase-role",
  },
  {
    id: "generic-assignment",
    label: "Credential-shaped assignment",
    // Deliberately low confidence: catches the long tail, warns only.
    regex: /\b(?:api[_-]?key|apikey|secret|passwd|password|auth[_-]?token|access[_-]?token)\b\s*[:=]\s*["']([^"'\s]{16,})["']/gi,
    confidence: "low",
  },
];

/** Markers on a line that suppress findings, for docs and fixtures. */
const ALLOW_MARKERS = ["secret-scan:allow", "gitleaks:allow", "pragma: allowlist secret"];

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "Web",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".next",
  "vendor",
];

const IGNORE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".zip", ".gz", ".tar", ".wasm", ".mp4", ".mov",
  ".lock", ".map",
]);

const MAX_FILE_BYTES = 2_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Never emit a full credential. Output from this script lands in CI logs, which
 * are broadly readable — printing the secret to warn about the secret would
 * leak it a second time.
 */
export function redact(value) {
  if (typeof value !== "string" || value.length === 0) return "<empty>";
  if (value.length <= 12) return `${value.slice(0, 2)}…<${value.length} chars>`;
  return `${value.slice(0, 6)}…${value.slice(-4)} <${value.length} chars>`;
}

export function isIgnoredPath(p) {
  const norm = p.replace(/\\/g, "/");
  const parts = norm.split("/");
  if (parts.some((seg) => IGNORE_DIRS.includes(seg))) return true;
  return IGNORE_EXT.has(extname(norm).toLowerCase());
}

function looksBinary(buf) {
  const window = buf.subarray(0, 4096);
  return window.includes(0);
}

/**
 * A JWT is only interesting when its payload claims service_role. A Supabase
 * anon key is a JWT too, and is meant to be public.
 */
function decodeJwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

export function scanText(content, file = "<text>") {
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (ALLOW_MARKERS.some((marker) => line.includes(marker))) continue;

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const value = match[1] && pattern.id === "generic-assignment" ? match[1] : match[0];

        // Filter out things that merely look like a JWT.
        if (pattern.decoder === "supabase-role") {
          const claims = decodeJwtRole(value);
          if (!claims || claims.role !== "service_role") continue;
        }

        // The generic pattern matches the key NAME too; require the value to
        // look random enough to be a credential rather than prose.
        if (pattern.id === "generic-assignment") {
          const distinct = new Set(value).size;
          if (distinct < 10) continue;
        }

        findings.push({
          id: pattern.id,
          label: pattern.label,
          confidence: pattern.confidence,
          verify: pattern.verify ?? null,
          file,
          line: i + 1,
          value,
          preview: redact(value),
        });

        if (match.index === pattern.regex.lastIndex) pattern.regex.lastIndex += 1;
      }
    }
  }

  return findings;
}

function listTrackedFiles(cwd) {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\0").filter(Boolean);
}

export function scanWorkingTree(cwd = process.cwd()) {
  const findings = [];
  for (const file of listTrackedFiles(cwd)) {
    if (isIgnoredPath(file)) continue;
    const abs = resolve(cwd, file);
    try {
      if (statSync(abs).size > MAX_FILE_BYTES) continue;
      const buf = readFileSync(abs);
      if (looksBinary(buf)) continue;
      findings.push(...scanText(buf.toString("utf8"), file));
    } catch {
      // Unreadable or vanished mid-scan; not a security finding.
    }
  }
  return findings;
}

/**
 * Scan history as a single diff stream. Secrets that were committed and later
 * deleted are still exposed — anyone with a clone can recover them — so this
 * matters more than the working tree, but it is slower and needs a full clone
 * (CI defaults to a shallow one).
 */
export function scanHistory(cwd = process.cwd()) {
  let diff;
  try {
    diff = execFileSync("git", ["log", "-p", "--all", "--no-merges", "--no-color", "--unified=0"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(`git log failed (is this a full clone?): ${err.message}`);
  }
  // Only additions: a removed line is the fix, not the leak.
  const added = diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1))
    .join("\n");
  return scanText(added, "<git-history>");
}

// ---------------------------------------------------------------------------
// Verification — the only place a credential leaves this process
// ---------------------------------------------------------------------------

/**
 * Endpoints are overridable so tests can point at a local stub instead of
 * hammering a real provider. In normal use the official API is the only host a
 * credential is ever sent to.
 */
const ENDPOINTS = {
  github: () => process.env.SECRET_SCAN_GITHUB_API || "https://api.github.com/user",
  slack: () => process.env.SECRET_SCAN_SLACK_API || "https://slack.com/api/auth.test",
  stripe: () => process.env.SECRET_SCAN_STRIPE_API || "https://api.stripe.com/v1/balance",
};

/**
 * Return "live", "dead", or "unknown".
 *
 * "unknown" is the honest answer for a network failure: it must not be treated
 * as dead (a real leak would slip through) nor as live (the build would break
 * on a flaky network).
 */
export async function verifyToken(finding, fetchImpl = fetch) {
  const provider = finding.verify;
  if (!provider) return "unknown";

  if (provider === "slack-webhook") {
    // A webhook cannot be checked without posting to the channel, which would
    // be a side effect. Treat as unknown; the pattern is high-confidence anyway.
    return "unknown";
  }

  const url = ENDPOINTS[provider]?.();
  if (!url) return "unknown";

  const headers = provider === "github"
    ? { authorization: `Bearer ${finding.value}`, accept: "application/vnd.github+json" }
    : { authorization: `Bearer ${finding.value}` };

  try {
    const res = await fetchImpl(url, { method: "GET", headers });
    if (provider === "github") {
      if (res.status === 200) return "live";
      if (res.status === 401 || res.status === 403) return "dead";
      return "unknown";
    }
    if (res.status === 200) {
      // Slack answers 200 with ok:false for a bad token.
      try {
        const body = await res.json();
        if (typeof body.ok === "boolean") return body.ok ? "live" : "dead";
      } catch {
        return "unknown";
      }
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Decide the outcome. The rule: only a confirmed-live credential fails.
 * `--strict` additionally fails any high-confidence pattern hit.
 */
export function summarize(findings, { strict = false, verify = false } = {}) {
  const live = findings.filter((f) => f.verdict === "live");
  // "dead" is excluded: a credential the provider has rejected is already
  // revoked, so it must not break the build forever under --strict.
  const highUnverified = findings.filter(
    (f) => f.confidence === "high" && f.verdict !== "live" && f.verdict !== "dead",
  );
  const shouldFail = live.length > 0 || (strict && highUnverified.length > 0);
  return { live, highUnverified, total: findings.length, shouldFail };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const wantVerify = args.includes("--verify");
  const wantHistory = args.includes("--history");
  const strict = args.includes("--strict");
  const asJson = args.includes("--json");

  const findings = scanWorkingTree();
  if (wantHistory) findings.push(...scanHistory());

  if (wantVerify) {
    for (const f of findings) f.verdict = await verifyToken(f);
  }

  const { live, highUnverified, total, shouldFail } = summarize(findings, { strict, verify: wantVerify });

  if (asJson) {
    console.log(JSON.stringify({
      findings: findings.map(({ value, ...rest }) => rest), // never emit the raw value
      live: live.length,
      highConfidenceUnverified: highUnverified.length,
      total,
      fail: shouldFail,
    }, null, 2));
  } else {
    if (total === 0) {
      console.log("secret-scan: clean");
    } else {
      console.log(`secret-scan: ${total} candidate(s)`);
      for (const f of findings) {
        const verdict = f.verdict === "live" ? "LIVE" : f.verdict === "dead" ? "dead" : "unverified";
        console.log(`  [${verdict}] ${f.label} (${f.confidence}) ${f.file}:${f.line} ${f.preview}`);
      }
    }
    if (live.length) console.log(`\nFAIL: ${live.length} confirmed-live credential(s)`);
    else if (shouldFail) console.log(`\nFAIL: ${highUnverified.length} high-confidence hit(s) under --strict`);
    else if (highUnverified.length) console.log(`\nwarn: ${highUnverified.length} high-confidence candidate(s), none confirmed live`);
  }

  process.exit(shouldFail ? 1 : 0);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`secret-scan: ${err.message}`);
    process.exit(2);
  });
}
