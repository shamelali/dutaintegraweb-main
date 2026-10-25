/**
 * Unified Duta Integra workspace API: assessment -> lead -> proposal -> project -> tasks/approvals.
 * All database access is server-side through Supabase REST; never ship service credentials to browsers.
 */
import { timingSafeEqual, randomUUID, createHmac } from "node:crypto";
import { verifyUser } from "./supabase-client.mjs";
import { handleAuthLogin as portalLogin, handleAuthLogout as portalLogout, handleAuthMe as portalMe } from "./portal-cloudflare.mjs";
import { findClientByEmail, findClientById } from "./clients-cloudflare.mjs";

const assessmentRequests = new Map();
const adminLoginRequests = new Map();
const TABLES = new Set([
  "workspace_leads", "workspace_assessments", "workspace_proposals", "workspace_projects",
  "workspace_tasks", "workspace_approvals", "workspace_activity",
]);

function configured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
function dbHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}
async function db(table, query = "", { method = "GET", body, prefer } = {}) {
  if (!TABLES.has(table) && table !== "portal_sessions") throw new Error("Unknown table");
  if (!configured()) throw new Error("Workspace database is not configured");
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  const headers = dbHeaders(prefer ? { Prefer: prefer } : {});
  const res = await fetch(`${base}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`Workspace database ${method} ${table} failed (${res.status}): ${await res.text()}`);
  if (res.status === 204) return [];
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}
function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", ...extraHeaders,
  }});
}

/**
 * Resolve the authenticated client from the Supabase Auth session cookie (di_session).
 * Returns null when there is no valid session or no matching client record.
 */
async function getAuthenticatedClient(req) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)di_session=([^;]+)/);
  if (!match) return null;
  const user = await verifyUser(match[1]);
  if (!user) return null;
  return findClientById(user.id);
}
async function readBody(req) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 32_000) return { error: "Request too large", status: 413 };
  try {
    const raw = await req.text();
    if (raw.length > 32_000) return { error: "Request too large", status: 413 };
    const data = JSON.parse(raw || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "Invalid JSON object", status: 400 };
    return { data };
  } catch { return { error: "Invalid JSON body", status: 400 }; }
}
function text(value, max = 500, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const s = value.trim();
  return s.length <= max && (!required || s.length > 0) ? s : null;
}
function secretEqual(expected, supplied) {
  if (!expected || typeof supplied !== "string" || !supplied) return false;
  const a = new TextEncoder().encode(expected), b = new TextEncoder().encode(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function cookieValue(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const item of raw.split(";")) {
    const index = item.indexOf("=");
    if (index > 0 && item.slice(0, index).trim() === name) return item.slice(index + 1).trim();
  }
  return "";
}
function validAdminCookie(req) {
  const secret = process.env.ADMIN_TOKEN?.trim();
  const value = cookieValue(req, "di_admin");
  if (!secret || !value) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!secretEqual(expected, signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Date.now();
  } catch { return false; }
}
function adminAuthorized(req) {
  if (secretEqual(process.env.ADMIN_TOKEN?.trim(), req.headers.get("x-admin-token") || "")) return true;
  return validAdminCookie(req);
}
function createAdminCookie(secret) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 60 * 60 * 1000 }), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function requireAdmin(req) { return adminAuthorized(req) ? null : json(401, { error: "Admin authentication required" }); }
function uuid(value) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function scoreAssessment(maturity, priorities) {
  const maturityScore = Math.max(0, Math.min(5, Number(maturity) || 1)) * 16;
  const breadthBonus = Math.min(20, (Array.isArray(priorities) ? priorities.length : 0) * 4);
  const score = Math.max(0, Math.min(100, Math.round(maturityScore + breadthBonus)));
  const label = score < 40 ? "Digital Foundations" : score < 65 ? "Digital Growth" : score < 82 ? "Digital Ready" : "Advanced Digital";
  const recs = [];
  if (Number(maturity) <= 2) recs.push("Stabilise core systems, access control, backups and data ownership.");
  if ((priorities || []).includes("sales")) recs.push("Improve lead capture, CRM follow-up and sales reporting.");
  if ((priorities || []).includes("automation")) recs.push("Map repetitive workflows before selecting automation tools.");
  if ((priorities || []).includes("security")) recs.push("Review identity, MFA, backups, PDPA handling and incident response.");
  if ((priorities || []).includes("ai")) recs.push("Choose one measurable AI pilot with human review and clear success metrics.");
  if ((priorities || []).includes("operations")) recs.push("Standardise workflows and establish operational dashboards.");
  if (!recs.length) recs.push("Start with a short discovery session and prioritised digital roadmap.");
  return { score, label, recommendations: recs.slice(0, 5) };
}
async function logActivity({ actorType = "system", actorId = null, entityType, entityId = null, action, metadata = {} }) {
  try { await db("workspace_activity", "", { method: "POST", body: { id: randomUUID(), actor_type: actorType, actor_id: actorId, entity_type: entityType, entity_id: entityId, action, metadata }, prefer: "return=minimal" }); }
  catch (err) { console.error("[workspace] activity log failed", err); }
}

function rateLimitByIp(req, store, max, windowMs) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now(), cutoff = now - windowMs;
  const recent = (store.get(ip) || []).filter(t => t > cutoff);
  if (recent.length >= max) { store.set(ip, recent); return false; }
  recent.push(now); store.set(ip, recent);
  if (store.size > 2000) for (const [key, times] of store) if (!times.some(t => t > cutoff)) store.delete(key);
  return true;
}
function assessmentRateLimit(req) {
  return rateLimitByIp(req, assessmentRequests, 5, 15 * 60_000);
}
function adminLoginRateLimit(req) {
  return rateLimitByIp(req, adminLoginRequests, 5, 15 * 60_000);
}
async function createAssessment(req) {
  if (!assessmentRateLimit(req)) return json(429, { error: "Too many assessment submissions. Please try again later." });
  const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
  const b = parsed.data;
  const name = text(b.name, 120, true), company = text(b.company, 160, true), email = text(b.email, 200, true)?.toLowerCase();
  const industry = text(b.industry, 100, true), teamSize = text(b.teamSize, 40, true);
  const budget = text(b.budgetRange, 80, true), timeline = text(b.timeline, 80, true);
  const phone = text(b.phone, 40), notes = text(b.notes, 3000);
  if (!name || !company || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !industry || !teamSize || !budget || !timeline) {
    return json(400, { error: "Please provide valid name, company, email, industry, team size, budget and timeline." });
  }
  const maturity = Number(b.digitalMaturity);
  if (!Number.isInteger(maturity) || maturity < 1 || maturity > 5) return json(400, { error: "Digital maturity must be between 1 and 5." });
  const allowed = new Set(["sales", "automation", "security", "ai", "operations", "customer-experience", "data"]);
  const priorities = Array.isArray(b.priorities) ? [...new Set(b.priorities.filter(x => typeof x === "string" && allowed.has(x)))] : [];
  if (!priorities.length) return json(400, { error: "Select at least one business priority." });
  const assessment = scoreAssessment(maturity, priorities);
  const leadId = randomUUID(), assessmentId = randomUUID(), now = new Date().toISOString();
  await db("workspace_leads", "", { method: "POST", body: {
    id: leadId, name, company, email, phone: phone || null, industry, team_size: teamSize,
    digital_maturity: maturity, priorities, budget_range: budget, timeline, notes: notes || null,
    source: "digital-assessment", status: "new", created_at: now, updated_at: now,
  }, prefer: "return=minimal" });
  await db("workspace_assessments", "", { method: "POST", body: {
    id: assessmentId, lead_id: leadId, score: assessment.score, maturity_label: assessment.label,
    answers: { industry, teamSize, digitalMaturity: maturity, priorities, budgetRange: budget, timeline },
    recommendations: assessment.recommendations, created_at: now,
  }, prefer: "return=minimal" });
  await logActivity({ entityType: "lead", entityId: leadId, action: "assessment_submitted", metadata: { score: assessment.score, source: "digital-assessment" } });
  return json(201, { ok: true, leadId, assessmentId, score: assessment.score, maturityLabel: assessment.label, recommendations: assessment.recommendations, message: "Assessment submitted. Duta Integra can now follow up on your digital roadmap." });
}

async function clientWorkspace(req) {
  const client = await getAuthenticatedClient(req);
  if (!client) return json(401, { error: "Please sign in to view your workspace." });
  const id = encodeURIComponent(client.id);
  const [proposals, projects] = await Promise.all([
    db("workspace_proposals", `client_id=eq.${id}&select=id,title,summary,scope,amount_myr,valid_until,status,created_at,updated_at&order=created_at.desc`),
    db("workspace_projects", `client_id=eq.${id}&select=id,proposal_id,name,description,status,start_date,target_date,created_at,updated_at&order=created_at.desc`),
  ]);
  const projectIds = projects.map(p => p.id);
  let tasks = [];
  if (projectIds.length) tasks = await db("workspace_tasks", `project_id=in.(${projectIds.join(",")})&select=id,project_id,title,description,status,priority,due_date,created_at,updated_at&order=due_date.asc.nullslast`);
  return json(200, { client: { id: client.id, name: client.name, company: client.company, email: client.email }, proposals, projects, tasks });
}

async function decideProposal(req, proposalId) {
  const client = await getAuthenticatedClient(req);
  if (!client) return json(401, { error: "Please sign in to respond to a proposal." });
  const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
  const decision = parsed.data.decision;
  if (!["accepted", "declined"].includes(decision)) return json(400, { error: "Decision must be accepted or declined." });
  const found = await db("workspace_proposals", `id=eq.${encodeURIComponent(proposalId)}&client_id=eq.${encodeURIComponent(client.id)}&select=*`);
  const proposal = found[0];
  if (!proposal || proposal.status !== "sent") return json(404, { error: "Proposal not found or no longer available." });
  const now = new Date().toISOString();
  await db("workspace_proposals", `id=eq.${encodeURIComponent(proposalId)}`, { method: "PATCH", body: { status: decision, decided_at: now, updated_at: now }, prefer: "return=minimal" });
  await logActivity({ actorType: "client", actorId: client.id, entityType: "proposal", entityId: proposalId, action: `proposal_${decision}` });
  let project = null;
  if (decision === "accepted") {
    const rows = await db("workspace_projects", "", { method: "POST", body: { id: randomUUID(), client_id: client.id, proposal_id: proposal.id, name: proposal.title, description: proposal.summary, status: "planned", created_at: now, updated_at: now }, prefer: "return=representation" });
    project = rows[0] || null;
    if (project) await logActivity({ actorType: "system", entityType: "project", entityId: project.id, action: "created_from_accepted_proposal", metadata: { proposalId: proposal.id } });
  }
  return json(200, { ok: true, decision, project });
}

async function adminList(req, table, query = "select=*&order=created_at.desc&limit=200") {
  const denied = requireAdmin(req); if (denied) return denied;
  const rows = await db(table, query);
  return json(200, { items: rows });
}
async function adminCreate(req, table, transform) {
  const denied = requireAdmin(req); if (denied) return denied;
  const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
  const data = transform(parsed.data);
  if (data.error) return json(400, { error: data.error });
  const now = new Date().toISOString();
  const values = { ...data.value };
  // Link an assessment lead to an existing client account by verified account email when possible.
  if (table === "workspace_proposals" && values.lead_id && !values.client_id) {
    const leadRows = await db("workspace_leads", `id=eq.${encodeURIComponent(values.lead_id)}&select=email&limit=1`);
    if (!leadRows.length) return json(400, { error: "The linked lead does not exist." });
    try {
      const client = await findClientByEmail(String(leadRows[0].email).toLowerCase());
      if (client) values.client_id = client.id;
    } catch (err) {
      console.warn("[workspace] could not auto-link lead to client account", err);
    }
  }
  if (table === "workspace_proposals" && values.status === "sent" && !values.client_id) {
    return json(400, { error: "A sent proposal must be linked to an existing client account. Create it as a draft or link a client first." });
  }
  const row = { id: randomUUID(), ...values, created_at: now, updated_at: now };
  const rows = await db(table, "", { method: "POST", body: row, prefer: "return=representation" });
  const created = rows[0] || row;
  await logActivity({ actorType: "staff", entityType: table.replace("workspace_", ""), entityId: created.id, action: "created" });
  return json(201, { item: created });
}
function proposalInput(b) {
  const title = text(b.title, 180, true), summary = text(b.summary, 5000, true);
  const amount = Number(b.amountMyr);
  if (!title || !summary || !Number.isFinite(amount) || amount < 0) return { error: "Title, summary and a non-negative MYR amount are required." };
  if (b.leadId && !uuid(b.leadId)) return { error: "leadId must be a UUID." };
  if (b.clientId && !uuid(b.clientId)) return { error: "clientId must be a UUID." };
  if (b.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(b.validUntil)) return { error: "validUntil must use YYYY-MM-DD." };
  const scope = Array.isArray(b.scope) ? b.scope.filter(x => typeof x === "string").map(x => x.trim()).filter(Boolean).slice(0, 50) : [];
  return { value: { lead_id: b.leadId || null, client_id: b.clientId || null, title, summary, scope, amount_myr: amount, valid_until: b.validUntil || null, status: b.status === "sent" ? "sent" : "draft", created_by: "staff-api" } };
}
function projectInput(b) {
  const name = text(b.name, 180, true);
  if (!name || !uuid(b.clientId)) return { error: "Project name and valid clientId are required." };
  if (b.proposalId && !uuid(b.proposalId)) return { error: "proposalId must be a UUID." };
  const statuses = new Set(["planned", "active", "on_hold", "completed", "cancelled"]);
  return { value: { client_id: b.clientId, proposal_id: b.proposalId || null, name, description: text(b.description, 5000) || null, status: statuses.has(b.status) ? b.status : "planned", start_date: b.startDate || null, target_date: b.targetDate || null } };
}
function taskInput(b) {
  const title = text(b.title, 180, true);
  if (!title || !uuid(b.projectId)) return { error: "Task title and valid projectId are required." };
  const statuses = new Set(["todo", "in_progress", "blocked", "done", "cancelled"]), priorities = new Set(["low", "medium", "high", "urgent"]);
  return { value: { project_id: b.projectId, title, description: text(b.description, 3000) || null, status: statuses.has(b.status) ? b.status : "todo", priority: priorities.has(b.priority) ? b.priority : "medium", due_date: b.dueDate || null, assigned_to: text(b.assignedTo, 160) || null } };
}

export async function handleWorkspaceApi(req) {
  const { pathname } = new URL(req.url);
  try {
    if (pathname === "/api/workspace/admin/login" && req.method === "POST") {
      if (!adminLoginRateLimit(req)) return json(429, { error: "Too many sign-in attempts. Try again later." }, { "retry-after": "900" });
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const secret = process.env.ADMIN_TOKEN?.trim();
      if (!secret || !secretEqual(secret, parsed.data.token || "")) return json(401, { error: "Invalid operations credentials." });
      return json(200, { ok: true, expiresIn: 3600 }, { "set-cookie": `di_admin=${createAdminCookie(secret)}; Path=/api/workspace/admin; Max-Age=3600; HttpOnly; Secure; SameSite=Strict` });
    }
    if (pathname === "/api/workspace/admin/logout" && req.method === "POST") {
      return json(200, { ok: true }, { "set-cookie": "di_admin=; Path=/api/workspace/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict" });
    }
    if (pathname === "/api/workspace/admin/me" && req.method === "GET") {
      const denied = requireAdmin(req); if (denied) return denied;
      return json(200, { ok: true, expiresIn: 3600 });
    }
    if (pathname === "/api/workspace/login" && req.method === "POST") return await portalLogin(req);
    if (pathname === "/api/workspace/logout" && req.method === "POST") return await portalLogout(req);
    if (pathname === "/api/workspace/me" && req.method === "GET") return await portalMe(req);
    if (pathname === "/api/workspace/assessments" && req.method === "POST") return await createAssessment(req);
    if (pathname === "/api/workspace/client" && req.method === "GET") return await clientWorkspace(req);
    const decisionMatch = pathname.match(/^\/api\/workspace\/proposals\/([0-9a-f-]+)\/decision$/i);
    if (decisionMatch && req.method === "POST") return await decideProposal(req, decisionMatch[1]);
    if (pathname === "/api/workspace/admin/leads" && req.method === "GET") return await adminList(req, "workspace_leads", "select=*&order=created_at.desc&limit=250");
    if (pathname === "/api/workspace/admin/assessments" && req.method === "GET") return await adminList(req, "workspace_assessments", "select=*&order=created_at.desc&limit=250");
    if (pathname === "/api/workspace/admin/proposals" && req.method === "GET") return await adminList(req, "workspace_proposals");
    if (pathname === "/api/workspace/admin/proposals" && req.method === "POST") return await adminCreate(req, "workspace_proposals", proposalInput);
    if (pathname === "/api/workspace/admin/projects" && req.method === "GET") return await adminList(req, "workspace_projects");
    if (pathname === "/api/workspace/admin/projects" && req.method === "POST") return await adminCreate(req, "workspace_projects", projectInput);
    if (pathname === "/api/workspace/admin/tasks" && req.method === "GET") return await adminList(req, "workspace_tasks");
    if (pathname === "/api/workspace/admin/tasks" && req.method === "POST") return await adminCreate(req, "workspace_tasks", taskInput);
    if (pathname === "/api/workspace/admin/approvals" && req.method === "GET") return await adminList(req, "workspace_approvals");
    if (pathname === "/api/workspace/admin/activity" && req.method === "GET") return await adminList(req, "workspace_activity", "select=*&order=created_at.desc&limit=300");
    if (pathname === "/api/workspace/admin/approvals" && req.method === "POST") return await adminCreate(req, "workspace_approvals", b => {
      if (!uuid(b.projectId) || !text(b.title, 180, true)) return { error: "Valid projectId and approval title are required." };
      return { value: { project_id: b.projectId, task_id: uuid(b.taskId) ? b.taskId : null, title: text(b.title, 180, true), details: text(b.details, 3000) || null, status: "pending", requested_by: "staff-api" } };
    });
    const proposalMatch = pathname.match(/^\/api\/workspace\/admin\/proposals\/([0-9a-f-]+)$/i);
    if (proposalMatch && req.method === "PATCH") {
      const denied = requireAdmin(req); if (denied) return denied;
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const b = parsed.data, patch = {};
      if (b.clientId !== undefined) {
        if (b.clientId !== null && !uuid(b.clientId)) return json(400, { error: "clientId must be a UUID or null." });
        patch.client_id = b.clientId;
      }
      if (b.status !== undefined) {
        if (!["draft", "sent", "accepted", "declined", "expired"].includes(b.status)) return json(400, { error: "Invalid proposal status." });
        patch.status = b.status;
      }
      if (b.title !== undefined) { const v = text(b.title, 180, true); if (!v) return json(400, { error: "Invalid title." }); patch.title = v; }
      if (b.summary !== undefined) { const v = text(b.summary, 5000, true); if (!v) return json(400, { error: "Invalid summary." }); patch.summary = v; }
      if (b.amountMyr !== undefined) { const v = Number(b.amountMyr); if (!Number.isFinite(v) || v < 0) return json(400, { error: "Invalid MYR amount." }); patch.amount_myr = v; }
      if (b.validUntil !== undefined) { if (b.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(b.validUntil)) return json(400, { error: "validUntil must use YYYY-MM-DD." }); patch.valid_until = b.validUntil || null; }
      if (b.scope !== undefined) patch.scope = Array.isArray(b.scope) ? b.scope.filter(x => typeof x === "string").map(x => x.trim()).filter(Boolean).slice(0, 50) : [];
      patch.updated_at = new Date().toISOString();
      const rows = await db("workspace_proposals", `id=eq.${encodeURIComponent(proposalMatch[1])}`, { method: "PATCH", body: patch, prefer: "return=representation" });
      if (!rows.length) return json(404, { error: "Proposal not found." });
      await logActivity({ actorType: "staff", entityType: "proposal", entityId: proposalMatch[1], action: "updated", metadata: patch });
      return json(200, { item: rows[0] });
    }
    const leadMatch = pathname.match(/^\/api\/workspace\/admin\/leads\/([0-9a-f-]+)$/i);
    if (leadMatch && req.method === "PATCH") {
      const denied = requireAdmin(req); if (denied) return denied;
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const status = parsed.data.status;
      if (!["new", "qualified", "proposal", "won", "lost", "archived"].includes(status)) return json(400, { error: "Invalid lead status." });
      const rows = await db("workspace_leads", `id=eq.${encodeURIComponent(leadMatch[1])}`, { method: "PATCH", body: { status, updated_at: new Date().toISOString() }, prefer: "return=representation" });
      if (!rows.length) return json(404, { error: "Lead not found." });
      await logActivity({ actorType: "staff", entityType: "lead", entityId: leadMatch[1], action: "status_changed", metadata: { status } });
      return json(200, { item: rows[0] });
    }
    const taskMatch = pathname.match(/^\/api\/workspace\/admin\/tasks\/([0-9a-f-]+)$/i);
    if (taskMatch && req.method === "PATCH") {
      const denied = requireAdmin(req); if (denied) return denied;
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const patch = {}, b = parsed.data;
      if (["todo", "in_progress", "blocked", "done", "cancelled"].includes(b.status)) patch.status = b.status;
      if (["low", "medium", "high", "urgent"].includes(b.priority)) patch.priority = b.priority;
      if (b.title !== undefined && text(b.title, 180, true)) patch.title = text(b.title, 180, true);
      if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
      if (b.assignedTo !== undefined) patch.assigned_to = text(b.assignedTo, 160) || null;
      patch.updated_at = new Date().toISOString();
      const rows = await db("workspace_tasks", `id=eq.${encodeURIComponent(taskMatch[1])}`, { method: "PATCH", body: patch, prefer: "return=representation" });
      if (!rows.length) return json(404, { error: "Task not found." });
      await logActivity({ actorType: "staff", entityType: "task", entityId: taskMatch[1], action: "updated", metadata: patch });
      return json(200, { item: rows[0] });
    }
    const projectMatch = pathname.match(/^\/api\/workspace\/admin\/projects\/([0-9a-f-]+)$/i);
    if (projectMatch && req.method === "PATCH") {
      const denied = requireAdmin(req); if (denied) return denied;
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const patch = {}, b = parsed.data;
      if (["planned", "active", "on_hold", "completed", "cancelled"].includes(b.status)) patch.status = b.status;
      if (b.name !== undefined && text(b.name, 180, true)) patch.name = text(b.name, 180, true);
      if (b.description !== undefined) patch.description = text(b.description, 5000) || null;
      if (b.startDate !== undefined) patch.start_date = b.startDate || null;
      if (b.targetDate !== undefined) patch.target_date = b.targetDate || null;
      patch.updated_at = new Date().toISOString();
      const rows = await db("workspace_projects", `id=eq.${encodeURIComponent(projectMatch[1])}`, { method: "PATCH", body: patch, prefer: "return=representation" });
      if (!rows.length) return json(404, { error: "Project not found." });
      await logActivity({ actorType: "staff", entityType: "project", entityId: projectMatch[1], action: "updated", metadata: patch });
      return json(200, { item: rows[0] });
    }
    const approvalMatch = pathname.match(/^\/api\/workspace\/admin\/approvals\/([0-9a-f-]+)\/decision$/i);
    if (approvalMatch && req.method === "POST") {
      const denied = requireAdmin(req); if (denied) return denied;
      const parsed = await readBody(req); if (parsed.error) return json(parsed.status, { error: parsed.error });
      const decision = parsed.data.decision;
      if (!["approved", "rejected"].includes(decision)) return json(400, { error: "Decision must be approved or rejected." });
      const now = new Date().toISOString();
      const rows = await db("workspace_approvals", `id=eq.${encodeURIComponent(approvalMatch[1])}&status=eq.pending`, { method: "PATCH", body: { status: decision, decided_by: "staff-api", decision_notes: text(parsed.data.notes, 3000) || null, decided_at: now }, prefer: "return=representation" });
      if (!rows.length) return json(404, { error: "Pending approval not found." });
      await logActivity({ actorType: "staff", entityType: "approval", entityId: approvalMatch[1], action: decision, metadata: { notes: text(parsed.data.notes, 3000) || null } });
      return json(200, { item: rows[0] });
    }
    if (pathname.startsWith("/api/workspace/")) return json(404, { error: "Workspace endpoint not found." });
    return null;
  } catch (err) {
    console.error("[workspace] request failed", err);
    return json(500, { error: "Workspace request failed. Check server configuration and database migration." });
  }
}

export const __test = { scoreAssessment, proposalInput, projectInput, taskInput };
