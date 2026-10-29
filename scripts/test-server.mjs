#!/usr/bin/env node
/**
 * Run the server test suite against a throwaway DATA_DIR.
 *
 * The JSONL stores default to ./data, which in this repo holds real local
 * client accounts, quiz results and tickets. Without this wrapper every
 * `npm test` appended synthetic records to those files — mutating data a
 * developer actually uses, and making test outcomes depend on prior runs.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = mkdtempSync(join(tmpdir(), "duta-test-data-"));

try {
  const result = spawnSync(process.execPath, ["--test", "server/**/*.test.mjs"], {
    stdio: "inherit",
    env: { ...process.env, DATA_DIR: dataDir, NODE_ENV: "test" },
  });
  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`[test] server suite terminated by ${result.signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
