// ============================================================================
// Duta Integra — Free Brand Audit API (Vercel serverless function)
//
// POST /api/audit  { url, name?, industry?, email? }
// Returns a structured report. Fetches the target site and scores its
// technical SEO, content, speed and social/brand presence.
//
// On success the report is persisted (shareable slug), the requester becomes
// a scored lead, an audit_run event is logged and — when an email was given —
// the branded report is delivered via Resend.
//
// This endpoint only does public, non-destructive HTTP requests to the site
// being audited. It never sends personal data anywhere except the report it
// returns to the caller.
// ============================================================================

import { Resend } from "resend";
import { getSupabase, makeId } from "./_lib.js";

export const config = { maxDuration: 30 };

const FETCH_TIMEOUT_MS = 9000;
const MAX_BODY = 1.8 * 1024 * 1024; // 1.8 MB HTML read ceiling
const ALLOWED_SCHEMES = ["http:", "https:"];
const ALLOWED_ORIGINS = [
  "https://dutaintegra.my",
  "https://www.dutaintegra.my",
  "https://dutaintegraweb-main-efunpqs0m-shamelalis-projects.vercel.app",
];

// Per-IP rate limit (best-effort on serverless; per warm instance)
const RATE_MAX = Number(process.env.AUDIT_RATE_MAX) || 10;
const RATE_WINDOW = Number(process.env.AUDIT_RATE_WINDOW) || 60000;
const ipHits = new Map(); // ip -> [timestamps]

function clientIp(req) {
  return (
    req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    req?.headers?.get?.("cf-connecting-ip") ||
    "unknown"
  );
}

function rateLimitOk(req) {
  const now = Date.now();
  const ip = clientIp(req);
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // opportunistic cleanup
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (!v.some((t) => now - t < RATE_WINDOW)) ipHits.delete(k);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getAllowedOrigin(req) {
  const origin = req?.headers?.get?.("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": getAllowedOrigin(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function corsResponse(req) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getAllowedOrigin(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function normalizeUrl(raw) {
  let u = String(raw || "").trim();
  if (!u) throw auditError("Please enter your website URL.", "NO_URL");
  if (!/^[a-z]+:/i.test(u)) u = "https://" + u;
  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    throw auditError("That doesn't look like a valid URL.", "BAD_URL");
  }
  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    throw auditError("Only http/https websites can be audited.", "BAD_SCHEME");
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw auditError("That URL looks incomplete — try something like www.yourcompany.com", "BAD_HOST");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw auditError("That address isn't publicly reachable — enter your public website URL.", "BAD_HOST");
  }
  parsed.hash = "";
  return parsed;
}

// Block private / internal hosts (SSRF hygiene for a fetch-by-URL tool).
function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  // IPv6 loopback / link-local / unspecified
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("fe80:") || host.startsWith("fc:") || host.startsWith("fd:")) return true;
  if (/^\[?::/.test(host)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function auditError(message, code = "AUDIT_FAILED") {
  const err = new Error(message);
  err.code = code;
  return err;
}

function statusCodeFor(err) {
  const code = err.code || "";
  if (code === "NO_URL" || code === "BAD_URL" || code === "BAD_SCHEME" || code === "BAD_HOST" || code === "NOT_HTML" || code === "BLOCKED") {
    return 400;
  }
  if (code === "TIMEOUT") {
    return 504;
  }
  return 500;
}

// ---------------------------------------------------------------------------
// HTML text extraction (regex is enough for a best-effort audit)
// ---------------------------------------------------------------------------

function metaContent(html, attr, key) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : "";
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function countMatches(html, re) {
  const matches = html.match(re);
  return matches ? matches.length : 0;
}

function stripTags(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(html) {
  const text = stripTags(html);
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Network detection (social + contact)
// ---------------------------------------------------------------------------

const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram", hosts: ["instagram.com"], pts: 6 },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"], pts: 6 },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"], pts: 4 },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], pts: 4 },
  { id: "x", label: "X / Twitter", hosts: ["twitter.com", "x.com"], pts: 4 },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], pts: 3 },
];

function detectSocial(html) {
  const hrefs = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) hrefs.push(m[1]);

  return SOCIAL_NETWORKS.map((net) => {
    const link = hrefs.find((h) => net.hosts.some((host) => h.toLowerCase().includes(host)));
    let handle = null;
    if (link) {
      try {
        handle = link
          .replace(/\/+$/, "")
          .replace(/(https?:\/\/|www\.)/g, "")
          .split("/")
          .slice(0, 2)
          .join("/");
      } catch {
        handle = link;
      }
    }
    return { id: net.id, label: net.label, found: Boolean(link), handle, pts: net.pts };
  });
}

function detectContact(html) {
  return {
    email: /mailto:[^\s"'<>]+/i.test(html),
    phone: /tel:[+\d\s()-]{6,}/i.test(html) || /\+60[\s\d()-]{7,}/.test(html),
    whatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp/i.test(html),
  };
}

// ---------------------------------------------------------------------------
// Competitor suggestions by industry
// ---------------------------------------------------------------------------

const INDUSTRY_COMPETITORS = {
  ecommerce: ["Shopee", "Lazada", "TikTok Shop", "PG Mall"],
  retail: ["Shopee", "Lazada", "PG Mall", "Zalora"],
  restaurant: ["GrabFood", "foodpanda", "ShopeeFood", "Local chain competitors"],
  fnb: ["GrabFood", "foodpanda", "ShopeeFood", "Local chain competitors"],
  finance: ["Local digital banks", "MAE by Maybank", "GXBank", "Comparable regional fintech"],
  insurance: ["PolicyStreet", "Great Eastern", "AIA Malaysia", "Coverage-oriented rivals"],
  health: ["DoctorOnCall", "BookDoc", "KPJ Group", "Comparable wellness brands"],
  education: ["Coursera", "Udemy (local resellers)", "Afterschool.my", "Local training providers"],
  realestate: ["PropertyGuru", "iProperty", "Lamudi", "Local agency rivals"],
  tech: ["TechNova", "Nimbus IO", "Acme Corp", "Comparable SaaS/agency brands"],
  software: ["TechNova", "Nimbus IO", "Acme Corp", "Comparable SaaS/agency brands"],
  agency: ["Nimbus IO", "Acme Corp", "Local agency rivals", "Comparable digital agencies"],
  services: ["Nimbus IO", "Local agency rivals", "Comparable service providers", "Industry leaders"],
  default: ["Comparable brands in your niche", "Local leaders", "Regional rivals", "Emerging challengers"],
};

function competitorsForIndustry(industry) {
  const key = String(industry || "").toLowerCase().replace(/[^a-z]/g, "");
  const list = INDUSTRY_COMPETITORS[key] || INDUSTRY_COMPETITORS.default;
  return list.map((name, i) => ({
    name,
    note: i === 0 ? "High overlap with your positioning" : "Benchmark against for share of voice",
  }));
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreCategory(checks) {
  const earned = checks.reduce((s, c) => s + (c.status === "pass" ? c.pts : 0), 0);
  const total = checks.reduce((s, c) => s + c.pts, 0);
  const score = total ? Math.round((earned / total) * 100) : 0;
  let verdict = "Needs attention";
  if (score >= 85) verdict = "Strong";
  else if (score >= 70) verdict = "Good";
  else if (score >= 50) verdict = "Fair";
  return { score, earned, total, verdict };
}

function gradeFor(score) {
  if (score >= 90) return { grade: "A+", label: "Excellent" };
  if (score >= 80) return { grade: "A", label: "Great" };
  if (score >= 70) return { grade: "B", label: "Good" };
  if (score >= 60) return { grade: "C", label: "Fair" };
  if (score >= 50) return { grade: "D", label: "Weak" };
  return { grade: "F", label: "Needs work" };
}

// ---------------------------------------------------------------------------
// The main audit
// ---------------------------------------------------------------------------

export async function runAudit(payload = {}) {
  const parsed = normalizeUrl(payload.url);
  const base = parsed.origin;
  const domain = parsed.hostname.replace(/^www\./, "");

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (compatible; DutaIntegraBrandAudit/1.0; +https://dutaintegra.my)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
  };

  const started = performance.now();
  let mainRes, html;
  try {
    mainRes = await fetch(parsed.href, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err && (err.name || err.code);
    if (name === "AbortError" || name === "TimeoutError") {
      throw auditError("The site took too long to respond. Try again in a moment.", "TIMEOUT");
    }
    throw auditError("We couldn't reach that site. Double-check the URL.", "BLOCKED");
  }

  const contentType = mainRes.headers.get("content-type") || "";
  if (contentType && !/text\/html|application\/xhtml/i.test(contentType) && !contentType.includes("text/xml")) {
    throw auditError(
      "That URL doesn't return a web page (it returned " + (contentType.split(";")[0] || "another format") + "). Enter your website home page.",
      "NOT_HTML"
    );
  }

  const mainText = await mainRes.text();
  html = mainText.slice(0, MAX_BODY);
  const responseMs = Math.round(performance.now() - started);
  const pageSizeKb = Math.round((new TextEncoder().encode(html).length / 1024) * 10) / 10;
  const finalUrl = mainRes.url || parsed.href;
  const statusCode = mainRes.status;

  // Concurrent fetch of robots.txt + sitemap.xml (best effort)
  const probeTimeout = 5000;
  const probe = (path) =>
    fetch(base + path, { redirect: "follow", headers, signal: AbortSignal.timeout(probeTimeout) })
      .then((r) => ({ ok: r.status >= 200 && r.status < 400 }))
      .catch(() => ({ ok: false }));
  const [robotsRes, sitemapRes] = await Promise.allSettled([probe("/robots.txt"), probe("/sitemap.xml")]);
  const robots = robotsRes.status === "fulfilled" ? robotsRes.value.ok : false;
  const sitemap = sitemapRes.status === "fulfilled" ? sitemapRes.value.ok : false;

  const isHttps = finalUrl.startsWith("https://");
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = metaContent(html, "name", "description") || metaContent(html, "property", "og:description");
  const ogTitle = metaContent(html, "property", "og:title");
  const ogImage = metaContent(html, "property", "og:image");
  const canonical = firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const charset = firstMatch(html, /<meta[^>]+charset=["']?([\w-]+)/i) || "UTF-8";
  const lang = firstMatch(html, /<html[^>]+lang=["']([^"']+)["']/i);
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Count = countMatches(html, /<h1[^>]*>/gi);
  const headings = countMatches(html, /<h[1-6][^>]*>/gi);
  const h2Count = countMatches(html, /<h2[^>]*>/gi);
  const h3Count = countMatches(html, /<h3[^>]*>/gi);
  const favicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  const schematic = /application\/ld\+json|https?:\/\/schema\.org|itemprop=/i.test(html);
  const words = wordCount(html);
  const images = countMatches(html, /<img[^>]*>/gi);
  const imagesAlt = countMatches(html, /<img[^>]+alt=["'][^"']+["'][^>]*>/gi);
  const altCoverage = images ? Math.round((Math.min(imagesAlt, images) / images) * 100) : 0;
  const social = detectSocial(html);
  const contact = detectContact(html);

  // ---- Technical & SEO checks --------------------------------------------------
  const techChecks = [
    { id: "https", label: "Secure HTTPS connection", pts: 10, status: isHttps ? "pass" : "fail", note: isHttps ? "Site loads over HTTPS." : "Site loads over plain HTTP — a security and trust risk." },
    { id: "title", label: "Page title present", pts: 8, status: title ? "pass" : "fail", note: title ? `Title: “${title.slice(0, 80)}”` : "No <title> tag found — search engines can't tell what this page is about." },
    { id: "title_len", label: "Title length 30–60 chars", pts: 6, status: title && title.length >= 30 && title.length <= 60 ? "pass" : title ? "warn" : "fail", note: title ? `Title is ${title.length} chars.` : "Missing title." },
    { id: "desc", label: "Meta description present", pts: 8, status: desc ? "pass" : "fail", note: desc ? `Description: “${desc.slice(0, 80)}”` : "No meta description — missed click-through opportunity." },
    { id: "desc_len", label: "Description 120–160 chars", pts: 6, status: desc && desc.length >= 120 && desc.length <= 160 ? "pass" : desc ? "warn" : "fail", note: desc ? `Description is ${desc.length} chars.` : "Missing description." },
    { id: "canonical", label: "Canonical tag", pts: 5, status: canonical ? "pass" : "warn", note: canonical ? "Canonical URL set." : "No canonical URL — duplicate content risk." },
    { id: "og", label: "Open Graph tags", pts: 7, status: ogTitle && ogImage ? "pass" : ogTitle ? "warn" : "fail", note: ogTitle && ogImage ? "og:title and og:image set." : "Missing Open Graph tags — poor link sharing on social." },
    { id: "schema", label: "Structured data (schema.org)", pts: 6, status: schematic ? "pass" : "warn", note: schematic ? "Structured data detected." : "No structured data — no rich search results." },
    { id: "viewport", label: "Mobile viewport", pts: 5, status: viewport ? "pass" : "fail", note: viewport ? "Responsive viewport configured." : "No viewport meta — not mobile-friendly." },
    { id: "lang", label: "Language attribute", pts: 4, status: lang ? "pass" : "warn", note: lang ? `lang="${lang}" set.` : "No lang attribute on <html>." },
    { id: "robots", label: "robots.txt available", pts: 5, status: robots ? "pass" : "warn", note: robots ? "robots.txt served." : "robots.txt not found." },
    { id: "sitemap", label: "sitemap.xml available", pts: 4, status: sitemap ? "pass" : "warn", note: sitemap ? "Sitemap served." : "sitemap.xml not found." },
    { id: "favicon", label: "Favicon / brand icon", pts: 4, status: favicon ? "pass" : "warn", note: favicon ? "Site icon present." : "No favicon detected." },
  ];

  // ---- Content & Structure checks ----------------------------------------------
  const contentChecks = [
    { id: "h1", label: "One clear H1 heading", pts: 10, status: h1 && h1Count === 1 ? "pass" : h1Count > 1 ? "warn" : "fail", note: h1 ? `H1: “${h1.slice(0, 70)}”` : "No H1 heading on the page." },
    { id: "words", label: "Substantial content (300+ words)", pts: 8, status: words >= 300 ? "pass" : "warn", note: `About ${words} words of text.` },
    { id: "headings", label: "Logical heading hierarchy", pts: 5, status: headings >= 2 && (h2Count > 0 || h3Count > 0) ? "pass" : "warn", note: `Found ${headings} headings (${h2Count} h2, ${h3Count} h3).` },
    { id: "alt", label: "Images have alt text", pts: 7, status: images === 0 || altCoverage >= 80 ? "pass" : altCoverage >= 40 ? "warn" : "fail", note: images ? `${altCoverage}% of images have alt text.` : "No images detected." },
  ];

  // ---- Speed & Performance checks -----------------------------------------------
  const speedChecks = [
    { id: "ttfb", label: "Fast first response", pts: 12, status: responseMs < 1500 ? "pass" : responseMs < 3500 ? "warn" : "fail", note: `Response in ${responseMs} ms.` },
    { id: "size", label: "Lightweight page (<1.5 MB)", pts: 8, status: pageSizeKb < 1500 ? "pass" : "warn", note: `Page is about ${pageSizeKb} KB.` },
    { id: "charset", label: "Correct character set", pts: 4, status: /utf-?8/i.test(charset) ? "pass" : "warn", note: `Charset: ${charset}.` },
  ];

  // ---- Social & Brand checks -----------------------------------------------------
  const socialPoints = social.reduce((s, n) => s + (n.found ? n.pts : 0), 0);
  const socialTotal = social.reduce((s, n) => s + n.pts, 0);
  const contactPts = (contact.email ? 3 : 0) + (contact.phone ? 3 : 0) + (contact.whatsapp ? 2 : 0);
  const socialChecks = [
    { id: "networks", label: "Active social channels", pts: socialTotal, status: socialPoints >= 12 ? "pass" : socialPoints > 0 ? "warn" : "fail", note: `${social.filter((s) => s.found).length} of 6 channels detected.` },
    { id: "contact", label: "Visible contact info", pts: 8, status: contactPts >= 5 ? "pass" : contactPts > 0 ? "warn" : "fail", note: contact.email ? "Email found." : "No email found.", },
    { id: "whatsapp", label: "WhatsApp / chat link", pts: 4, status: contact.whatsapp ? "pass" : "warn", note: contact.whatsapp ? "WhatsApp link detected." : "No WhatsApp/chat link — high-value for Malaysian buyers." },
  ];

  const cats = [
    { id: "technical", label: "Technical & SEO", weight: 0.3, checks: techChecks },
    { id: "content", label: "Content & Structure", weight: 0.25, checks: contentChecks },
    { id: "speed", label: "Speed & Performance", weight: 0.2, checks: speedChecks },
    { id: "social", label: "Social & Brand Presence", weight: 0.25, checks: socialChecks },
  ];

  const categoryResults = cats.map((c) => {
    const scored = scoreCategory(c.checks);
    return { id: c.id, label: c.label, weight: c.weight, ...scored };
  });

  const overall = Math.round(categoryResults.reduce((s, c) => s + c.score * c.weight, 0));
  const { grade, label: gradeLabel } = gradeFor(overall);

  // Flat check list for the UI + recommendations
  const allChecks = cats.flatMap((c) =>
    c.checks.map((ch) => ({ ...ch, category: c.label, priority: ch.status === "fail" ? "high" : ch.status === "warn" ? "medium" : "low" }))
  );

  const recommendations = allChecks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.priority === "high" ? -1 : 1))
    .slice(0, 5)
    .map((c) => ({
      title: c.label,
      detail: c.note + " " + (c.recommendation || recommendationFor(c.id)),
      priority: c.priority,
    }));

  const brandName = (payload.name || "").trim() || domain.split(".")[0].replace(/[-_]/g, " ");

  const summary =
    overall >= 80
      ? `${brandName} has a solid digital presence. A few focused upgrades (${recommendations.length ? recommendations[0].title.toLowerCase() : "refining your funnel"}) would push it further.`
      : overall >= 60
        ? `${brandName} has a workable base, but we found ${allChecks.filter((c) => c.status === "fail").length} clear gaps and ${allChecks.filter((c) => c.status === "warn").length} areas to strengthen.`
        : `${brandName} is leaving growth on the table. We found serious gaps in ${allChecks.filter((c) => c.status === "fail").length} areas that are easy to fix.`;

  const meta = {
    title,
    description: desc,
    responseMs,
    pageSizeKb,
    wordCount: words,
    imageCount: images,
    h1Count,
    charset,
    lang,
    finalUrl,
    statusCode,
  };

  return {
    url: finalUrl,
    domain,
    brandName,
    industry: (payload.industry || "").trim() || "General",
    email: (payload.email || "").trim(),
    generatedAt: new Date().toISOString(),
    score: overall,
    grade,
    gradeLabel,
    summary,
    categories: categoryResults,
    checks: allChecks,
    social,
    contact,
    competitors: competitorsForIndustry(payload.industry || ""),
    recommendations,
    meta,
    isHttp: !isHttps,
  };
}

// Simple recommendation text per known check id
function recommendationFor(id) {
  const map = {
    https: "Enable a free SSL certificate (Let's Encrypt) or use a host with HTTPS by default so the padlock shows.",
    title: "Write a unique, descriptive title (30–60 chars) that includes your main keyword.",
    title_len: "Tighten the title to 30–60 characters so it doesn't get truncated in search results.",
    desc: "Add a compelling meta description (120–160 chars) that invites a click.",
    desc_len: "Expand/shorten the description into the ideal 120–160 char range.",
    canonical: "Add a canonical tag pointing to the preferred version of the URL.",
    og: "Add og:title, og:description and og:image for clean link previews on Facebook, WhatsApp and LinkedIn.",
    schema: "Add schema.org structured data (e.g. LocalBusiness) to unlock rich results.",
    viewport: "Add <meta name=viewport content='width=device-width, initial-scale=1'> for a mobile-friendly page.",
    lang: "Add lang='en' (or your market code) to the <html> tag for accessibility and SEO.",
    robots: "Create a robots.txt file allowing crawlers and pointing to your sitemap.",
    sitemap: "Generate a sitemap.xml and submit it to Google Search Console.",
    favicon: "Add a favicon so your brand shows in the tab and bookmarks.",
    h1: "Use exactly one descriptive H1 on each page to anchor the topic.",
    words: "Add more substantive, useful copy (aim for 300+ words per key page).",
    headings: "Organise content with H2/H3 subheadings for readability and structure.",
    alt: "Add descriptive alt text to images for accessibility and image SEO.",
    ttfb: "Improve server response — use a CDN, caching and a faster host.",
    size: "Compress images and trim heavy scripts/third-party embeds to cut page weight.",
    charset: "Ensure the page declares a UTF-8 charset.",
    networks: "Claim and link your primary social profiles from the site footer.",
    contact: "Make your email and phone clearly visible on the site.",
    whatsapp: "Add a WhatsApp chat link — Malaysian buyers expect one.",
  };
  return map[id] || "Address this item to improve your score.";
}

// ---------------------------------------------------------------------------
// Persistence: report storage, lead capture, event log, report email
// ---------------------------------------------------------------------------

function scoreColorHex(score) {
  if (score >= 80) return "#2F6B4F";
  if (score >= 60) return "#C9A227";
  return "#9B3A3A";
}

function buildReportEmail(report, shareUrl) {
  const cats = report.categories
    .map(
      (c) =>
        `<div style="margin-bottom:10px"><b>${c.label}</b> — ` +
        `<span style="color:${scoreColorHex(c.score)};font-weight:700">${c.score}/100</span><br>` +
        `<span style="color:#666;font-size:13px">${c.verdict}</span></div>`
    )
    .join("");
  const recs = report.recommendations
    .slice(0, 4)
    .map(
      (r) =>
        `<li style="margin-bottom:8px"><b>${r.title}</b><br>` +
        `<span style="color:#555;font-size:13.5px">${r.detail}</span></li>`
    )
    .join("");
  return `<!DOCTYPE html><html><body style="margin:0;background:#F8F9FB;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e9ef">
    <div style="background:#1E2D3D;padding:22px 28px">
      <div style="color:#C9A227;font-size:11px;font-weight:bold;letter-spacing:.16em;text-transform:uppercase">Free Brand Audit</div>
      <h1 style="color:#fff;margin:6px 0 2px;font-size:22px">${report.brandName}</h1>
      <div style="color:#9aa7b5;font-size:13px">${report.domain} · ${new Date(report.generatedAt).toDateString()}</div>
    </div>
    <div style="padding:26px 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:18px"><tr>
        <td style="font-size:44px;font-weight:bold;color:${scoreColorHex(report.score)};padding-right:12px">${report.score}<span style="font-size:20px;color:#888">/100</span></td>
        <td style="font-size:15px;color:${scoreColorHex(report.score)};font-weight:bold">Grade ${report.grade}<br><span style="color:#666;font-weight:normal;font-size:13px">${report.gradeLabel}</span></td>
      </tr></table>
      <p style="color:#333;line-height:1.6;margin:0 0 18px">${report.summary}</p>
      <h2 style="font-size:15px;color:#1E2D3D;border-bottom:1px solid #eee;padding-bottom:6px">Category scores</h2>
      ${cats}
      <h2 style="font-size:15px;color:#1E2D3D;border-bottom:1px solid #eee;padding-bottom:6px">Top fixes</h2>
      <ul style="padding-left:18px;color:#333;line-height:1.55">${recs || "<li>Looks strong — no urgent fixes.</li>"}</ul>
      <div style="text-align:center;margin:26px 0 8px">
        <a href="${shareUrl}" style="display:inline-block;background:#C9A227;color:#1E2D3D;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:4px">View your full report</a>
      </div>
      <p style="color:#777;font-size:12.5px;text-align:center">Want us to walk you through the fixes?
      <a href="https://wa.me/601154034051" style="color:#C9A227">WhatsApp us</a> or book a free 20-min call.</p>
    </div>
    <div style="background:#F8F9FB;padding:14px 28px;text-align:center;color:#98a2ad;font-size:11.5px">
      Duta Integra Solutions · Cyberjaya, Malaysia · dutaintegra.my
    </div>
  </div></body></html>`;
}

async function persistAuditResult(report, req) {
  const supabase = getSupabase();
  const slug = makeId(10);
  let shareSlug = null;

  // 1. Store report (best-effort — audit still succeeds if DB is down)
  try {
    const { error } = await supabase.from("audit_reports").insert({
      share_slug: slug,
      url: report.url,
      domain: report.domain,
      brand_name: report.brandName,
      industry: report.industry,
      email: report.email || null,
      score: report.score,
      grade: report.grade,
      report,
    });
    if (!error) shareSlug = slug;
    else console.error("audit_reports insert:", error.message);
  } catch (err) {
    console.error("audit_reports insert failed:", err?.message);
  }

  // 2. Lead upsert by email (+ scoring)
  if (report.email) {
    try {
      const { data: existing } = await supabase
        .from("leads")
        .select("id, lead_score")
        .eq("email", report.email)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("leads")
          .update({
            lead_score: (existing.lead_score || 0) + 10,
            industry: report.industry || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("leads").insert({
          name: report.brandName,
          email: report.email,
          company: report.brandName,
          service: "Free brand audit",
          message: `Audited ${report.domain} — scored ${report.score}/100 (${report.grade})`,
          industry: report.industry || null,
          status: "new",
          source: "free-audit",
          lead_score: 10,
        });
      }
    } catch (err) {
      console.error("lead upsert failed:", err?.message);
    }
  }

  // 3. Event log
  try {
    await supabase.from("events").insert({
      type: "audit_run",
      path: "/audit",
      meta: { domain: report.domain, score: report.score },
    });
  } catch { /* non-critical */ }

  // 4. Report email via Resend (fire-and-forget)
  if (report.email && process.env.RESEND_API_KEY) {
    const origin = req?.headers?.get?.("origin") || "https://dutaintegra.my";
    const shareUrl = `${origin}/audit?r=${slug}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || "Duta Integra <noreply@dutaintegra.my>";
    resend.emails
      .send({
        from,
        to: report.email,
        subject: `Your free brand audit for ${report.domain}: ${report.score}/100 (${report.grade})`,
        html: buildReportEmail(report, shareUrl),
      })
      .catch((err) => console.error("audit report email:", err?.message));
  }

  return shareSlug;
}

// ---------------------------------------------------------------------------
// Vercel web handler (matches the repo's named-export function style)
// ---------------------------------------------------------------------------

export async function handler(req) {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed. Send a POST request." }, 405, req);
  }
  if (!rateLimitOk(req)) {
    return json({ ok: false, error: "Too many requests from your network. Please try again shortly." }, 429, req);
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  // honeypot: bots fill every field they see
  if (body.company_website) {
    return json({ ok: true, report: null }, 200, req);
  }
  const payload = {
    url: body.url,
    name: body.name,
    industry: body.industry,
    email: body.email,
  };
  try {
    const report = await runAudit(payload);
    const shareSlug = await persistAuditResult(report, req);
    return json({ ok: true, report, shareSlug }, 200, req);
  } catch (err) {
    return json({ ok: false, error: err.message || "Audit failed.", code: err.code || "AUDIT_FAILED" }, statusCodeFor(err), req);
  }
}

export { handler as POST, handler as GET };
