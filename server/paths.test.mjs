import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { dataDir, dataFile } from "./paths.mjs";

const SERVER_DIR = resolve(fileURLToPath(import.meta.url), "..");

/**
 * paths.mjs is the only place allowed to build a store path. Every store module
 * used to do `join(PROJECT_ROOT, "data", ...)`, which meant `npm test` appended
 * synthetic records into ./data — the same files that hold real local client
 * accounts. The test runner sets DATA_DIR to a temp directory; a module that
 * rebuilds the path itself would ignore it and corrupt the working tree again.
 */

test("dataDir: DATA_DIR redirects every store", () => {
  const previous = process.env.DATA_DIR;
  try {
    process.env.DATA_DIR = "/tmp/duta-alt-store";
    assert.equal(dataDir(), resolve("/tmp/duta-alt-store"));
    assert.equal(dataFile("clients.jsonl"), join(resolve("/tmp/duta-alt-store"), "clients.jsonl"));
  } finally {
    if (previous === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previous;
  }
});

test("dataDir: falls back to ./data under the repo when unset", () => {
  const previous = process.env.DATA_DIR;
  try {
    delete process.env.DATA_DIR;
    assert.equal(dataDir(), resolve(SERVER_DIR, "..", "data"));
  } finally {
    if (previous === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previous;
  }
});

test("dataDir: a blank override is not treated as a directory", () => {
  const previous = process.env.DATA_DIR;
  try {
    process.env.DATA_DIR = "   ";
    assert.equal(dataDir(), resolve(SERVER_DIR, "..", "data"));
  } finally {
    if (previous === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previous;
  }
});

test("no store module rebuilds the data/ path instead of using paths.mjs", () => {
  const offenders = [];
  for (const entry of readdirSync(SERVER_DIR)) {
    if (!entry.endsWith(".mjs") || entry.endsWith(".test.mjs") || entry === "paths.mjs") continue;
    const source = readFileSync(join(SERVER_DIR, entry), "utf8");
    // Matches join(x, "data", "clients.jsonl") and "..", "data", "x.jsonl".
    if (/"data",\s*"[^"]*\.jsonl"/.test(source)) offenders.push(entry);
  }
  assert.deepEqual(offenders, [], `${offenders.join(", ")} hardcode a store path; use dataFile() from paths.mjs so DATA_DIR is honoured`);
});
