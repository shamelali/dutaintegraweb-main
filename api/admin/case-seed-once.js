// TEMPORARY one-shot case-study seeder — removed after use.
// GET /api/admin/case-seed-once?key=<k>

import { getSupabase, json } from "../_lib.js";

export const config = { maxDuration: 20 };

const ONCE_KEY = "cs33d-5v8n2q7x-m4t9w";

const STUDIES = [
  {
    client_name: "AGMX",
    category: "Cloud migration & managed IT",
    summary_en:
      "Moved an established SME onto managed cloud infrastructure with monitoring, backups, and a documented incident response — then stayed on as the ongoing IT retainer.",
    summary_ms:
      "Mengalihkan PKS yang mantap ke infrastruktur awan terurus dengan pemantauan, sandaran dan tindak balas insiden — kemudian kekal sebagai perkhidmatan IT berterusan.",
    image_url: "https://dutaintegra.my/assets/img/work-agmx.jpg",
    metrics: [
      { value: "0", label: "Weekday downtime" },
      { value: "99.5%", label: "Uptime target" },
      { value: "<4h", label: "RTO/RPO" },
    ],
    outcomes: [
      "Cloud migration planned and executed without a weekend outage",
      "Automated backups and restore runbooks in place",
      "Retained under Foundation for ongoing monitoring and helpdesk",
    ],
    tags: ["Cloud", "Backups", "Managed IT"],
    detail_url: "/cases/agmx",
    sort_order: 1,
  },
  {
    client_name: "Eastelpro",
    category: "Managed IT · WiFi marketing portal",
    summary_en:
      "Set up a WiFi marketing portal for customer capture, alongside managed network and helpdesk support. Lead capture now flows directly into the sales pipeline instead of a notebook.",
    summary_ms:
      "Membina portal pemasaran WiFi untuk pengumpulan pelanggan, bersama sokongan rangkaian dan helpdesk terurus. Petunjuk kini mengalir terus ke saluran jualan.",
    image_url: "https://dutaintegra.my/assets/img/work-eastelpro.jpg",
    metrics: [
      { value: "~65%", label: "Visitor opt-in" },
      { value: "Min", label: "Follow-up time" },
      { value: "99.5%", label: "Uptime target" },
    ],
    outcomes: [
      "Branded WiFi captive portal for visitor lead capture",
      "Network monitoring and remote helpdesk rolled in",
      "Leads routed straight into CRM follow-up",
    ],
    tags: ["Managed IT", "WiFi portal", "Lead capture"],
    detail_url: "/cases/eastelpro",
    sort_order: 2,
  },
  {
    client_name: "Dutaconnect",
    category: "AI software · Chatbot",
    summary_en:
      "An AI assistant built to answer customer questions from the business's own documentation, integrated into the existing website and messaging channels to reduce repeated support work.",
    summary_ms:
      "Pembantu AI yang menjawab soalan pelanggan berdasarkan dokumen syarikat sendiri, disepadukan ke laman web dan saluran mesej sedia ada.",
    image_url: "https://dutaintegra.my/assets/img/work-dutaconnect.jpg",
    metrics: [
      { value: "~65%", label: "Enquiries handled" },
      { value: "24/7", label: "First response" },
      { value: "0", label: "Made-up answers" },
    ],
    outcomes: [
      "Retrieval-based assistant grounded in company knowledge",
      "Embedded into the existing site, no rip-and-replace",
      "Handover to a human when the question needs one",
    ],
    tags: ["AI", "Chatbot", "Integration"],
    detail_url: "/cases/dutaconnect",
    sort_order: 3,
  },
  {
    client_name: "Leish",
    category: "Custom web app · Booking platform",
    summary_en:
      "A booking marketplace for a beauty services brand — a custom web application handling discovery, scheduling, and customer flow rather than a generic off-the-shelf theme.",
    summary_ms:
      "Pasaran tempahan untuk jenama perkhidmatan kecantikan — aplikasi web tersuai untuk carian, penjadualan dan aliran pelanggan.",
    image_url: "https://dutaintegra.my/assets/img/work-leish.jpg",
    metrics: [
      { value: "~80%+", label: "Mobile traffic" },
      { value: "<90s", label: "To book" },
      { value: "1", label: "Extendable codebase" },
    ],
    outcomes: [
      "Custom booking flow tailored to the service model",
      "Mobile-first storefront for on-the-go bookings",
      "Built to extend into payments and notifications",
    ],
    tags: ["Web app", "Booking", "Custom build"],
    detail_url: "/cases/leish",
    sort_order: 4,
  },
].map((s) => ({ ...s, status: "published" }));

async function handler(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== ONCE_KEY) return json({ ok: false }, 401);

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("case_studies").select("id, client_name");
  const byName = new Map((existing || []).map((c) => [c.client_name, c.id]));

  let updated = [], inserted = [];
  for (const s of STUDIES) {
    const id = byName.get(s.client_name);
    if (id) {
      const { error } = await supabase.from("case_studies").update(s).eq("id", id);
      if (!error) updated.push(s.client_name);
    } else {
      const { error } = await supabase.from("case_studies").insert(s);
      if (!error) inserted.push(s.client_name);
    }
  }
  return json({ ok: true, updated, inserted });
}

export { handler as GET };
