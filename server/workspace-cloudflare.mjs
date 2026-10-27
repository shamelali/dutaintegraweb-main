// Phase 4 workspace API was reverted. Keep a minimal assessment scorer so the
// public Digital Assessment tool keeps working; all other workspace endpoints
// return 404.
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

function text(value, max = 500, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const s = value.trim();
  return s.length <= max && (!required || s.length > 0) ? s : null;
}

export async function handleWorkspaceApi(req) {
  const { pathname } = new URL(req.url);
  if (pathname === "/api/workspace/assessments" && req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "content-type": "application/json" } }); }
    const maturity = Number(body?.digitalMaturity);
    if (!Number.isInteger(maturity) || maturity < 1 || maturity > 5) {
      return new Response(JSON.stringify({ error: "Digital maturity must be between 1 and 5." }), { status: 400, headers: { "content-type": "application/json" } });
    }
    const allowed = new Set(["sales", "automation", "security", "ai", "operations", "customer-experience", "data"]);
    const priorities = Array.isArray(body?.priorities) ? [...new Set(body.priorities.filter(x => typeof x === "string" && allowed.has(x)))] : [];
    if (!priorities.length) {
      return new Response(JSON.stringify({ error: "Select at least one business priority." }), { status: 400, headers: { "content-type": "application/json" } });
    }
    const assessment = scoreAssessment(maturity, priorities);
    // Persist as a lead when Supabase is configured (best-effort; never block the score).
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (supabaseUrl && supabaseKey) {
      try {
        const persistRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/leads`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            authorization: `Bearer ${supabaseKey}`,
            "content-type": "application/json",
            prefer: "return=minimal",
          },
          body: JSON.stringify({
            name: text(body.name, 120, true) || "Assessment lead",
            email: text(body.email, 200, true)?.toLowerCase() || "unknown@example.com",
            company: text(body.company, 160, true) || null,
            service: "Digital Assessment",
            status: "new",
            source: "digital-assessment",
            lead_score: assessment.score,
            industry: text(body.industry, 100, true) || null,
            message: `Maturity: ${maturity}/5; priorities: ${priorities.join(", ")}`,
          }),
        });
        if (!persistRes.ok) {
          console.error("[workspace] assessment lead persist failed:", persistRes.status, await persistRes.text());
        }
      } catch (err) {
        console.error("[workspace] assessment lead persist failed:", err?.message || err);
      }
    }
    return new Response(JSON.stringify({
      score: assessment.score,
      maturityLabel: assessment.label,
      recommendations: assessment.recommendations,
      message: "Assessment submitted. Duta Integra can now follow up on your digital roadmap.",
    }), { status: 201, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  return null;
}
