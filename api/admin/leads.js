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

export const config = { maxDuration: 10 };

const supabaseAnon = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

console.log("[DEBUG] SUPABASE_URL:", process.env.SUPABASE_URL ? "set" : "MISSING");
console.log("[DEBUG] SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set (len=" + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "MISSING");
console.log("[DEBUG] SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "set" : "MISSING");

const JWT_SECRET = process.env.JWT_SECRET || "duta-integra-admin-secret-change-in-production";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// JWT verification
function verifyToken(token) {
  try {
    const [, body] = token.split(".");
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

function sanitize(str) {
  return String(str || "").trim().slice(0, 500);
}

async function handler(req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // POST — create lead (no auth required, called from contact form)
  // Uses anon key — RLS policy allows INSERT for anon
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
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
      return json({ ok: false, error: "Failed to save lead" }, 500);
    }

    return json({ ok: true, lead: data }, 201);
  }

  // All other methods require auth
  const user = getAuthUser(req);
  if (!user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
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
      // Debug: try raw fetch
      const url = process.env.SUPABASE_URL + "/rest/v1/leads?select=*";
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const rawRes = await fetch(url, {
        headers: { apikey: key, Authorization: "Bearer " + key }
      });
      const rawBody = await rawRes.text();
      console.log("[DEBUG] Raw fetch status:", rawRes.status, "body:", rawBody);
      return json({ ok: false, error: "Failed to fetch leads: " + error.message }, 500);
    }

    // Get counts
    const { data: allLeads } = await supabaseAdmin.from("leads").select("status");

    const counts = {
      all: allLeads?.length || 0,
      new: allLeads?.filter((l) => l.status === "new").length || 0,
      contacted: allLeads?.filter((l) => l.status === "contacted").length || 0,
      closed: allLeads?.filter((l) => l.status === "closed").length || 0,
    };

    return json({ ok: true, leads, total: leads.length, counts });
  }

  // PATCH — update lead status (uses service_role)
  if (req.method === "PATCH") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ ok: false, error: "Lead ID required" }, 400);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
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
      return json({ ok: false, error: "Failed to update lead" }, 500);
    }

    return json({ ok: true, lead: data });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}

export { handler as GET, handler as POST, handler as PATCH };