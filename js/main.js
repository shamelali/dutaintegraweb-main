/* Duta Integra — site behaviour */

const i18n = {
  en: {
    nav_services: "Services",
    nav_work: "Work",
    nav_about: "About",
    nav_pricing: "Pricing",
    nav_quote: "Get a quote",
    hero_badge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    hero_title: "Enterprise-grade AI systems and managed IT, built for Malaysian SMEs",
    hero_lead: "Custom AI apps, chatbots, automation, and secure cloud infrastructure — delivered by a Cyberjaya-based team, since 2021.",
    hero_cta1: "Book a discovery call",
    hero_cta2: "View our work",
    stat1: "Founded",
    stat2: "Client projects",
    stat3: "Core services",
    stat4: "Compliant delivery",
    deliver: "What we deliver",
    deliver_title: "Three retainers. One partner.",
    deliver_sub: "Buyers don’t compare eight line items — they pick a tier. Every engagement is built as monthly recurring work, not a one-off job.",
    t1: "Foundation",
    t1s: "Managed IT, security and PDPA",
    t2: "Growth",
    t2s: "Foundation plus your growth engine",
    t3: "AI Partner",
    t3s: "Growth plus custom AI development",
    popular: "Most chosen",
    start: "Get started",
    propose: "Request a proposal",
    trust: "Trusted by Lapango, Eastelpro, AGMX and growing SME clients across Malaysia",
    outcomes: "See client outcomes →",
    work_eye: "Selected work",
    work_title: "Systems we have shipped",
    why_eye: "Why choose us",
    why_title: "Built for Malaysian SMEs",
    cta_title: "Ready to modernise your business?",
    cta_sub: "Start with a free IT audit or AI readiness assessment — no obligation.",
    cta1: "Book free consultation",
    cta2: "View pricing",
    foot_blurb: "Your AI and IT partner in Malaysia. We help SMEs modernise, automate, and grow through systems that last.",
    company: "Company",
    services: "Services",
    toast: "Message noted. We’ll reply within one business day — or WhatsApp us for something urgent."
  },
  bm: {
    nav_services: "Perkhidmatan",
    nav_work: "Kerja",
    nav_about: "Tentang",
    nav_pricing: "Harga",
    nav_quote: "Minta sebut harga",
    hero_badge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    hero_title: "Sistem AI dan IT terurus peringkat perusahaan, dibina untuk SME Malaysia",
    hero_lead: "Aplikasi AI tersuai, chatbot, automasi, dan infrastruktur awan yang selamat — disampaikan oleh pasukan Cyberjaya, sejak 2021.",
    hero_cta1: "Tempah sesi penemuan",
    hero_cta2: "Lihat kerja kami",
    stat1: "Ditubuhkan",
    stat2: "Projek klien",
    stat3: "Perkhidmatan teras",
    stat4: "Penghantaran patuh",
    deliver: "Apa yang kami sampaikan",
    deliver_title: "Tiga retainer. Satu rakan kongsi.",
    deliver_sub: "Pembeli tidak membandingkan lapan item — mereka memilih tahap. Setiap penglibatan dibina sebagai kerja berulang bulanan.",
    t1: "Foundation",
    t1s: "IT terurus, keselamatan dan PDPA",
    t2: "Growth",
    t2s: "Foundation plus enjin pertumbuhan anda",
    t3: "AI Partner",
    t3s: "Growth plus pembangunan AI tersuai",
    popular: "Paling dipilih",
    start: "Mula sekarang",
    propose: "Minta cadangan",
    trust: "Dipercayai oleh Lapango, Eastelpro, AGMX dan SME yang berkembang di seluruh Malaysia",
    outcomes: "Lihat hasil klien →",
    work_eye: "Kerja terpilih",
    work_title: "Sistem yang telah kami hantar",
    why_eye: "Mengapa pilih kami",
    why_title: "Dibina untuk SME Malaysia",
    cta_title: "Bersedia memodenkan perniagaan anda?",
    cta_sub: "Mulakan dengan audit IT percuma atau penilaian kesediaan AI — tanpa obligasi.",
    cta1: "Tempah perundingan percuma",
    cta2: "Lihat harga",
    foot_blurb: "Rakan kongsi AI dan IT anda di Malaysia. Kami membantu SME memodenkan, mengautomasi, dan berkembang.",
    company: "Syarikat",
    services: "Perkhidmatan",
    toast: "Mesej diterima. Kami balas dalam satu hari bekerja — atau WhatsApp kami jika segera."
  }
};

function isMsPath() {
  return location.pathname === "/ms" || location.pathname.startsWith("/ms/");
}

function currentLang() {
  return isMsPath() ? "bm" : "en";
}

function counterpartPath() {
  const raw = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (raw === "/ms" || raw === "/ms/") return "/";
  if (raw.startsWith("/ms/")) return raw.slice(3) || "/";
  if (raw === "/" || raw === "") return "/ms/";
  return "/ms" + raw;
}

function toggleLang() {
  location.href = counterpartPath();
}

function toggleDark() {
  const on = document.body.classList.toggle("dark");
  localStorage.setItem("theme", on ? "dark" : "light");
  syncThemeIcon();
}

function toggleNav() {
  document.querySelector(".nav")?.classList.toggle("is-open");
}

function closeNav() {
  document.querySelector(".nav")?.classList.remove("is-open");
}

function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.name || !data.email || !data.service) {
    alert("Please fill in name, email, and the service you need.");
    return;
  }
  const btn = form.querySelector("[type=submit]");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending…";

  const payload = {
    name: data.name,
    company: data.company || "",
    email: data.email,
    phone: data.phone || "",
    service: data.service,
    message: data.message || ""
  };

  const done = (ok) => {
    btn.disabled = false;
    btn.textContent = original;
    if (ok) {
      form.reset();
      const t = document.getElementById("toast");
      if (t) {
        t.textContent = i18n[currentLang()].toast;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 4200);
      }
    }
  };

  fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((r) => r.json())
    .then((d) => {
      if (d && d.success) done(true);
      else fallbackWhatsApp(payload, done);
    })
    .catch(() => fallbackWhatsApp(payload, done));
}

function fallbackWhatsApp(payload, done) {
  const text = encodeURIComponent(
    `Hello Duta Integra — ${payload.name} (${payload.company || "company TBC"})\n` +
      `${payload.email} · ${payload.phone || "no phone"}\n` +
      `Interest: ${payload.service}\n\n${payload.message || ""}`
  );
  window.open(`https://wa.me/601154034051?text=${text}`, "_blank", "noopener");
  done(true);
}

const sunIcon =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const moonIcon =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>';

function syncThemeIcon() {
  const on = document.body.classList.contains("dark");
  document.querySelectorAll("[data-theme-icon]").forEach((el) => {
    el.innerHTML = on ? sunIcon : moonIcon;
  });
}

const PROMO_END = new Date("2026-09-12T23:59:59+08:00");

function promoLive() {
  return Date.now() < PROMO_END.getTime();
}

function injectPromoBar() {
  if (!promoLive() || document.querySelector(".promo-bar")) return;
  const bar = document.createElement("div");
  bar.className = "promo-bar";
  const ms = isMsPath();
  bar.innerHTML = ms
    ? '<div class="wrap"><div><strong>Bulan pelancaran</strong> — bulan pertama potongan 50% untuk mana-mana retainer. Tawaran tamat 12 Sep 2026.</div><div><span class="promo-clock" id="promo-clock"></span> &nbsp; <a href="/ms/pricing">Lihat tawaran →</a></div></div>'
    : '<div class="wrap"><div><strong>Launch month</strong> — first month 50% off any retainer. Offer ends 12 Sep 2026.</div><div><span class="promo-clock" id="promo-clock"></span> &nbsp; <a href="/pricing">See offer →</a></div></div>';
  const nav = document.querySelector(".nav");
  if (nav) nav.insertAdjacentElement("afterend", bar);
  else document.body.prepend(bar);
  tickPromoClock();
}

function tickPromoClock() {
  const el = document.getElementById("promo-clock");
  if (!el) return;
  const left = PROMO_END.getTime() - Date.now();
  if (left <= 0) {
    document.body.classList.remove("promo-live");
    document.querySelector(".promo-bar")?.remove();
    return;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  el.textContent = d + "d " + String(h).padStart(2, "0") + "h " + String(m).padStart(2, "0") + "m left";
  setTimeout(tickPromoClock, 30000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
  if (promoLive()) document.body.classList.add("promo-live");
  injectPromoBar();
  applyLang(currentLang());
  syncThemeIcon();
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
});
