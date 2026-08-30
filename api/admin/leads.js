// ============================================================================
// Admin Leads API — Vercel Serverless Function
//
// GET  /api/admin/leads       — list all leads (requires auth)
// POST /api/admin/leads       — create a new lead (from contact form)
// PATCH /api/admin/leads/:id  — update lead status (requires auth)
//
// Auth: Bearer token in Authorization header
//
// Storage: Supabase PostgreSQL
//   - POST uses anon key (contact form)
//   - GET/PATCH use service_role key (bypasses RLS for admin)
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { json, corsResponse, getAuthUser, sanitize } from "../_lib.js";

export const config = { maxDuration: 10 };

const supabaseAnon = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function handler(req) {
  // CORS preflight
  if (req.method === "OPTIONS") return corsResponse(req);

  // POST — create lead (no auth required, called from contact form)
  // Uses anon key — RLS policy allows INSERT for anon
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400, req);
    }

    const lead = {
      name: sanitize(body.name),
      email: sanitize(body.email),
      phone: sanitize(body.phone),
      company: sanitize(body.company),
      service: sanitize(body.service),
      message: sanitize(body.message),
      status: "new",
      source: body.source || "contact-form",
    };

    const { data, error } = await supabaseAnon.from("leads").insert(lead).select().single();

    if (error) {
      console.error("Supabase insert error:", error);
      return json({ ok: false, error: "Failed to save lead" }, 500, req);
    }

    return json({ ok: true, lead: data }, 201, req);
  }

  // All other methods require auth
  const user = await getAuthUser(req);
  if (!user) {
    return json({ ok: false, error: "Unauthorized" }, 401, req);
  }

  // GET — list leads (uses service_role to bypass RLS)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("q");

    let query = supabaseAdmin.from("leads").select("*").order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,service.ilike.%${search}%`);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error("Supabase query error:", JSON.stringify(error));
      return json({ ok: false, error: "Failed to fetch leads: " + error.message }, 500, req);
    }

    // Get counts
    const { data: allLeads } = await supabaseAdmin.from("leads").select("status");

    const counts = {
      all: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === "new").length || 0,
      contacted: allLeads?.filter((l) => l.status === "contacted").length || 0,
      closed: allLeads?.filter((l) => l.status === "closed").length || 0,
    };

    return json({ ok: true, leads, total: leads.length, counts }, 200, req);
  }

  // PATCH — update lead status (uses service_role)
  if (req.method === "PATCH") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ ok: false, error: "Lead ID required" }, 400, req);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400, req);
    }

    const update = {};
    if (body.status) update.status = body.status;
    if (body.note) update.note = sanitize(body.note);
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return json({ ok: false, error: "Failed to update lead" }, 500, req);
    }

    return json({ ok: true, lead: data }, 200, req);
  }

  return json({ ok: false, error: "Method not allowed" }, 405, req);
}

export { handler as GET, handler as POST, handler as PATCH };