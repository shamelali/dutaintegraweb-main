import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guards against the failure mode this repo actually has: the schema lives in
 * Supabase and the code lives here, with nothing checking that they agree.
 *
 * These tests read the real source files. Adding a table, a filter column or a
 * policy in code without shipping the matching migration fails the suite.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_DIR = join(ROOT, "server");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

function readMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ file: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
}

function serverSources() {
  return readdirSync(SERVER_DIR)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .map((f) => ({ file: f, src: readFileSync(join(SERVER_DIR, f), "utf8") }));
}

/**
 * Only the modules reachable from the deployed entrypoint are checked.
 *
 * server/ carries a second, parallel implementation of most stores under
 * *-cloudflare.mjs. handler.mjs reaches exactly one of them
 * (workspace-cloudflare.mjs), so scanning the whole directory would either
 * ignore the duplication or fail on tables that only the Cloudflare fork uses.
 * Reachability is computed, not asserted by hand, so a fork module pulled into
 * the live path is checked from that commit onward.
 */
function liveSources() {
  const seen = new Set();
  const queue = ["handler.mjs"];
  const sources = serverSources();
  const byName = new Map(sources.map((s) => [s.file, s]));

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const entry = byName.get(file);
    if (!entry) continue;
    for (const m of entry.src.matchAll(/from "\.\/([\w.-]+\.mjs)"/g)) {
      if (!m[1].endsWith(".test.mjs")) queue.push(m[1]);
    }
  }
  return sources.filter((s) => seen.has(s.file));
}

/** @returns {Map<string, string[]>} table -> column names */
function parseTables(migrations) {
  const tables = new Map();
  for (const { sql } of migrations) {
    for (const match of sql.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
      const [, table, body] = match;
      const columns = body
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("--") && !/^(create |alter |constraint|primary key|unique\(|foreign key)/i.test(line))
        .map((line) => line.split(/\s+/)[0].replace(/,/g, ""))
        .filter((token) => /^[a-z_][a-z0-9_]*$/.test(token));
      const existing = tables.get(table) ?? [];
      tables.set(table, [...new Set([...existing, ...columns])]);
    }
  }
  return tables;
}

const MIGRATIONS = readMigrations();
const SOURCES = liveSources();
const TABLES = parseTables(MIGRATIONS);

test("the live path is what is expected to be live", () => {
  const files = SOURCES.map((s) => s.file);
  assert.ok(files.includes("handler.mjs"), "handler.mjs is the deployed entrypoint");
  assert.ok(files.includes("enquiries.mjs"), "the resolver's stores are reachable from the handler");
  assert.ok(files.includes("store.mjs"));
  assert.ok(
    !files.includes("handler-cloudflare.mjs"),
    "the Cloudflare fork must stay unreachable from the Vercel entrypoint until Phase 2 decides its fate",
  );
});

/** Tables the code names directly, plus those held in *_TABLE constants. */
function tablesReferencedInCode() {
  const found = new Map();
  for (const { file, src } of SOURCES) {
    for (const m of src.matchAll(/(?:sbFetch|supabaseFetch|supabaseRequest)\(\s*[`"'](\w+)/g)) {
      found.set(m[1], file);
    }
    for (const m of src.matchAll(/(?:from|table)\(\s*["'`](\w+)["'`]/g)) {
      found.set(m[1], file);
    }
    for (const m of src.matchAll(/\w*_TABLE\s*=\s*["'`](\w+)["'`]/g)) {
      found.set(m[1], file);
    }
  }
  return found;
}

test("the parser sees the schema at all", () => {
  assert.ok(TABLES.size >= 10, `expected the migrations to define the core tables, saw ${TABLES.size}`);
  for (const table of ["leads", "clients", "tickets", "quiz_audits", "health_probe"]) {
    assert.ok(TABLES.has(table), `migration parser missed ${table}`);
    assert.ok(TABLES.get(table).includes("id"), `${table} should have an id column`);
  }
});

test("every table named by server code exists in the migrations", () => {
  const referenced = tablesReferencedInCode();
  assert.ok(referenced.size >= 5, `expected to find table references, found ${referenced.size}`);
  for (const [table, file] of referenced) {
    assert.ok(
      TABLES.has(table),
      `${file} writes to "${table}" but no migration creates public.${table}`,
    );
  }
});

test("every filter column used against a table is declared for it", () => {
  const problems = [];
  for (const { file, src } of SOURCES) {
    for (const m of src.matchAll(/[`"'](\w+)\?(\w+)=(?:eq|in|gte|lte|is)\./g)) {
      const [, table, column] = m;
      if (!TABLES.has(table)) continue; // covered by the table test
      if (!TABLES.get(table).includes(column)) {
        problems.push(`${file}: ${table}.${column} is filtered on but not in the migration`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("every explicit select list names real columns", () => {
  const problems = [];
  for (const { file, src } of SOURCES) {
    for (const m of src.matchAll(/[`"'](\w+)[?&]select=([\w,]+)(?=[&`"'])/g)) {
      const [, table, list] = m;
      if (!TABLES.has(table)) continue;
      for (const column of list.split(",")) {
        if (column === "*") continue;
        if (!TABLES.get(table).includes(column)) {
          problems.push(`${file}: ${table}.${column} is selected but not in the migration`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("RLS is enabled on every table the migrations create", () => {
  const enabled = new Set();
  for (const { sql } of MIGRATIONS) {
    for (const m of sql.matchAll(/alter table (?:if exists )?public\.(\w+) enable row level security/g)) {
      enabled.add(m[1]);
    }
  }
  const missing = [...TABLES.keys()].filter((t) => !enabled.has(t));
  assert.deepEqual(missing, [], "tables created without RLS: an exposed anon key reaches them");
});

/**
 * A `create policy` with no `to` clause applies to role `public`, which anon
 * and authenticated both inherit — so it grants access to anyone holding the
 * public anon key. The comment claiming "service role bypasses" is true and
 * beside the point. This is how audit_log and proposal_versions were exposed
 * in 202610270001 until 202610280001 dropped those policies.
 */
test("no policy is created without an explicit target role", () => {
  const created = [];
  const dropped = new Set();
  for (const { file, sql } of MIGRATIONS) {
    for (const m of sql.matchAll(/create policy "([^"]*)" on public\.(\w+)\s([\s\S]*?);/g)) {
      created.push({ file, name: m[1], table: m[2], body: m[3] });
    }
    for (const m of sql.matchAll(/drop policy if exists "([^"]*)" on public\.(\w+)/g)) {
      dropped.add(`${m[2]}::${m[1]}`);
    }
  }

  const problems = created
    .filter((p) => !dropped.has(`${p.table}::${p.name}`))
    .filter((p) => !/\bto\s+(anon|authenticated|service_role)\b/.test(p.body))
    .map((p) => `${p.file}: policy "${p.name}" on public.${p.table} has no \`to\` clause, so it grants access to role public`);

  assert.deepEqual(problems, []);
});

test("migrations are timestamp-ordered and never edited in place", () => {
  const names = MIGRATIONS.map((m) => m.file);
  assert.deepEqual(names, [...names].sort(), "migration filenames must sort in apply order");
  for (const name of names) {
    assert.match(name, /^\d{8}\d{4}_[a-z0-9_]+\.sql$/, `${name} must be <date><seq>_snake_case.sql`);
  }
});
