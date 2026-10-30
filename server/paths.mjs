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

/**
 * Resolved on first use, never at module evaluation: Pages Functions bundles
 * every module under `functions/` into one file, and in that bundle
 * `import.meta.url` is undefined. Evaluating `fileURLToPath` at module scope
 * therefore threw a TypeError while the worker was being instantiated, before
 * any handler ran, which takes down every /api/* route at once — not just the
 * JSONL stores this module exists to locate.
 */
let resolvedRoot;

function projectRoot() {
  if (resolvedRoot === undefined) {
    resolvedRoot = import.meta.url
      ? resolve(dirname(fileURLToPath(import.meta.url)), "..")
      : resolve(process.cwd());
  }
  return resolvedRoot;
}

/** @returns {string} Absolute directory the stores resolve against. */
export function dataDir() {
  const override = process.env.DATA_DIR?.trim();
  return override ? resolve(override) : join(projectRoot(), "data");
}

/**
 * @param {string} name File name only, e.g. "clients.jsonl". No separators —
 *   callers pass literals, so there is nothing to sanitise.
 * @returns {string}
 */
export function dataFile(name) {
  return join(dataDir(), name);
}
