/* Duta Integra — free brand audit front-end */

(function () {
  const MS = location.pathname.startsWith("/ms/");

  function t(en, ms) {
    return MS ? ms : en;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const LOADING_STEPS = [
    t("Fetching page", "Memuat halaman"),
    t("Scanning SEO", "Mengimbas SEO"),
    t("Checking content", "Menyemak kandungan"),
    t("Measuring speed", "Mengukur kelajuan"),
    t("Finding socials", "Mencari media sosial"),
    t("Building report", "Menyediakan laporan"),
  ];

  let loadingTimer = null;
  let loadingIdx = 0;

  function showLoading() {
    const stage = document.getElementById("audit-stage");
    const loading = document.getElementById("audit-loading");
    const error = document.getElementById("audit-error");
    const results = document.getElementById("audit-results");
    stage.hidden = false;
    loading.hidden = false;
    results.hidden = true;
    error.hidden = true;
    loadingIdx = 0;
    const steps = document.getElementById("audit-loading-steps");
    if (steps) {
      Array.from(steps.children).forEach((el, i) => el.classList.toggle("is-on", i === 0));
    }
    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => {
      loadingIdx = (loadingIdx + 1) % LOADING_STEPS.length;
      const stepsEl = document.getElementById("audit-loading-steps");
      if (stepsEl) {
        Array.from(stepsEl.children).forEach((el, i) => el.classList.toggle("is-on", i === loadingIdx));
      }
    }, 1100);
    document.getElementById("audit-stage").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideLoading() {
    clearInterval(loadingTimer);
    const loading = document.getElementById("audit-loading");
    if (loading) loading.hidden = true;
  }

  function showError(message) {
    hideLoading();
    const stage = document.getElementById("audit-stage");
    const error = document.getElementById("audit-error");
    const results = document.getElementById("audit-results");
    stage.hidden = false;
    error.hidden = false;
    results.hidden = true;
    error.innerHTML =
      '<div class="audit-error-card">' +
      '<h3>' + t("We couldn't complete that audit", "Kami tidak dapat melengkapkan audit tersebut") + "</h3>" +
      "<p>" + esc(message || t("Please try again in a moment.", "Sila cuba lagi sebentar lagi.")) + "</p>" +
      '<a class="btn btn-ghost" href="' + (MS ? "/ms/contact" : "/contact") + '">' + t("Contact us instead", "Hubungi kami") + "</a>" +
      "</div>";
    error.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function statusIcon(status) {
    if (status === "pass") return '<span class="audit-status is-pass">✓</span>';
    if (status === "warn") return '<span class="audit-status is-warn">!</span>';
    return '<span class="audit-status is-fail">✕</span>';
  }

  function statusLabel(status) {
    if (status === "pass") return t("Pass", "Lulus");
    if (status === "warn") return t("Improve", "Perlu diperbaiki");
    return t("Fix", "Perlu dibaiki");
  }

  function scoreColor(score) {
    if (score >= 80) return "var(--ok)";
    if (score >= 60) return "var(--gold)";
    return "var(--danger)";
  }

  function renderCategory(result) {
    const color = scoreColor(result.score);
    return (
      '<div class="cat-item" data-cat="' + esc(result.id) + '">' +
      '<div class="cat-top">' +
      '<span class="cat-name">' + esc(result.label) + "</span>" +
      '<span class="cat-score">' + result.score + '<small>/100</small></span>' +
      "</div>" +
      '<div class="cat-track"><div class="cat-fill" style="width:' + result.score + "%;background:" + color + '"></div></div>' +
      '<div class="cat-verdict">' + esc(result.verdict) + "</div>" +
      "</div>"
    );
  }

  function renderChecks(checks) {
    return checks
      .map(function (c) {
        return (
          '<li class="audit-check" data-status="' + c.status + '">' +
          statusIcon(c.status) +
          '<div class="audit-check-body">' +
          '<div class="audit-check-label"><b>' + esc(c.label) + "</b>" +
          '<span class="audit-check-status">' + statusLabel(c.status) + "</span></div>" +
          '<p>' + esc(c.note) + "</p>" +
          "</div></li>"
        );
      })
      .join("");
  }

  function renderGroupedChecks(report) {
    const groups = {};
    report.categories.forEach(function (c) {
      groups[c.label] = [];
    });
    report.checks.forEach(function (c) {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return Object.keys(groups)
      .map(function (label) {
        return (
          '<details class="audit-group">' +
          '<summary><span>' + esc(label) + "</span><em>" + groups[label].length + t(" items", " item") + "</em></summary>" +
          '<ul class="audit-checks">' + renderChecks(groups[label]) + "</ul></details>"
        );
      })
      .join("");
  }

  function renderReport(report) {
    hideLoading();
    const stage = document.getElementById("audit-stage");
    const results = document.getElementById("audit-results");
    const container = document.getElementById("audit-report");
    stage.hidden = false;
    results.hidden = false;

    const demoBanner = report.demo
      ? '<div class="audit-demo-banner"><b>' + t("Sample report", "Contoh laporan") + "</b> — " +
        t("Live network is unavailable in this preview, so this shows a representative example. On the live site, your real page is scanned.", "Sambungan langsung tidak tersedia dalam pratonton ini, jadi ini contoh perwakilan. Di laman sebenar, halaman sebenar anda akan diimbas.") +
        "</div>"
      : "";

    const catCols = report.categories.map(renderCategory).join("");
    const social = report.social
      .map(function (s) {
        return (
          '<div class="social-chip' + (s.found ? " is-on" : "") + '">' +
          '<span class="social-dot"></span>' + esc(s.label) +
          (s.found && s.handle ? '<small>' + esc(s.handle) + "</small>" : "") +
          "</div>"
        );
      })
      .join("");

    const competitors = report.competitors
      .map(function (c) {
        return '<li><b>' + esc(c.name) + "</b><span>" + esc(c.note) + "</span></li>";
      })
      .join("");

    const recs = report.recommendations
      .map(function (r) {
        const p = r.priority === "high" ? t("High priority", "Keutamaan tinggi") : t("Recommended", "Disyorkan");
        return (
          '<li class="audit-rec" data-priority="' + esc(r.priority) + '">' +
          '<div class="audit-rec-tag">' + p + "</div>" +
          "<h4>" + esc(r.title) + "</h4>" +
          "<p>" + esc(r.detail) + "</p></li>"
        );
      })
      .join("");

    const email = report.email ? esc(report.email) : t("you@company.com", "anda@syarikat.com");
    const bookHref = MS ? "/ms/contact" : "/contact";
    const waText = encodeURIComponent(
      "Hello Duta Integra — I just got my audit for " + report.domain + " (score " + report.score + "/100) and I'd like to talk through the fixes."
    );
    const waHref = "https://wa.me/601154034051?text=" + waText;

    container.innerHTML =
      demoBanner +
      '<div class="audit-report-head">' +
      '<div class="audit-report-stamp">' +
      '<div class="score-ring" style="--pct:' + report.score + ";--scol:" + scoreColor(report.score) + '">' +
      '<div class="score-ring-inner"><div class="score-num">' + report.score + "</div><div class=\"score-of\">/100</div></div>" +
      "</div>" +
      '<div class="audit-report-brand"><div class="eyebrow">' + t("Audit result", "Keputusan audit") + "</div>" +
      "<h3>" + esc(report.brandName) + "</h3>" +
      '<div class="audit-report-domain">' + esc(report.domain) + "</div>" +
      '<div class="audit-report-grade">Grade <b style="color:' + scoreColor(report.score) + '">' + esc(report.grade) + "</b> · <span>" + esc(report.gradeLabel) + "</span></div>" +
      "</div>" +
      "</div>" +
      '<p class="audit-summary">' + esc(report.summary) + "</p>" +
      '<div class="audit-meta">' +
      "<span><b>" + report.meta.responseMs + "</b> ms response</span>" +
      "<span><b>" + report.meta.pageSizeKb + "</b> KB page</span>" +
      "<span><b>" + report.meta.wordCount + "</b> words</span>" +
      "<span><b>" + (report.meta.h1Count || 0) + "</b> H1</span>" +
      t("<span><b>" + new Date(report.generatedAt).toLocaleDateString() + "</b> generated</span>", "") +
      "</div>" +
      "</div>" +

      '<div class="audit-report-cols">' +
      '<div class="audit-col">' +
      "<h4 class=\"audit-h4\">" + t("Where you stand", "Kedudukan anda") + "</h4>" +
      '<div class="cat-list">' + catCols + "</div>" +
      "</div>" +
      '<div class="audit-col">' +
      "<h4 class=\"audit-h4\">" + t("Social presence", "Kehadiran sosial") + "</h4>" +
      '<div class="social-grid">' + social + "</div>" +
      "<h4 class=\"audit-h4\">" + t("Benchmarks we\'d set", "Penanda aras") + "</h4>" +
      '<ul class="audit-comp">' + competitors + "</ul>" +
      "</div>" +
      "</div>" +

      '<div class="audit-report-card">' +
      '<div class="audit-card-head"><h4 class="audit-h4">' + t("Priority fixes", "Pembaikan keutamaan") + "</h4>" +
      "<span>" + report.recommendations.length + " " + t("found", "dijumpai") + "</span></div>" +
      '<ul class="audit-recs">' + (recs || '<li class="audit-empty-rec">' + t("Looks strong — no urgent fixes.", "Nampak kukuh — tiada pembaikan segera.") + "</li>") + "</ul>" +
      "</div>" +

      '<div class="audit-report-card">' +
      '<div class="audit-card-head"><h4 class="audit-h4">' + t("Full checklist", "Senarai semakan penuh") + "</h4></div>" +
      '<div class="audit-groups">' + renderGroupedChecks(report) + "</div>" +
      "</div>" +

      '<div class="audit-report-cta">' +
      "<div><h4>" + t("Want us to fix these for you?", "Mahukah kami membetulkannya untuk anda?") + "</h4>" +
      "<p>" + t("Book a free 20-min call and we'll walk through the report and give you a clear plan.", "Tempah panggilan 20 minit percuma dan kami akan terangkan laporan serta berikan pelan yang jelas.") + "</p></div>" +
      '<div class="audit-cta-actions">' +
      '<a class="btn btn-gold" href="' + bookHref + '">' + t("Book a free call", "Tempah panggilan percuma") + "</a>" +
      '<a class="btn btn-wa" href="' + waHref + '" target="_blank" rel="noopener">' + t("WhatsApp us", "WhatsApp kami") + "</a>" +
      "</div>" +
      "</div>";

    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    const label = MS ? "Mengaudit…" : "Auditing…";
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.disabled = on;
    btn.textContent = on ? label : btn.dataset.orig;
  }

  function runAudit(url, name, industry, email, btn) {
    showLoading();
    setBtnLoading(btn, true);
    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name, industry, email }),
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: "Invalid server response" }; }).then(function (d) {
          return { ok: d.ok, status: r.status, data: d };
        });
      })
      .then(function (res) {
        setBtnLoading(btn, false);
        if (res.ok && res.data && res.data.report) {
          renderReport(res.data.report);
        } else {
          showError((res.data && res.data.error) || t("Could not run the audit.", "Tidak dapat menjalankan audit."));
        }
      })
      .catch(function () {
        setBtnLoading(btn, false);
        showError(t("Network error — please try again.", "Ralat rangkaian — sila cuba lagi."));
      });
  }

  function init() {
    const form = document.getElementById("audit-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const url = document.getElementById("audit-url").value.trim();
      if (!url) {
        document.getElementById("audit-url").focus();
        return;
      }
      const name = document.getElementById("audit-name").value.trim();
      const industry = document.getElementById("audit-industry").value;
      const email = document.getElementById("audit-email").value.trim();
      const btn = document.getElementById("audit-submit");
      runAudit(url, name, industry, email, btn);
    });

    // Prefill + auto-run from ?url= (e.g. shared links)
    const params = new URLSearchParams(location.search);
    const autoUrl = params.get("url");
    if (autoUrl) {
      const urlInput = document.getElementById("audit-url");
      urlInput.value = autoUrl;
      const name = params.get("name") || "";
      if (name) document.getElementById("audit-name").value = name;
      const industry = params.get("industry") || "";
      if (industry) document.getElementById("audit-industry").value = industry;
      const email = params.get("email") || "";
      if (email) document.getElementById("audit-email").value = email;
      const btn = document.getElementById("audit-submit");
      runAudit(autoUrl, name, industry, email, btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
