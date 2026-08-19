/* Duta Integra — site behaviour */

const i18n = {
  en: {
    nav_services: "Services",
    nav_work: "Work",
    nav_about: "About",
    nav_pricing: "Pricing",
    nav_quote: "Get a quote",
    hero_badge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    hero_title: 'Enterprise-grade <em class="accent">AI systems</em> and <em class="accent">managed IT</em>, built for <em class="accent">Malaysian SMEs</em>',
    hero_lead: "Custom AI apps, chatbots, automation, and secure cloud infrastructure — delivered by a Cyberjaya-based team, since 2025.",
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
    why_title: 'Built for <em class="accent">Malaysian SMEs</em>',
    cta_title: 'Ready to <em class="accent">modernise</em> your business?',
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
    hero_title: 'Sistem <em class="accent">AI</em> dan <em class="accent">IT terurus</em> peringkat perusahaan, dibina untuk <em class="accent">SME Malaysia</em>',
    hero_lead: "Aplikasi AI tersuai, chatbot, automasi, dan infrastruktur awan yang selamat — disampaikan oleh pasukan Cyberjaya, sejak 2025.",
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
    why_title: 'Dibina untuk <em class="accent">SME Malaysia</em>',
    cta_title: 'Bersedia <em class="accent">memodenkan</em> perniagaan anda?',
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
  const goingMs = !isMsPath();
  localStorage.setItem("lang", goingMs ? "ms" : "en");
  location.href = counterpartPath();
}

function rememberLangFromPath() {
  localStorage.setItem("lang", isMsPath() ? "ms" : "en");
}

function enforceLangPreference() {
  const pref = localStorage.getItem("lang");
  if (pref === "ms" && !isMsPath()) {
    location.replace(counterpartPath());
    return true;
  }
  return false;
}

function bindLangSwitch() {
  document.querySelectorAll(".lang-switch a[hreflang]").forEach((a) => {
    a.addEventListener("click", () => {
      localStorage.setItem("lang", a.getAttribute("hreflang") === "ms" ? "ms" : "en");
    });
  });
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

function showToast(message, isError) {
  const t = document.getElementById("toast");
  if (!t) {
    if (isError) alert(message);
    return;
  }
  t.textContent = message;
  t.classList.toggle("is-error", !!isError);
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), isError ? 5200 : 4200);
}

function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const ms = isMsPath();

  // Honeypot
  if (data.website || data.hp) return;

  if (!data.name || !data.email || !data.service) {
    showToast(
      ms
        ? "Sila isi nama, e-mel, dan perkhidmatan yang diperlukan."
        : "Please fill in name, email, and the service you need.",
      true
    );
    return;
  }

  const btn = form.querySelector("[type=submit]");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = ms ? "Menghantar…" : "Sending…";

  const payload = {
    name: String(data.name || "").trim(),
    company: String(data.company || "").trim(),
    email: String(data.email || "").trim(),
    phone: String(data.phone || "").trim(),
    service: String(data.service || "").trim(),
    message: String(data.message || "").trim(),
    website: data.website || "",
  };

  const finish = (ok, note) => {
    btn.disabled = false;
    btn.textContent = original;
    if (ok) {
      form.reset();
      // Re-apply interest query if present
      prefillserviceFromQuery(form);
      showToast(note || i18n[currentLang()].toast, false);
    } else if (note) {
      showToast(note, true);
    }
  };

  fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (r) => {
      let d = null;
      try {
        d = await r.json();
      } catch {
        d = null;
      }
      if (r.ok && d && d.success) {
        finish(true);
        return;
      }
      // API missing key / server down → graceful WhatsApp fallback
      if (r.status === 503 || r.status >= 500 || !r.ok) {
        fallbackWhatsApp(payload, () =>
          finish(
            true,
            ms
              ? "E-mel sementara tidak tersedia — kami buka WhatsApp supaya anda boleh hantar terus."
              : "Email is temporarily unavailable — opening WhatsApp so you can send directly."
          )
        );
        return;
      }
      finish(
        false,
        (d && d.error) ||
          (ms ? "Gagal menghantar. Cuba lagi atau WhatsApp kami." : "Could not send. Try again or WhatsApp us.")
      );
    })
    .catch(() => {
      fallbackWhatsApp(payload, () =>
        finish(
          true,
          ms
            ? "Sambungan gagal — kami buka WhatsApp sebagai sandaran."
            : "Connection failed — opening WhatsApp as a fallback."
        )
      );
    });
}

function fallbackWhatsApp(payload, done) {
  const text = encodeURIComponent(
    `Hello Duta Integra — ${payload.name} (${payload.company || "company TBC"})\n` +
      `${payload.email} · ${payload.phone || "no phone"}\n` +
      `Interest: ${payload.service}\n\n${payload.message || ""}`
  );
  window.open(`https://wa.me/601154034051?text=${text}`, "_blank", "noopener");
  if (typeof done === "function") done(true);
}

function prefillserviceFromQuery(form) {
  const root = form || document.querySelector("form.form");
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const interest = params.get("interest") || params.get("service");
  if (!interest) return;
  const select = root.querySelector("[name=service]");
  if (!select) return;
  const want = interest.trim().toLowerCase();
  let matched = false;
  Array.from(select.options).forEach((opt) => {
    if (opt.value && opt.value.toLowerCase() === want) {
      select.value = opt.value;
      matched = true;
    }
  });
  if (!matched) {
    // fuzzy contains
    Array.from(select.options).forEach((opt) => {
      if (!matched && opt.value && (want.includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(want))) {
        select.value = opt.value;
        matched = true;
      }
    });
  }
  if (!matched && want) {
    // inject temporary option so the value still submits
    const opt = document.createElement("option");
    opt.value = interest.trim();
    opt.textContent = interest.trim();
    opt.selected = true;
    select.appendChild(opt);
  }
  const msg = root.querySelector("[name=message]");
  if (msg && !msg.value) {
    msg.placeholder = isMsPath()
      ? `Minat: ${interest.trim()} — beritahu kami tentang perniagaan anda…`
      : `Interest: ${interest.trim()} — tell us about your business…`;
  }
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

function mytNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}

function promoState() {
  const d = mytNow();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (y === 2026 && m === 8) {
    return { live: true, pct: 69, key: "aug", end: new Date("2026-08-31T23:59:59+08:00") };
  }
  if (y === 2026 && m === 9) {
    return { live: true, pct: 63, key: "sep", end: new Date("2026-09-30T23:59:59+08:00") };
  }
  return { live: false, pct: 0, key: "", end: null };
}

function promoLive() {
  return promoState().live;
}

function formatRM(n) {
  return "RM " + Number(n).toLocaleString("en-MY");
}

function fromLabelHtml() {
  return isMsPath()
    ? '<small class="price-from">Dari</small> '
    : '<small class="price-from">From</small> ';
}

function applyPromoPrices() {
  const p = promoState();
  if (!p.live) return;
  document.body.classList.add("promo-live");
  const ms = isMsPath();
  const pill = p.key === "aug"
    ? (ms ? '<span class="accent">Merdeka</span> · potongan 69%' : '<span class="accent">Merdeka</span> · 69% off')
    : (ms ? "September · potongan 63%" : "September · 63% off");
  document.querySelectorAll(".launch-pill").forEach((el) => { el.innerHTML = pill; });

  document.querySelectorAll("[data-list]").forEach((el) => {
    const list = Number(el.getAttribute("data-list"));
    if (!list) return;
    const sale = Math.round(list * (1 - p.pct / 100));
    const from = el.hasAttribute("data-from");
    const period = el.getAttribute("data-period") || "";
    const prefixHtml = from ? fromLabelHtml() : "";
    const now = el.querySelector("[data-promo-now]");
    if (now) {
      now.innerHTML = prefixHtml + formatRM(sale);
      // Keep strikethrough "was" prefix styled too when present
      const was = el.querySelector(".was");
      if (was && from && !was.querySelector(".price-from")) {
        was.innerHTML = prefixHtml + formatRM(list);
      }
      return;
    }
    el.innerHTML =
      '<span class="was">' + prefixHtml + formatRM(list) + period + "</span>" +
      '<span data-promo-now>' + prefixHtml + formatRM(sale) + "</span>" +
      (period ? '<small class="price-period">' + period + "</small>" : "");
  });
}

function injectPromoBar() {
  const p = promoState();
  if (!p.live || document.querySelector(".promo-bar")) return;
  const bar = document.createElement("div");
  bar.className = "promo-bar";
  const ms = isMsPath();
  const offer = p.key === "aug"
    ? (ms
      ? 'Promosi <strong class="accent">Merdeka</strong> — potongan 69% semua perkhidmatan pada Ogos. Potongan 63% pada September.'
      : '<strong class="accent">Merdeka</strong> promo — 69% off all services in August. 63% off in September.')
    : (ms
      ? "<strong>Promosi September</strong> — potongan 63% semua perkhidmatan sehingga 30 Sep 2026."
      : "<strong>September promo</strong> — 63% off all services through 30 Sep 2026.");
  const link = ms ? "/ms/pricing" : "/pricing";
  const cta = ms ? "Lihat harga →" : "See pricing →";
  bar.innerHTML =
    '<div class="wrap">' +
      '<div class="promo-copy">' +
        '<img class="promo-flag" src="/assets/img/jalur-gemilang.svg" width="28" height="14" alt="" />' +
        "<div>" + offer + "</div>" +
      "</div>" +
      '<div class="promo-meta"><span class="promo-clock" id="promo-clock"></span><a href="' + link + '">' + cta + "</a></div>" +
    "</div>";
  const nav = document.querySelector(".nav");
  if (nav) nav.insertAdjacentElement("afterend", bar);
  else document.body.prepend(bar);
  tickPromoClock();
}

function dressMerdeka() {
  const p = promoState();
  if (!p.live) return;
  const ms = isMsPath();
  document.querySelectorAll("[data-promo-month]").forEach((el) => {
    el.classList.toggle("is-now", el.getAttribute("data-promo-month") === p.key);
  });
  const badge = document.querySelector(".hero .badge");
  if (badge && !document.querySelector(".hero-merdeka")) {
    const chip = document.createElement("div");
    chip.className = "hero-merdeka";
    chip.innerHTML =
      '<img src="/assets/img/jalur-gemilang.svg" width="22" height="11" alt="" />' +
      "<span>" + (p.key === "aug"
        ? (ms ? '<em class="accent">Merdeka</em> · <b>potongan 69%</b>' : '<em class="accent">Merdeka</em> · <b>69% off</b>')
        : (ms ? "September · <b>potongan 63%</b>" : "September · <b>63% off</b>")) +
      "</span>";
    badge.insertAdjacentElement("afterend", chip);
  }
}

function tickPromoClock() {
  const el = document.getElementById("promo-clock");
  const p = promoState();
  if (!el || !p.end) return;
  const left = p.end.getTime() - Date.now();
  if (left <= 0) {
    document.body.classList.remove("promo-live");
    document.querySelector(".promo-bar")?.remove();
    return;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const ms = isMsPath();
  el.textContent = ms
    ? (d + "h " + String(h).padStart(2, "0") + "j " + String(m).padStart(2, "0") + "m lagi")
    : (d + "d " + String(h).padStart(2, "0") + "h " + String(m).padStart(2, "0") + "m left");
  setTimeout(tickPromoClock, 30000);
}

function ensureServiceDialog() {
  let dialog = document.getElementById("svc-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "svc-dialog";
  dialog.className = "svc-dialog";
  dialog.setAttribute("aria-labelledby", "svc-dialog-title");
  const ms = isMsPath();
  const closeLabel = ms ? "Tutup" : "Close";
  const ctaLabel = ms ? "Dapatkan sebut harga" : "Get a quote";
  const ctaHref = ms ? "/ms/contact" : "/contact";
  dialog.innerHTML =
    '<div class="svc-dialog-card">' +
      '<button type="button" class="svc-dialog-close" data-dialog-close aria-label="' + closeLabel + '">×</button>' +
      '<div class="svc-dialog-kicker" id="svc-dialog-kicker"></div>' +
      '<h3 id="svc-dialog-title"></h3>' +
      '<div class="svc-dialog-price" id="svc-dialog-price"></div>' +
      '<div class="svc-dialog-body" id="svc-dialog-body"></div>' +
      '<div class="svc-dialog-actions">' +
        '<a class="btn btn-gold" id="svc-dialog-cta" href="' + ctaHref + '">' + ctaLabel + "</a>" +
        '<button type="button" class="btn btn-line" data-dialog-close>' + closeLabel + "</button>" +
      "</div>" +
    "</div>";
  document.body.appendChild(dialog);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeServiceDialog();
  });
  dialog.querySelectorAll("[data-dialog-close]").forEach((btn) => {
    btn.addEventListener("click", closeServiceDialog);
  });
  return dialog;
}

function closeServiceDialog() {
  const dialog = document.getElementById("svc-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openServiceDialog(card) {
  const dialog = ensureServiceDialog();
  const title = card.querySelector("h3")?.textContent?.trim() || "";
  const kicker =
    card.querySelector(".tag")?.textContent?.trim() ||
    card.querySelector(".launch-pill")?.textContent?.trim() ||
    (card.classList.contains("tier")
      ? (isMsPath() ? "Pakej retainer" : "Bundled retainer")
      : (isMsPath() ? "Perkhidmatan" : "Service"));
  const priceEl =
    card.querySelector(".price") ||
    card.querySelector(".ap");
  const detail = card.querySelector(".detail-panel");

  document.getElementById("svc-dialog-kicker").textContent = kicker;
  document.getElementById("svc-dialog-title").textContent = title;
  document.getElementById("svc-dialog-price").innerHTML = priceEl
    ? priceEl.innerHTML
    : "";
  const body = document.getElementById("svc-dialog-body");
  body.innerHTML = "";
  if (detail) {
    body.innerHTML = detail.innerHTML;
  } else {
    const blurb = Array.from(card.querySelectorAll(":scope > p")).find(
      (p) => !p.classList.contains("then")
    );
    const list = card.querySelector(":scope > ul");
    if (blurb) body.appendChild(blurb.cloneNode(true));
    if (list) body.appendChild(list.cloneNode(true));
    if (!blurb && !list) {
      const tag = card.querySelector(".tag");
      if (tag) {
        const p = document.createElement("p");
        p.textContent = tag.textContent.trim();
        body.appendChild(p);
      }
    }
  }

  const cta = document.getElementById("svc-dialog-cta");
  if (cta) {
    const interest = encodeURIComponent(title);
    const base = isMsPath() ? "/ms/contact" : "/contact";
    cta.href = base + "?interest=" + interest;
  }

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function bindServiceCards() {
  const cards = document.querySelectorAll(".addon, .tier");
  if (!cards.length) return;
  const ms = isMsPath();
  const hintText = ms ? "Klik untuk butiran" : "Click for details";

  cards.forEach((card) => {
    card.classList.add("is-clickable");
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    const label = card.querySelector("h3")?.textContent?.trim() || "service";
    card.setAttribute(
      "aria-label",
      (ms ? "Lihat butiran: " : "View details: ") + label
    );

    if (!card.querySelector(".click-hint")) {
      const hint = document.createElement("div");
      hint.className = "click-hint";
      hint.textContent = hintText;
      const main = card.querySelector(".addon-main");
      const btn = card.querySelector(":scope > .btn, .addon-main > .btn");
      if (btn) btn.parentElement.insertBefore(hint, btn);
      else if (main) main.appendChild(hint);
      else card.appendChild(hint);
    }

    const open = (e) => {
      if (e.target.closest("a, button, input, select, textarea, label")) return;
      e.preventDefault();
      openServiceDialog(card);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.closest("a, button")) return;
        e.preventDefault();
        openServiceDialog(card);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeServiceDialog();
  });
}

/* =========================================================
   TRANSFERRED FROM DEPLOYMENT A
   ========================================================= */

/* ---------- Canvas network background ---------- */
function initNetworkBg() {
  const canvas = document.getElementById('network-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const NP = 40, BED = 150;
  const particles = [];
  for (let i = 0; i < NP; i++) {
    const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1), r = 350 + Math.random() * 100;
    particles.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.008,
      vz: (Math.random() - 0.5) * 0.008
    });
  }
  const proj = (x, y, z) => { const f = 700 / (700 + z); return { x: w / 2 + x * f, y: h / 2 + y * f }; };
  function render() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0F1822';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(201,162,39,0.4)';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i], p1p = proj(p1.x, p1.y, p1.z);
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j],
          dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z,
          dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < BED) {
          const p2p = proj(p2.x, p2.y, p2.z);
          ctx.beginPath();
          ctx.moveTo(p1p.x, p1p.y);
          ctx.lineTo(p2p.x, p2p.y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.z += p.vz;
      if (Math.abs(p.x) > 400) p.vx *= -0.3;
      if (Math.abs(p.y) > 400) p.vy *= -0.3;
      if (Math.abs(p.z) > 400) p.vz *= -0.3;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
  }
  render();
}

/* ---------- Audit Modal ---------- */
function openAuditModal() {
  const modal = document.getElementById('auditModal');
  if (modal) modal.classList.add('show');
}
function closeAuditModal() {
  const modal = document.getElementById('auditModal');
  if (modal) modal.classList.remove('show');
}

/* ---------- WhatsApp Widget ---------- */
function openWhatsAppWidget() {
  window.open('https://wa.me/+601154034051?text=Hi%2C%20I%27m%20from%20%5BCompany%5D%2C%20interested%20in%20AI%20%2B%20IT%20for%20SMEs.%20Send%20me%20the%203-day%20proposal.', '_blank');
}

/* ---------- Search with Lunr.js ---------- */
function initSearch() {
  if (typeof lunr === 'undefined') return;
  const idx = lunr(function () {
    this.field('title', { boost: 10 });
    this.field('text', { boost: 1 });
    this.field('tags', { boost: 5 });
  });
  document.querySelectorAll('.page').forEach((page, pageIdx) => {
    if (!page.classList.contains('active')) return;
    const title = page.querySelector('h1')?.textContent || '';
    const text = page.innerText || '';
    const tags = [];
    page.querySelectorAll('.case-tag').forEach(tag => tags.push(tag.textContent.toLowerCase()));
    page.querySelectorAll('.why-card h4, .value-card h4, .price-card h3').forEach(h4 => tags.push(h4.textContent.toLowerCase()));
    if (title || text.trim()) {
      idx.addDoc({ id: 'page-' + pageIdx, title, text, tags });
    }
  });
  // Search button
  const nav = document.querySelector('.nav');
  if (nav) {
    const searchBtn = document.createElement('button');
    searchBtn.className = 'tool';
    searchBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-5-5"/></svg>';
    searchBtn.title = 'Search';
    searchBtn.addEventListener('click', toggleSearch);
    const tools = nav.querySelector('.nav-tools');
    if (tools) tools.prepend(searchBtn);
  }
  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML =
    '<div class="search-box">' +
      '<h3>Search</h3>' +
      '<input type="text" id="search-input" placeholder="Type to search…" />' +
      '<div class="search-results" id="search-results"></div>' +
      '<button class="btn btn-ghost" onclick="closeSearch()" style="margin-top:1rem">Close</button>' +
    '</div>';
  document.body.appendChild(overlay);
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  function toggleSearch() {
    const showing = overlay.classList.contains('show');
    closeSearch();
    if (!showing) {
      overlay.classList.add('show');
      setTimeout(() => input?.focus(), 100);
    }
  }
  window.toggleSearch = toggleSearch;
  window.closeSearch = function () {
    overlay.classList.remove('show');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  };
  if (input) {
    input.addEventListener('input', function () {
      const query = this.value.trim();
      if (!query) { results.innerHTML = ''; return; }
      const found = idx.search(query);
      results.innerHTML = '';
      if (found.length === 0) {
        results.innerHTML = '<div style="padding:1rem;color:var(--muted)">No results found. Try broader terms.</div>';
        return;
      }
      found.slice(0, 10).forEach(r => {
        const doc = idx.getDoc(r.id);
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = '<h4>' + (doc?.title || 'Page') + '</h4><p>' + ((doc?.text?.substring(0, 200) || '') + '…').replace(/\n/g, ' ') + '</p>';
        div.addEventListener('click', () => { closeSearch(); });
        results.appendChild(div);
      });
    });
  }
}

/* ---------- Comprehensive translations (from Deployment A) ---------- */
const translationsA = {
  en: {
    navServices: 'Services', navAbout: 'About', navCases: 'Projects', navPricing: 'Pricing', navContact: 'Contact Us',
    heroBadge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    heroTitle1: 'Enterprise-grade AI systems and managed IT, built for ',
    heroTitle2: 'Malaysian SMEs',
    heroDesc: "Custom AI apps, chatbots, automation, and secure cloud infrastructure — delivered by a Cyberjaya-based team, since 2025.",
    heroBtn1: 'Book a discovery call', heroBtn2: 'View our work',
    servicesEyebrow: 'Service Tiers', servicesTitle: 'Three Tiers. One Partner.',
    svc1Title: 'AI Software Dev', svc1Desc: 'Custom apps, chatbots, agent workflows',
    svc2Title: 'Managed IT', svc2Desc: 'Cloud infra, helpdesk, security, PDPA',
    svc3Title: 'Sales Automation', svc3Desc: 'CRM pipelines and outreach systems',
    svc4Title: 'Content & Ads', svc4Desc: 'Content engine and paid media management',
    trustStrip: 'Trusted by Lapango, Eastelpro, AGMX and growing SME clients across Malaysia',
    whyEyebrow: 'Why Choose Us', whyTitle: 'Built for Malaysian SMEs',
    ctaTitle: 'Ready to Modernize Your Business?', ctaDesc: 'Start with a free IT audit or AI readiness assessment — no obligation, no strings attached.', ctaBtn1: 'Book Free Consultation', ctaBtn2: 'View Pricing',
    footerDesc: 'Your trusted AI and IT partner in Malaysia. We help SMEs modernize, automate, and grow through smart technology.',
    footerCompany: 'Company', footerServices: 'Services',
  },
  bm: {
    navServices: 'Perkhidmatan', navAbout: 'Tentang Kami', navCases: 'Projek', navPricing: 'Harga', navContact: 'Hubungi Kami',
    heroBadge: 'AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA',
    heroTitle1: 'Sistem AI dan IT terurus peringkat perusahaan, dibina untuk ',
    heroTitle2: 'SME Malaysia',
    heroDesc: 'Aplikasi AI tersuai, chatbot, automasi, dan infrastruktur awan yang selamat — disampaikan oleh pasukan Cyberjaya, sejak 2026.',
    heroBtn1: 'Buat janji temu', heroBtn2: 'Lihat kerja kami',
    servicesEyebrow: 'Tahap Perkhidmatan', servicesTitle: 'Tiga Tahap. Satu Rakan Kongsi.',
    svc1Title: 'Pembangunan Perisian AI', svc1Desc: 'Aplikasi tersuai, chatbot, aliran kerja agen',
    svc2Title: 'IT Terurus', svc2Desc: 'Infrastruktur awan, helpdesk, keselamatan, PDPA',
    svc3Title: 'Automasi Jualan', svc3Desc: 'Saluran CRM dan sistem outreach',
    svc4Title: 'Kandungan & Iklan', svc4Desc: 'Enjin kandungan dan pengurusan media berbayar',
    trustStrip: 'Dipercayai oleh Lapango, Eastelpro, AGMX dan SME yang berkembang di seluruh Malaysia',
    whyEyebrow: 'Mengapa Pilih Kami', whyTitle: 'Dibina untuk SME Malaysia',
    ctaTitle: 'Bersedia Memodenkan Perniagaan Anda?', ctaDesc: 'Mulakan dengan audit IT percuma atau penilaian kesediaan AI — tanpa obligasi, tanpa komitmen.', ctaBtn1: 'Tempah Perundingan Percuma', ctaBtn2: 'Lihat Harga',
    footerDesc: 'Rakan kongsi AI dan IT anda yang dipercayai di Malaysia. Kami membantu SME memodenkan, mengautomasi, dan berkembang melalui teknologi pintar.',
    footerCompany: 'Syarikat', footerServices: 'Perkhidmatan',
  }
};

/* Init on load */
document.addEventListener('DOMContentLoaded', () => {
  // Preserve existing B inits — just augment them
  if (document.getElementById('network-bg') && document.body.classList.contains('dark-mode')) {
    initNetworkBg();
  }
  initSearch();
});
