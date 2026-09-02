/* Duta Integra — site behaviour */

const i18n = {
  en: {
    nav_services: "Services",
    nav_cases: "Case studies",
    nav_about: "About",
    nav_pricing: "Pricing",
    nav_audit: "Free audit",
    nav_blog: "Blog",
    nav_quote: "Get a quote",
    hero_badge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    hero_title: 'Enterprise-grade <em class="accent">AI systems</em> and <em class="accent">managed IT</em>, built for <em class="accent">Malaysian SMEs</em>',
    hero_lead: "Custom AI apps, chatbots, automation, and secure cloud infrastructure — delivered by a Cyberjaya-based team, since 2021.",
    hero_cta_audit: "Run a free audit",
    hero_cta1: "Book a discovery call",
    hero_cta2: "Explore our products",
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
    outcomes: "See our products →",
    product_eye: "Our products",
    product_title: "Products built by Duta Integra",
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
    nav_cases: "Kajian kes",
    nav_about: "Tentang",
    nav_pricing: "Harga",
    nav_audit: "Audit percuma",
    nav_blog: "Blog",
    nav_quote: "Minta sebut harga",
    hero_badge: "AI-FIRST IT PARTNER · CYBERJAYA, MALAYSIA",
    hero_title: 'Sistem <em class="accent">AI</em> dan <em class="accent">IT terurus</em> peringkat perusahaan, dibina untuk <em class="accent">SME Malaysia</em>',
    hero_lead: "Aplikasi AI tersuai, chatbot, automasi, dan infrastruktur awan yang selamat — disampaikan oleh pasukan Cyberjaya, sejak 2021.",
    hero_cta_audit: "Jalankan audit percuma",
    hero_cta1: "Tempah sesi penemuan",
    hero_cta2: "Lihat produk kami",
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
    outcomes: "Lihat produk kami →",
    product_eye: "Produk kami",
    product_title: "Produk binaan Duta Integra",
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

function applyI18n() {
  const lang = currentLang();
  const dict = i18n[lang];
  if (!dict) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = dict[key];
    if (val == null) return;
    if (key.includes('title') || key.includes('lead') || key.includes('sub') || key.includes('blurb')) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });
  document.documentElement.lang = lang === 'bm' ? 'ms' : 'en';
}

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
  const pref = localStorage.getItem("lang");
  if (!pref) {
    localStorage.setItem("lang", isMsPath() ? "ms" : "en");
  }
}

function enforceLangPreference() {
  const pref = localStorage.getItem("lang");
  if (!pref) return false;
  if (pref === "ms" && !isMsPath()) {
    location.replace(counterpartPath());
    return true;
  }
  if (pref === "en" && isMsPath()) {
    location.replace(counterpartPath());
    return true;
  }
  return false;
}

function bindLangSwitch() {
  document.addEventListener('click', function(e) {
    const a = e.target.closest('.lang-switch a[hreflang]');
    if (a) {
      localStorage.setItem('lang', a.getAttribute('hreflang') === 'ms' ? 'ms' : 'en');
    }
  });
}

function toggleDark() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  document.body.classList.toggle("dark", !isDark);
  localStorage.setItem("theme", isDark ? "light" : "dark");
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
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.querySelectorAll("[data-theme-icon]").forEach((el) => {
    el.innerHTML = isDark ? sunIcon : moonIcon;
  });
}

function mytNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}

function promoState() {
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
  const footer = document.querySelector(".footer");
  if (footer) footer.insertAdjacentElement("beforebegin", bar);
  else document.body.appendChild(bar);
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

document.addEventListener("DOMContentLoaded", () => {
  if (enforceLangPreference()) return;
  rememberLangFromPath();
  applyI18n();
  bindLangSwitch();
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme !== "light";
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.body.classList.toggle("dark", isDark);
  if (promoLive()) document.body.classList.add("promo-live");
  applyPromoPrices();
  injectPromoBar();
  dressMerdeka();
  syncThemeIcon();
  bindServiceCards();
  bindPreviewLinks();
  initFaq();
  loadWorkProducts();
  loadCaseStudies();
  trackEvent("page_view");
  prefillserviceFromQuery();
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
});

/* ---------- Preview registration gate ---------- */
let pendingPreviewUrl = null;

function ensurePreviewDialog() {
  const dialog = document.getElementById("preview-register");
  if (!dialog) return null;
  if (!dialog.dataset.bound) {
    dialog.dataset.bound = "1";
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closePreviewDialog();
    });
    dialog.querySelectorAll("[data-preview-close]").forEach((btn) => {
      btn.addEventListener("click", closePreviewDialog);
    });
    const form = document.getElementById("preview-register-form");
    if (form) {
      form.addEventListener("submit", handlePreviewSubmit);
    }
  }
  return dialog;
}

function openPreviewDialog(url) {
  const dialog = ensurePreviewDialog();
  if (!dialog) {
    window.open(url, "_blank", "noopener");
    return;
  }
  pendingPreviewUrl = url;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closePreviewDialog() {
  const dialog = document.getElementById("preview-register");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  pendingPreviewUrl = null;
}

function handlePreviewSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.website || data.hp) return;
  if (!data.name || !data.email) {
    showToast(
      isMsPath() ? "Sila isi nama dan e-mel." : "Please fill in name and email.",
      true
    );
    return;
  }
  const btn = form.querySelector("[type=submit]");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = isMsPath() ? "Menghantar…" : "Sending…";

  const payload = {
    name: String(data.name || "").trim(),
    company: String(data.company || "").trim(),
    email: String(data.email || "").trim(),
    source: "work-preview",
    previewUrl: pendingPreviewUrl || "",
  };

  fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (r) => {
      let d = null;
      try { d = await r.json(); } catch { d = null; }
      btn.disabled = false;
      btn.textContent = original;
      if (r.ok && d && d.success) {
        form.reset();
        closePreviewDialog();
        trackEvent("preview_register", { url: pendingPreviewUrl });
        if (pendingPreviewUrl) window.open(pendingPreviewUrl, "_blank", "noopener");
        return;
      }
      if (r.status === 503 || r.status >= 500 || !r.ok) {
        closePreviewDialog();
        trackEvent("preview_register", { url: pendingPreviewUrl });
        if (pendingPreviewUrl) window.open(pendingPreviewUrl, "_blank", "noopener");
        return;
      }
      showToast(
        (d && d.error) || (isMsPath() ? "Gagal menghantar." : "Could not send. Try again."),
        true
      );
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = original;
      closePreviewDialog();
      if (pendingPreviewUrl) window.open(pendingPreviewUrl, "_blank", "noopener");
    });
}

function bindPreviewLinks() {
  // Delegated so dynamically rendered Work-page cards are covered too.
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".preview-link");
    if (!link) return;
    e.preventDefault();
    const url = link.getAttribute("href");
    if (url) openPreviewDialog(url);
  });
}

/* ---------- First-party analytics ---------- */
function trackEvent(type, meta) {
  try {
    if (location.pathname.startsWith("/admin")) return;
    const payload = JSON.stringify({
      type,
      path: location.pathname,
      meta: meta || {},
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* never break the page */ }
}

/* ---------- FAQ accordion ---------- */
function initFaq() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    if (!q || q.dataset.bound) return;
    q.dataset.bound = "1";
    q.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
}

/* ---------- Homepage #products: render products from Supabase ---------- */
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderWorkCard(p, large) {
  const desc = (isMsPath() ? p.description_ms : p.description_en) || p.description_en || "";
  const tags = Array.isArray(p.tags)
    ? p.tags.map((t) => '<span class="tag-chip">' + escHtml(t) + "</span>").join("")
    : "";
  const metrics = Array.isArray(p.metrics)
    ? p.metrics.map((m) => "<div><b>" + escHtml(m.value) + "</b><span>" + escHtml(m.label) + "</span></div>").join("")
    : "";
  return (
    '<article class="card-work' + (large ? " lg" : "") + '">' +
    (p.image_url
      ? '<img src="' + escHtml(p.image_url) + '" alt="' + escHtml(p.name) + '" loading="lazy" />'
      : '<img src="assets/img/work-placeholder.jpg" alt="" />') +
    '<div class="body">' +
    '<div class="meta">' + escHtml(p.category || "Duta Integra product") + "</div>" +
    "<h3>" + escHtml(p.name) + "</h3>" +
    (p.tagline && !desc ? "<p>" + escHtml(p.tagline) + "</p>" : "<p>" + escHtml(desc) + "</p>") +
    (tags ? '<div class="tags">' + tags + "</div>" : "") +
    (metrics ? '<div class="metrics">' + metrics + "</div>" : "") +
    '<div class="case-actions">' +
    (p.preview_url
      ? '<a class="btn btn-line preview-link" href="' + escHtml(p.preview_url) + '" target="_blank" rel="noopener">Preview ↗</a>'
      : "") +
    '<a class="btn btn-line" href="' + (isMsPath() ? "/ms/contact" : "/contact") + '">' +
    escHtml((isMsPath() ? p.contact_cta_ms : p.contact_cta_en) || p.contact_cta_en || "Discuss a similar build") +
    "</a>" +
    "</div></div></article>"
  );
}

/* ---------- /cases page: render case-study cards from Supabase ---------- */
function renderCaseCard(c) {
  const metrics = Array.isArray(c.metrics)
    ? c.metrics.map((m) => "<div><b>" + escHtml(m.value) + "</b><span>" + escHtml(m.label) + "</span></div>").join("")
    : "";
  const outcomes = Array.isArray(c.outcomes)
    ? c.outcomes.map((o) => "<li>" + escHtml(o) + "</li>").join("")
    : "";
  const tags = Array.isArray(c.tags)
    ? c.tags.map((t) => '<span class="tag-chip">' + escHtml(t) + "</span>").join("")
    : "";
  return (
    '<article class="case-card">' +
    (c.image_url
      ? '<img src="' + escHtml(c.image_url) + '" alt="' + escHtml(c.client_name) + '" loading="lazy" />'
      : "") +
    '<div class="body">' +
    (c.category ? '<div class="meta">' + escHtml(c.category) + "</div>" : "") +
    "<h3>" + escHtml(c.client_name) + "</h3>" +
    "<p>" + escHtml(c.summary_en || "") + "</p>" +
    (metrics ? '<div class="metrics">' + metrics + "</div>" : "") +
    (outcomes ? '<ul class="outcomes">' + outcomes + "</ul>" : "") +
    (tags ? '<div class="tags">' + tags + "</div>" : "") +
    (c.detail_url
      ? '<a class="btn btn-line" href="' + escHtml(c.detail_url) + '" style="margin-top:18px">Read the study</a>'
      : "") +
    "</div></article>"
  );
}

async function loadCaseStudies() {
  const grid = document.querySelector(".case-grid");
  if (!grid) return;
  let d;
  try {
    const r = await fetch("/api/case-studies");
    if (!r.ok) return;
    d = await r.json();
  } catch {
    return; // keep static fallback
  }
  if (!d || !d.ok || !Array.isArray(d.caseStudies) || !d.caseStudies.length) return;
  grid.innerHTML = d.caseStudies.map(renderCaseCard).join("");
}

async function loadWorkProducts() {
  const grid = document.querySelector("#products .work-grid");
  if (!grid) return;
  let d;
  try {
    const r = await fetch("/api/products");
    if (!r.ok) return; // section stays hidden
    d = await r.json();
  } catch {
    return; // section stays hidden
  }
  if (!d || !d.ok || !Array.isArray(d.products) || !d.products.length) return;

  const items = d.products;
  if (items.length === 1) {
    grid.innerHTML = renderWorkCard(items[0], true);
  } else {
    grid.innerHTML =
      renderWorkCard(items[0], true) +
      '<div class="work-side">' +
      items.slice(1).map((p) => renderWorkCard(p, false)).join("") +
      "</div>";
  }

  // Reveal the section + any CTAs pointing at it
  const section = document.getElementById("products");
  if (section) section.hidden = false;
  document.querySelectorAll('a[href$="/#products"], a[href$="#products"]').forEach((a) => {
    a.hidden = false;
  });
}
