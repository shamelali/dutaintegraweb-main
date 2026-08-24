/* Duta Integra — free brand audit front-end */

(function () {
  var MS = location.pathname.startsWith("/ms/");

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

  var LOADING_STEPS = [
    t("Fetching page", "Memuat halaman"),
    t("Scanning SEO", "Mengimbas SEO"),
    t("Checking content", "Menyemak kandungan"),
    t("Measuring speed", "Mengukur kelajuan"),
    t("Finding socials", "Mencari media sosial"),
    t("Building report", "Menyediakan laporan"),
    t("Requesting email", "Meminta e-mel"),
  ];

  var loadingTimer = null;
  var loadingIdx = 0;
  var running = false;
  var lastReport = null;
  var shareSlug = null;

  function showLoading() {
    var stage = document.getElementById("audit-stage");
    var loading = document.getElementById("audit-loading");
    var error = document.getElementById("audit-error");
    var results = document.getElementById("audit-results");
    stage.hidden = false;
    loading.hidden = false;
    results.hidden = true;
    error.hidden = true;
    loadingIdx = 0;
    var steps = document.getElementById("audit-loading-steps");
    if (steps) {
      Array.from(steps.children).forEach(function (el, i) {
        el.classList.toggle("is-on", i === 0);
      });
    }
    clearInterval(loadingTimer);
    loadingTimer = setInterval(function () {
      loadingIdx = (loadingIdx + 1) % LOADING_STEPS.length;
      var stepsEl = document.getElementById("audit-loading-steps");
      if (stepsEl) {
        Array.from(stepsEl.children).forEach(function (el, i) {
          el.classList.toggle("is-on", i === loadingIdx);
        });
      }
    }, 1100);
    document.getElementById("audit-stage").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideLoading() {
    clearInterval(loadingTimer);
    var loading = document.getElementById("audit-loading");
    if (loading) loading.hidden = true;
  }

  function showError(message) {
    hideLoading();
    running = false;
    var stage = document.getElementById("audit-stage");
    var error = document.getElementById("audit-error");
    var results = document.getElementById("audit-results");
    stage.hidden = false;
    error.hidden = false;
    results.hidden = true;
    var retryLabel = t("Try again", "Cuba lagi");
    var contactLabel = t("Contact us instead", "Hubungi kami");
    var contactHref = MS ? "/ms/contact" : "/contact";
    error.innerHTML =
      '<div class="audit-error-card">' +
      "<h3>" + t("We couldn't complete that audit", "Kami tidak dapat melengkapkan audit tersebut") + "</h3>" +
      "<p>" + esc(message || t("Please try again in a moment.", "Sila cuba lagi sebentar lagi.")) + "</p>" +
      '<div class="audit-error-actions">' +
      '<button class="btn btn-gold" onclick="document.getElementById(\'audit-stage\').hidden=true;document.getElementById(\'audit-url\').focus()">' + retryLabel + "</button>" +
      '<a class="btn btn-ghost" href="' + contactHref + '">' + contactLabel + "</a>" +
      "</div>" +
      "</div>";
    error.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function statusIcon(status) {
    if (status === "pass") return '<span class="audit-status is-pass">\u2713</span>';
    if (status === "warn") return '<span class="audit-status is-warn">!</span>';
    return '<span class="audit-status is-fail">\u2715</span>';
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

  function downloadAuditPDF(report) {
    var dateStr = "";
    try {
      dateStr = new Date(report.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch (_) {
      dateStr = new Date(report.generatedAt).toLocaleDateString();
    }

    var catHtml = report.categories.map(function (c) {
      return '<div style="margin-bottom:12px"><span style="font-weight:600">' + esc(c.label) + '</span>: <span style="color:' + scoreColor(c.score) + ';font-weight:700">' + c.score + '/100</span><div style="color:#666;font-size:13px">' + esc(c.verdict) + '</div></div>';
    }).join("");

    var recsHtml = report.recommendations.map(function (r) {
      var p = r.priority === "high" ? "[HIGH]" : "[REC]";
      return '<div style="margin-bottom:8px"><span style="font-weight:600">' + p + " " + esc(r.title) + '</span><div style="color:#555;font-size:13px">' + esc(r.detail) + '</div></div>';
    }).join("");

    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
      "<title>Audit Report - " + esc(report.domain) + "</title>" +
      "<style>" +
      "body{font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.6}" +
      "h1{font-size:28px;margin:0 0 4px}" +
      "h2{font-size:20px;margin:24px 0 12px;border-bottom:1px solid #eee;padding-bottom:8px}" +
      ".eyebrow{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#C9A227;font-weight:700}" +
      ".score{font-size:48px;font-weight:700;color:#C9A227}" +
      ".grade{font-size:18px;font-weight:600}" +
      ".meta{color:#666;font-size:13px;margin:16px 0}" +
      ".meta span{margin-right:16px}" +
      ".summary{background:#f8f9fb;padding:16px;border-radius:4px;margin:16px 0}" +
      ".footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:12px;text-align:center}" +
      "</style></head><body>" +
      "<div class='eyebrow'>FREE BRAND AUDIT</div>" +
      "<h1>" + esc(report.brandName) + "</h1>" +
      "<div>" + esc(report.domain) + "</div>" +
      "<div style='margin:16px 0'><span class='score'>" + report.score + "</span><span style='font-size:24px;color:#666'>/100</span> " +
      "<span class='grade' style='color:" + scoreColor(report.score) + "'>Grade " + esc(report.grade) + " — " + esc(report.gradeLabel) + "</span></div>" +
      "<div class='meta'>" +
      "<span><b>" + report.meta.responseMs + "</b> ms response</span>" +
      "<span><b>" + report.meta.pageSizeKb + "</b> KB page</span>" +
      "<span><b>" + report.meta.wordCount + "</b> words</span>" +
      "<span><b>" + dateStr + "</b></span>" +
      "</div>" +
      "<div class='summary'>" + esc(report.summary) + "</div>" +
      "<h2>Category Scores</h2>" + catHtml +
      "<h2>Priority Fixes (" + report.recommendations.length + ")</h2>" + recsHtml +
      "<div class='footer'>Generated by Duta Integra Solutions — dutaintegra.my</div>" +
      "</body></html>";

    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "audit-" + report.domain.replace(/\./g, "-") + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderCategory(result) {
    var color = scoreColor(result.score);
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
          "<p>" + esc(c.note) + "</p>" +
          "</div></li>"
        );
      })
      .join("");
  }

  function renderGroupedChecks(report) {
    var groups = {};
    report.categories.forEach(function (c) {
      groups[c.label] = [];
    });
    report.checks.forEach(function (c) {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return Object.keys(groups)
      .map(function (label) {
        var count = groups[label].length;
        var itemsLabel = count === 1 ? t("1 item", "1 item") : count + t(" items", " item");
        return (
          '<details class="audit-group">' +
          '<summary><span>' + esc(label) + "</span><em>" + itemsLabel + "</em></summary>" +
          '<ul class="audit-checks">' + renderChecks(groups[label]) + "</ul></details>"
        );
      })
      .join("");
  }

  function renderReport(report) {
    hideLoading();
    running = false;
    lastReport = report;
    var stage = document.getElementById("audit-stage");
    var results = document.getElementById("audit-results");
    var container = document.getElementById("audit-report");
    stage.hidden = false;
    results.hidden = false;

    var catCols = report.categories.map(renderCategory).join("");
    var social = report.social
      .map(function (s) {
        return (
          '<div class="social-chip' + (s.found ? " is-on" : "") + '">' +
          '<span class="social-dot"></span>' + esc(s.label) +
          (s.found && s.handle ? '<small>' + esc(s.handle) + "</small>" : "") +
          "</div>"
        );
      })
      .join("");

    var competitors = report.competitors
      .map(function (c) {
        return "<li><b>" + esc(c.name) + "</b><span>" + esc(c.note) + "</span></li>";
      })
      .join("");

    var recs = report.recommendations
      .map(function (r) {
        var p = r.priority === "high" ? t("High priority", "Keutamaan tinggi") : t("Recommended", "Disyorkan");
        return (
          '<li class="audit-rec" data-priority="' + esc(r.priority) + '">' +
          '<div class="audit-rec-tag">' + p + "</div>" +
          "<h4>" + esc(r.title) + "</h4>" +
          "<p>" + esc(r.detail) + "</p></li>"
        );
      })
      .join("");

    var bookHref = MS ? "/ms/contact" : "/contact";
    var topFindings = (report.recommendations || [])
      .slice(0, 3)
      .map(function (r, i) { return (i + 1) + ") " + r.title; })
      .join("\n");
    var waText = encodeURIComponent(
      "Hello Duta Integra \u2014 I just got my audit for " + report.domain + " (score " + report.score + "/100)." +
      (topFindings ? "\nTop findings:\n" + topFindings : "") +
      "\nI'd like to talk through the fixes."
    );
    var waHref = "https://wa.me/601154034051?text=" + waText;
    var dateStr = "";
    try {
      dateStr = new Date(report.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch (_) {
      dateStr = new Date(report.generatedAt).toLocaleDateString();
    }

    var downloadLabel = t("Download PDF", "Muat turun PDF");
    var shareLabel = t("Share on WhatsApp", "Kongsi di WhatsApp");
    var copyLabel = t("Copy link", "Salin pautan");
    var shareUrl = shareSlug ? location.origin + "/audit?r=" + shareSlug : "";
    var shareWaText = encodeURIComponent(
      "Here's my audit result for " + report.domain + " \u2014 Score: " + report.score + "/100 (Grade " + report.grade + ")\n\n" +
      report.summary +
      (shareUrl ? "\n\n" + shareUrl : "") +
      "\n\nGenerated by Duta Integra Solutions \u2014 dutaintegra.my/audit"
    );
    var shareWaHref = "https://wa.me/?text=" + shareWaText;

    var hasChecks = report.checks && report.checks.length > 0;
    var contactHref = MS ? "/ms/contact" : "/contact";
    var checklistCard;
    if (hasChecks) {
      checklistCard =
        '<div class="audit-report-card">' +
        '<div class="audit-card-head"><h4 class="audit-h4">' + t("Full checklist", "Senarai semakan penuh") + "</h4></div>" +
        '<div class="audit-groups">' + renderGroupedChecks(report) + "</div>" +
        '<div class="audit-card-actions">' +
        '<a class="btn btn-gold" href="' + bookHref + '">' + t("Book a free call", "Tempah panggilan percuma") + "</a>" +
        '<a class="btn btn-wa" href="' + waHref + '" target="_blank" rel="noopener">' + t("WhatsApp us", "WhatsApp kami") + "</a>" +
        "</div>" +
        "</div>";
    } else {
      checklistCard =
        '<div class="audit-report-card">' +
        '<div class="audit-card-head"><h4 class="audit-h4">' + t("Full checklist", "Senarai semakan penuh") + "</h4>" +
        '<span class="audit-locked-badge">' + t("Admin only", "Admin sahaja") + "</span></div>" +
        '<p class="audit-locked-note">' + t("The complete item-by-item checklist is shared during your free consultation. Get in touch and we will walk you through every fix for your site.", "Senarai semakan penuh dikongsi semasa konsultasi percuma anda. Hubungi kami dan kami akan terangkan setiap pembaikan untuk laman anda.") + "</p>" +
        '<div class="audit-card-actions">' +
        '<a class="btn btn-gold" href="' + contactHref + '">' + t("Get the full checklist — contact us", "Dapatkan senarai penuh \u2014 hubungi kami") + "</a>" +
        '<a class="btn btn-wa" href="' + waHref + '" target="_blank" rel="noopener">' + t("WhatsApp us", "WhatsApp kami") + "</a>" +
        "</div>" +
        "</div>";
    }

    container.innerHTML =
      '<div class="audit-report-head">' +
      '<div class="audit-report-stamp">' +
      '<div class="score-ring" style="--pct:' + report.score + ";--scol:" + scoreColor(report.score) + '">' +
      '<div class="score-ring-inner"><div class="score-num">' + report.score + '</div><div class="score-of">/100</div></div>' +
      "</div>" +
      '<div class="audit-report-brand"><div class="eyebrow">' + t("Audit result", "Keputusan audit") + "</div>" +
      "<h3>" + esc(report.brandName) + "</h3>" +
      '<div class="audit-report-domain">' + esc(report.domain) + "</div>" +
      '<div class="audit-report-grade">Grade <b style="color:' + scoreColor(report.score) + '">' + esc(report.grade) + "</b> \u00b7 <span>" + esc(report.gradeLabel) + "</span></div>" +
      "</div>" +
      "</div>" +
      '<p class="audit-summary">' + esc(report.summary) + "</p>" +
      '<div class="audit-meta">' +
      "<span><b>" + report.meta.responseMs + "</b> ms response</span>" +
      "<span><b>" + report.meta.pageSizeKb + "</b> KB page</span>" +
      "<span><b>" + report.meta.wordCount + "</b> words</span>" +
      "<span><b>" + (report.meta.h1Count || 0) + "</b> H1</span>" +
      "<span><b>" + dateStr + "</b> generated</span>" +
      "</div>" +
      "</div>" +

      '<div class="audit-report-actions">' +
      '<button class="btn btn-navy" id="audit-download-pdf" type="button">' + downloadLabel + "</button>" +
      '<a class="btn btn-wa" href="' + shareWaHref + '" target="_blank" rel="noopener">' + shareLabel + "</a>" +
      (shareUrl ? '<button class="btn btn-line" id="audit-copy-link" type="button" data-copy="' + esc(shareUrl) + '">' + copyLabel + "</button>" : "") +
      "</div>" +

      '<div class="audit-report-cols">' +
      '<div class="audit-col">' +
      "<h4 class=\"audit-h4\">" + t("Where you stand", "Kedudukan anda") + "</h4>" +
      '<div class="cat-list">' + catCols + "</div>" +
      "</div>" +
      '<div class="audit-col">' +
      "<h4 class=\"audit-h4\">" + t("Social presence", "Kehadiran sosial") + "</h4>" +
      '<div class="social-grid">' + social + "</div>" +
      "<h4 class=\"audit-h4\">" + t("Benchmarks we'd set", "Penanda aras") + "</h4>" +
      '<ul class="audit-comp">' + competitors + "</ul>" +
      "</div>" +
      "</div>" +

      '<div class="audit-report-card">' +
      '<div class="audit-card-head"><h4 class="audit-h4">' + t("Priority fixes", "Pembaikan keutamaan") + "</h4>" +
      "<span>" + report.recommendations.length + " " + t("found", "dijumpai") + "</span></div>" +
      '<ul class="audit-recs">' + (recs || '<li class="audit-empty-rec">' + t("Looks strong \u2014 no urgent fixes.", "Nampak kukuh \u2014 tiada pembaikan segera.") + "</li>") + "</ul>" +
      "</div>" +

      checklistCard +

      '<div class="audit-report-cta">' +
      "<div><h4>" + t("Want us to fix these for you?", "Mahukah kami membetulkannya untuk anda?") + "</h4>" +
      "<p>" + t("Book a free 20-min call and we'll walk through the report and give you a clear plan.", "Tempah panggilan 20 minit percuma dan kami akan terangkan laporan serta berikan pelan yang jelas.") + "</p></div>" +
      '<div class="audit-cta-actions">' +
      '<a class="btn btn-gold" href="' + bookHref + '">' + t("Book a free call", "Tempah panggilan percuma") + "</a>" +
      '<a class="btn btn-wa" href="' + waHref + '" target="_blank" rel="noopener">' + t("WhatsApp us", "WhatsApp kami") + "</a>" +
      "</div>" +
      "</div>";

    var dlBtn = document.getElementById("audit-download-pdf");
    if (dlBtn) {
      dlBtn.addEventListener("click", function () {
        downloadAuditPDF(report);
      });
    }
    var copyBtn = document.getElementById("audit-copy-link");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var url = copyBtn.getAttribute("data-copy");
        if (navigator.clipboard) navigator.clipboard.writeText(url);
        copyBtn.textContent = t("Copied!", "Disalin!");
        setTimeout(function () { copyBtn.textContent = copyLabel; }, 2000);
      });
    }

    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    var label = MS ? "Mengaudit\u2026" : "Auditing\u2026";
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.disabled = on;
    btn.textContent = on ? label : btn.dataset.orig;
  }

  function runAudit(url, name, industry, email, btn) {
    if (running) return;
    running = true;
    shareSlug = null;
    showLoading();
    setBtnLoading(btn, true);
    var reqHeaders = { "Content-Type": "application/json" };
    try {
      var adminToken = localStorage.getItem("di_admin_token");
      if (adminToken) reqHeaders["Authorization"] = "Bearer " + adminToken;
    } catch (_) {}
    fetch("/api/audit", {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ url: url, name: name, industry: industry, email: email }),
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: "Invalid server response" }; }).then(function (d) {
          return { ok: d.ok, status: r.status, data: d };
        });
      })
      .then(function (res) {
        setBtnLoading(btn, false);
        if (res.ok && res.data && res.data.report) {
          shareSlug = res.data.shareSlug || null;
          renderReport(res.data.report);
        } else {
          showError((res.data && res.data.error) || t("Could not run the audit.", "Tidak dapat menjalankan audit."));
        }
      })
      .catch(function () {
        setBtnLoading(btn, false);
        showError(t("Network error \u2014 please try again.", "Ralat rangkaian \u2014 sila cuba lagi."));
      });
  }

  function loadSharedReport(slug) {
    running = true;
    showLoading();
    fetch("/api/report?slug=" + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && d.report) {
          shareSlug = slug;
          renderReport(d.report);
          // hide the form — viewer came here for the report
          var formSection = document.querySelector(".audit-hero");
          if (formSection) formSection.hidden = true;
        } else {
          running = false;
          hideLoading();
          document.getElementById("audit-stage").hidden = true;
          var errEl = document.getElementById("audit-error");
          if (errEl) {
            document.getElementById("audit-stage").hidden = false;
            errEl.hidden = false;
            errEl.textContent = d && d.error ? d.error : "Report link is invalid or expired.";
          }
        }
      })
      .catch(function () {
        running = false;
        hideLoading();
        showError(t("Network error \u2014 please try again.", "Ralat rangkaian \u2014 sila cuba lagi."));
      });
  }

  function init() {
    var form = document.getElementById("audit-form");
    if (!form) return;

    // Shared report link: /audit?r=<slug>
    var shared = new URLSearchParams(location.search).get("r");
    if (shared && /^[a-z0-9]{6,16}$/i.test(shared)) {
      loadSharedReport(shared);
      return;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var url = document.getElementById("audit-url").value.trim();
      var name = document.getElementById("audit-name").value.trim();
      if (!name) {
        document.getElementById("audit-name").focus();
        return;
      }
      var email = document.getElementById("audit-email").value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById("audit-email").focus();
        return;
      }
      var industry = document.getElementById("audit-industry").value;
      var btn = document.getElementById("audit-submit");
      runAudit(url, name, industry, email, btn);
    });

    var params = new URLSearchParams(location.search);
    var autoUrl = params.get("url");
    if (autoUrl) {
      var urlInput = document.getElementById("audit-url");
      urlInput.value = autoUrl;
      var name = params.get("name") || "";
      if (name) document.getElementById("audit-name").value = name;
      var industry = params.get("industry") || "";
      if (industry) document.getElementById("audit-industry").value = industry;
      var email = params.get("email") || "";
      if (email) document.getElementById("audit-email").value = email;
      var nameVal = document.getElementById("audit-name").value.trim();
      var emailVal = document.getElementById("audit-email").value.trim();
      if (nameVal) {
        var btn = document.getElementById("audit-submit");
        btn.dataset.orig = btn.textContent;
        runAudit(autoUrl, nameVal, industry, emailVal, btn);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
