// lib/memory.js — OpenHuman-inspired Markdown vault (reimplemented, no GPL)
// Pure, dependency-free synthesis layer. Reuses hasAny word-boundary logic from api/_scoring.js:47
// Storage-agnostic: caller decides git FS vs Supabase storage (memory-vault bucket).

import { config } from "./config.js";
import { logger } from "./logger.js";

const CHUNK_TOKEN_LIMIT = 3000; // chars approx; OpenHuman uses ≤3k tokens — approximate with chars/4

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "unknown";
}

function escMd(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function frontmatter(obj) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    const val = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v);
    lines.push(`${k}: ${val}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function toMytDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

// Chunk by character length with deterministic IDs (OpenHuman ≤3k tokens)
export function chunkText(text, limit = CHUNK_TOKEN_LIMIT * 4) {
  const raw = String(text || "");
  if (raw.length <= limit) return [{ id: "c0", text: raw }];
  const chunks = [];
  let start = 0;
  let idx = 0;
  while (start < raw.length) {
    let end = Math.min(start + limit, raw.length);
    // break on paragraph boundary if near end
    if (end < raw.length) {
      const br = raw.lastIndexOf("\n\n", end);
      if (br > start + limit * 0.6) end = br + 2;
    }
    chunks.push({ id: `c${idx++}`, text: raw.slice(start, end) });
    start = end;
  }
  return chunks;
}

export function canonicalizeLead(lead) {
  const { id, name, email, phone, company, service, message, status, source, lead_score, assigned_role, created_at } = lead || {};
  const slug = slugify(company || email || name || id);
  const date = created_at ? new Date(created_at) : new Date();
  const mytDate = toMytDate(date);

  const fm = frontmatter({
    id: String(id || ""),
    provenance: `Supabase leads.id=${id}`,
    source: String(source || "contact-form"),
    status: String(status || "new"),
    created_at: date.toISOString(),
    myt_date: mytDate,
    email: String(email || ""),
    company: String(company || ""),
    service: String(service || ""),
    lead_score: Number(lead_score ?? 0),
    assigned_role: assigned_role ? String(assigned_role) : null,
    company_slug: slug,
  });

  const body = [
    `# Lead — ${escMd(name || "Unknown")} ${company ? `(${escMd(company)})` : ""}`,
    "",
    `> Score ${Number(lead_score ?? 0)} → ${assigned_role || "unassigned"} · ${String(source || "contact-form")} · ${mytDate}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Name | ${escMd(name)} |`,
    `| Email | ${escMd(email)} |`,
    `| Phone | ${escMd(phone)} |`,
    `| Company | ${escMd(company)} |`,
    `| Service | ${escMd(service)} |`,
    `| Status | ${escMd(status)} |`,
    "",
    `## Message`,
    "",
    message ? String(message).trim() : "_No message_",
    "",
    `## Provenance`,
    `Stored in Supabase \`leads\` id \`${String(id || "")}\` at ${date.toISOString()} (MYT ${mytDate}). Human-editable — next digest reuses this file.`,
  ].join("\n");

  return { frontmatter: fm, body, markdown: `${fm}\n\n${body}\n`, slug, mytDate, id: String(id || "") };
}

export function foldDaily(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return null;
  const byDate = new Map();
  for (const l of leads) {
    const d = toMytDate(l.created_at || new Date());
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(l);
  }
  const pages = [];
  for (const [date, batch] of byDate.entries()) {
    const sorted = [...batch].sort((a, b) => (Number(b.lead_score) || 0) - (Number(a.lead_score) || 0));
    const total = sorted.length;
    const avg = Math.round(sorted.reduce((s, x) => s + (Number(x.lead_score) || 0), 0) / Math.max(1, total));
    const byRole = { technical: 0, operations: 0, unassigned: 0 };
    for (const l of sorted) {
      const r = String(l.assigned_role || "unassigned");
      if (r in byRole) byRole[r]++; else byRole.unassigned++;
    }
    const fm = frontmatter({
      date,
      myt_date: date,
      total_leads: total,
      avg_score: avg,
      by_role: byRole,
      generated_at: new Date().toISOString(),
    });
    const rows = sorted.map((l) => `| ${escMd(l.name)} | ${escMd(l.company)} | ${escMd(l.service)} | ${Number(l.lead_score) || 0} | ${escMd(l.assigned_role || "—")} | ${escMd(String(l.source || ""))} |`).join("\n");
    const body = [
      `# Daily digest — ${date} (MYT)`,
      "",
      `> ${total} leads · avg score ${avg} · technical ${byRole.technical} · operations ${byRole.operations} · unassigned ${byRole.unassigned}`,
      "",
      `| Name | Company | Service | Score | Role | Source |`,
      `|------|---------|---------|-------|------|--------|`,
      rows,
      "",
      `## Notes`,
      `Auto-folded from Supabase leads. Edit company files in \`memory/vault/companies/\` — next run preserves human edits.`,
    ].join("\n");
    pages.push({ date, markdown: `${fm}\n\n${body}\n`, leadCount: total });
  }
  return pages;
}

export function foldCompanies(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return [];
  const bySlug = new Map();
  for (const l of leads) {
    const s = slugify(l.company || l.email || "unknown");
    if (!bySlug.has(s)) bySlug.set(s, []);
    bySlug.get(s).push(l);
  }
  const pages = [];
  for (const [slug, batch] of bySlug.entries()) {
    const company = batch[0]?.company || batch[0]?.email || slug;
    const sorted = [...batch].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const fm = frontmatter({
      company_slug: slug,
      company: String(company || ""),
      total_leads: batch.length,
      latest_at: sorted[0]?.created_at || null,
      generated_at: new Date().toISOString(),
    });
    const rows = sorted.map((l) => `| ${toMytDate(l.created_at || new Date())} | ${escMd(l.name)} | ${escMd(l.service)} | ${Number(l.lead_score) || 0} | ${escMd(l.status || "new")} |`).join("\n");
    const body = [
      `# Company — ${escMd(company)}`,
      "",
      `> ${batch.length} lead(s) · slug \`${slug}\``,
      "",
      `| Date (MYT) | Name | Service | Score | Status |`,
      `|------------|------|---------|-------|--------|`,
      rows,
      "",
      `## Messages`,
      ...sorted.map((l) => `- **${toMytDate(l.created_at || new Date())}** ${escMd(l.name)} (${escMd(l.service)}): ${String(l.message || "_no message_").slice(0, 400)}`),
    ].join("\n");
    pages.push({ slug, company: String(company || ""), markdown: `${fm}\n\n${body}\n`, count: batch.length });
  }
  return pages;
}

// Orchestrator — writes via injected writer (fs or Supabase storage)
// writer: { writeFile(path, content): Promise, ensureDir?(dir): Promise }
export async function synthesizeBatch(leads, writer) {
  if (!config.memoryVaultEnabled) {
    logger.info("memory vault disabled — skip synthesizeBatch");
    return { skipped: true };
  }
  if (!Array.isArray(leads) || leads.length === 0) return { written: 0 };
  const base = String(config.memoryVaultPath || "memory/vault").replace(/\/+$/, "");

  let leadWrites = 0;
  let companyWrites = 0;
  let dailyWrites = 0;

  // 1) per-lead source trees
  for (const lead of leads) {
    const { markdown, mytDate, id } = canonicalizeLead(lead);
    const path = `${base}/leads/${mytDate}__${String(id).slice(0, 8)}__${slugify(lead.company || lead.email || lead.name || id)}.md`;
    try {
      if (writer?.ensureDir) await writer.ensureDir(`${base}/leads`);
      await writer.writeFile(path, markdown);
      leadWrites++;
    } catch (err) {
      logger.warn("memory writeFile failed (lead)", { path, error: err?.message });
    }
  }

  // 2) company topic trees
  const companyPages = foldCompanies(leads);
  for (const p of companyPages) {
    const path = `${base}/companies/${p.slug}.md`;
    try {
      if (writer?.ensureDir) await writer.ensureDir(`${base}/companies`);
      await writer.writeFile(path, p.markdown);
      companyWrites++;
    } catch (err) {
      logger.warn("memory writeFile failed (company)", { path, error: err?.message });
    }
  }

  // 3) daily global trees
  const dailyPages = foldDaily(leads) || [];
  for (const p of dailyPages) {
    const path = `${base}/daily/${p.date}.md`;
    try {
      if (writer?.ensureDir) await writer.ensureDir(`${base}/daily`);
      await writer.writeFile(path, p.markdown);
      dailyWrites++;
    } catch (err) {
      logger.warn("memory writeFile failed (daily)", { path, error: err?.message });
    }
  }

  logger.info("memory synthesized", { leadWrites, companyWrites, dailyWrites, base });
  return { leadWrites, companyWrites, dailyWrites, base };
}

// Supabase-backed writer (service_role) — optional, falls back to FS writer in dev
export function createSupabaseVaultWriter(supabase) {
  return {
    async writeFile(path, content) {
      const bucket = "memory-vault";
      const blob = typeof Blob !== "undefined" ? new Blob([content], { type: "text/markdown" }) : content;
      const opts = { upsert: true, contentType: "text/markdown; charset=utf-8" };
      const { error } = await supabase.storage.from(bucket).upload(path, blob, opts);
      if (error) throw new Error(`storage upload ${path}: ${error.message}`);
    },
  };
}

export function createFsVaultWriter({ fs, path: pathMod }) {
  // fs: node:fs/promises, path: node:path
  return {
    async ensureDir(dir) {
      await fs.mkdir(dir, { recursive: true });
    },
    async writeFile(filePath, content) {
      const dir = pathMod.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    },
  };
}
