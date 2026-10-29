/**
 * Single place that decides where the JSONL fallback stores live.
 *
 * Before this, every store module rebuilt `join(PROJECT_ROOT, "data", ...)`
 * itself, so `npm test` appended synthetic records into the same files a
 * developer uses locally — and those files hold real client PII. Setting
 * DATA_DIR (which the test wrapper does) redirects every store at once.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @returns {string} Absolute directory the stores resolve against. */
export function dataDir() {
  const override = process.env.DATA_DIR?.trim();
  return override ? resolve(override) : join(PROJECT_ROOT, "data");
}

/**
 * @param {string} name File name only, e.g. "clients.jsonl". No separators —
 *   callers pass literals, so there is nothing to sanitise.
 * @returns {string}
 */
export function dataFile(name) {
  return join(dataDir(), name);
}
