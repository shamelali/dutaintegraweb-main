/* Duta Integra — Admin Panel JavaScript */
(function () {
  const API_BASE = "/api/admin";
  const TOKEN_KEY = "di_admin_token";
  const USER_KEY = "di_admin_user";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }
  function setToken(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function isLoggedIn() { return !!getToken(); }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + path, { ...options, headers });
    const data = await res.json();
    if (res.status === 401) { clearAuth(); window.location.href = "/admin/login.html"; return null; }
    return data;
  }

  /* ── Daily Tasks ──────────────────────────────────────────────── */
  const TASKS = {
    technical: [
      { time: "8:00 AM", text: "Review active projects & tickets, prioritize blockers", cat: "planning" },
      { time: "8:30 AM", text: "Respond to urgent client messages & WhatsApp", cat: "comms" },
      { time: "9:00 AM", text: "Check server uptime, monitoring alerts, CI/CD pipelines", cat: "ops" },
      { time: "9:30 AM", text: "Technical delivery — dev, deployments, migrations", cat: "delivery" },
      { time: "12:00 PM", text: "Lunch break", cat: "break" },
      { time: "1:00 PM", text: "Client-facing — demos, consultations, scope calls", cat: "comms" },
      { time: "3:00 PM", text: "Code review, PR merges, documentation updates", cat: "delivery" },
      { time: "4:00 PM", text: "Security checks — patches, access reviews, backups", cat: "ops" },
      { time: "4:30 PM", text: "Update project boards, document shipped work, flag risks", cat: "planning" },
      { time: "5:00 PM", text: "End-of-day sync with Amar", cat: "comms" }
    ],
    operations: [
      { time: "8:00 AM", text: "Review pipeline — follow up on warm leads & inquiries", cat: "planning" },
      { time: "8:30 AM", text: "Respond to emails, WhatsApp, website form submissions", cat: "comms" },
      { time: "9:00 AM", text: "Business development — outreach, networking, LinkedIn", cat: "sales" },
      { time: "9:30 AM", text: "Proposal writing & quotation follow-ups", cat: "sales" },
      { time: "11:00 AM", text: "Marketing — social media posts, content, blog updates", cat: "marketing" },
      { time: "12:00 PM", text: "Lunch break", cat: "break" },
      { time: "1:00 PM", text: "Operations — invoicing, vendor coordination, admin", cat: "ops" },
      { time: "2:00 PM", text: "Client relationship — check in, gather feedback", cat: "comms" },
      { time: "3:00 PM", text: "Financial tracking — expenses, payments, cash flow", cat: "ops" },
      { time: "4:00 PM", text: "Update CRM/pipeline, prepare tomorrow outreach list", cat: "planning" },
      { time: "5:00 PM", text: "End-of-day sync with Shamel", cat: "comms" }
    ]
  };

  const CAT_LABELS = { planning: "Planning", comms: "Comms", ops: "Ops", delivery: "Delivery", sales: "Sales", marketing: "Marketing", break: "Break" };

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function getDoneTasks() {
    try {
      var store = JSON.parse(localStorage.getItem("di_task_done") || "{}");
      return store.date === todayKey() ? (store.done || []) : [];
    } catch { return []; }
  }
  function saveDoneTasks(done) {
    localStorage.setItem("di_task_done", JSON.stringify({ date: todayKey(), done: done }));
  }

  function renderGreeting() {
    var user = getStoredUser();
    if (!user) return;
    var hour = new Date().getHours();
    var part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    var g = document.getElementById("greetingName");
    if (g) g.textContent = part + ", " + user.name;

    var dateEl = document.getElementById("greetingDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    var initials = user.name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    var avatar = document.getElementById("userAvatar");
    if (avatar) avatar.textContent = initials;
    var nameEl = document.getElementById("sidebarUserName");
    if (nameEl) nameEl.textContent = user.name;
    var roleEl = document.getElementById("sidebarUserRole");
    if (roleEl) roleEl.textContent = user.role === "technical" ? "Technical Lead" : "Operations Lead";
  }

  function renderTasks() {
    var user = getStoredUser();
    var listEl = document.getElementById("taskList");
    if (!listEl || !user) return;
    var tasks = TASKS[user.role] || TASKS.technical;
    var done = getDoneTasks();

    listEl.innerHTML = tasks.map(function (t, i) {
      var isDone = done.indexOf(i) !== -1;
      return '<li class="task-item' + (isDone ? ' done' : '') + '" data-idx="' + i + '">' +
        '<button class="task-check" aria-label="Toggle task">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>' +
        '<div class="task-body">' +
          '<span class="task-time">' + t.time + '</span>' +
          '<span class="task-text">' + t.text + '</span>' +
        '</div>' +
        '<span class="task-cat cat-' + t.cat + '">' + CAT_LABELS[t.cat] + '</span>' +
      '</li>';
    }).join("");

    listEl.querySelectorAll(".task-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var idx = Number(item.dataset.idx);
        var d = getDoneTasks();
        var pos = d.indexOf(idx);
        if (pos !== -1) d.splice(pos, 1); else d.push(idx);
        saveDoneTasks(d);
        renderTasks();
      });
    });

    updateTaskProgress(tasks.length, done.length);
  }

  function updateTaskProgress(total, doneCount) {
    var bar = document.getElementById("taskProgressBar");
    var label = document.getElementById("taskProgressLabel");
    if (!bar || !label) return;
    var pct = total ? Math.round((doneCount / total) * 100) : 0;
    bar.style.width = pct + "%";
    label.textContent = doneCount + "/" + total + " done";
    var allDoneEl = document.getElementById("tasksAllDone");
    if (allDoneEl) allDoneEl.style.display = (total > 0 && doneCount === total) ? "block" : "none";
  }

  async function sendTasksToSlack() {
    var user = getStoredUser();
    var tasks = TASKS[(user && user.role) || "technical"];
    var done = getDoneTasks();
    var lines = tasks.map(function (t, i) {
      return (done.indexOf(i) !== -1 ? ":white_check_mark: " : ":black_square_button: ") + "*" + t.time + "* — " + t.text;
    });
    var summary = "*" + (user ? user.name : "Team") + "'s Daily Tasks — " + todayKey() + "*\n" + lines.join("\n");
    var btn = document.getElementById("sendSlackBtn");
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      var res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({ text: summary })
      });
      var data = await res.json();
      showToast(data.ok ? "Daily tasks posted to Slack" : (data.error || "Slack post failed"));
    } catch {
      showToast("Slack post failed — check SLACK_WEBHOOK_URL");
    } finally {
      btn.disabled = false; btn.textContent = "Send to Slack";
    }
  }

  /* ── Login ────────────────────────────────────────────────────── */
  function initLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;
    if (isLoggedIn()) { window.location.href = "/admin/"; return; }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var errorEl = document.getElementById("loginError");
      var btn = document.getElementById("loginBtn");
      if (!email || !password) { errorEl.textContent = "Please enter email and password."; errorEl.classList.add("show"); return; }
      btn.disabled = true; btn.textContent = "Signing in...";
      errorEl.classList.remove("show");
      try {
        var res = await fetch(API_BASE + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: password }) });
        var data = await res.json();
        if (data.ok && data.token) { setToken(data.token, data.user); window.location.href = "/admin/"; }
        else { errorEl.textContent = data.error || "Login failed."; errorEl.classList.add("show"); }
      } catch (err) { errorEl.textContent = "Network error. Please try again."; errorEl.classList.add("show"); }
      finally { btn.disabled = false; btn.textContent = "Sign in"; }
    });
  }

  /* ── Dashboard ────────────────────────────────────────────────── */
  var allLeads = [];
  var currentFilter = "all";

  function initDashboard() {
    if (!isLoggedIn()) { window.location.href = "/admin/login.html"; return; }

    document.getElementById("logoutBtn").addEventListener("click", function (e) {
      e.preventDefault(); clearAuth(); window.location.href = "/admin/login.html";
    });

    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderLeads();
      });
    });

    document.getElementById("exportCsv").addEventListener("click", exportCSV);
    var slackBtn = document.getElementById("sendSlackBtn");
    if (slackBtn) slackBtn.addEventListener("click", sendTasksToSlack);

    loadLeads();
    loadAudits();
    initPageSwitching();
    initProductsUI();
    renderGreeting();
    renderTasks();
    updateTimestamp();
    setInterval(updateTimestamp, 60000);
  }

  async function loadLeads() {
    var data = await apiFetch("/leads");
    if (!data || !data.ok) return;
    allLeads = data.leads;
    document.getElementById("kpiTotal").textContent = data.counts.all;
    document.getElementById("kpiNew").textContent = data.counts.new;
    document.getElementById("kpiContacted").textContent = data.counts.contacted;
    document.getElementById("kpiClosed").textContent = data.counts.closed;
    document.getElementById("leadsBadge").textContent = data.counts.new;
    renderLeads();
  }

  function renderLeads() {
    var tbody = document.getElementById("leadsBody");
    var emptyState = document.getElementById("emptyState");
    if (!tbody) return;
    var filtered = allLeads;
    if (currentFilter !== "all") filtered = allLeads.filter(function (l) { return l.status === currentFilter; });
    if (filtered.length === 0) { tbody.innerHTML = ""; emptyState.style.display = "block"; return; }
    emptyState.style.display = "none";
    tbody.innerHTML = filtered.map(function (lead) {
      var date = new Date(lead.created_at || lead.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
      var phoneClean = (lead.phone || "").replace(/[^0-9]/g, "");
      var waText = encodeURIComponent("Hi " + lead.name + ", thank you for reaching out to Duta Integra. We received your inquiry about " + (lead.service || "our services") + ".");
      var waHref = phoneClean ? "https://wa.me/" + (phoneClean.startsWith("60") ? phoneClean : "60" + phoneClean) + "?text=" + waText : "#";
      var statusClass = "badge-" + lead.status;
      return '<tr>' +
        '<td><code style="font-size:11px;color:var(--text-light)">' + esc(lead.id) + '</code></td>' +
        '<td><b>' + esc(lead.name) + '</b>' + (lead.company ? '<br><small style="color:var(--text-muted)">' + esc(lead.company) + '</small>' : '') + '</td>' +
        '<td><a href="mailto:' + esc(lead.email) + '" style="color:var(--gold)">' + esc(lead.email) + '</a></td>' +
        '<td>' + esc(lead.phone) + '</td>' +
        '<td>' + esc(lead.service) + '</td>' +
        '<td><span class="badge-status ' + statusClass + '">' + esc(lead.status) + '</span></td>' +
        '<td style="white-space:nowrap">' + date + '</td>' +
        '<td style="white-space:nowrap">' +
          (phoneClean ? '<a class="btn-wa" href="' + waHref + '" target="_blank" rel="noopener">WhatsApp</a> ' : '') +
          '<button class="btn-action" onclick="updateStatus(\'' + lead.id + '\',\'contacted\')">Contacted</button> ' +
          '<button class="btn-action" onclick="updateStatus(\'' + lead.id + '\',\'closed\')">Closed</button>' +
        '</td></tr>';
    }).join("");
  }

  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  window.updateStatus = async function (id, status) {
    var data = await apiFetch("/leads?id=" + id, { method: "PATCH", body: JSON.stringify({ status: status }) });
    if (data && data.ok) { showToast("Lead " + id + " marked as " + status); loadLeads(); }
  };

  function exportCSV() {
    var data = currentFilter !== "all" ? allLeads.filter(function (l) { return l.status === currentFilter; }) : allLeads;
    if (data.length === 0) { showToast("No leads to export"); return; }
    var headers = ["ID", "Name", "Email", "Phone", "Company", "Service", "Status", "Date", "Message"];
    var rows = data.map(function (l) {
      return [l.id, '"' + l.name + '"', l.email, l.phone, '"' + (l.company || "") + '"', '"' + (l.service || "") + '"', l.status, new Date(l.created_at || l.createdAt).toLocaleDateString("en-MY"), '"' + (l.message || "").replace(/"/g, '""') + '"'];
    });
    var csv = [headers.join(","), rows.map(function (r) { return r.join(","); })].join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "duta_integra_leads_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully");
  }

  function showToast(msg) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg; toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 3000);
  }

  function updateTimestamp() {
    var el = document.getElementById("lastUpdated");
    if (el) el.textContent = new Date().toLocaleTimeString("en-MY", { hour12: false }) + " MYT";
  }

  /* ── View switching ─────────────────────────────────────────── */
  var PAGE_META = {
    dashboard: { title: "Dashboard", sub: "Overview of leads and activity" },
    leads: { title: "Leads", sub: "Every enquiry captured by the site", view: "dashboard" },
    audits: { title: "Audits", sub: "Free brand audit runs and conversions" },
    products: { title: "Products", sub: "Manage the Work section — add, edit, publish" }
  };

  function initPageSwitching() {
    var links = document.querySelectorAll(".sidebar-link[data-page]");
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var page = link.dataset.page;
        var meta = PAGE_META[page];
        if (!meta) return;
        links.forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
        document.querySelectorAll(".admin-view").forEach(function (v) { v.hidden = true; });
        var view = document.getElementById("view-" + (meta.view || page));
        if (view) view.hidden = false;
        document.getElementById("pageTitle").textContent = meta.title;
        document.getElementById("pageSub").textContent = meta.sub;
        if (page === "audits") loadAudits();
        if (page === "products") loadProducts();
      });
    });
  }

  /* ── Audits ───────────────────────────────────────────────────── */
  var allAudits = [];

  async function loadAudits() {
    var data = await apiFetch("/audits");
    if (!data || !data.ok) return;
    allAudits = data.audits || [];
    document.getElementById("auditsBadge").textContent = allAudits.length;
    renderAudits();
    renderStats(data.stats);
  }

  function scorePill(score) {
    var cls = score >= 80 ? "s-good" : score >= 60 ? "s-mid" : "s-low";
    return '<span class="score-pill ' + cls + '">' + score + '</span>';
  }

  function renderAudits() {
    var tbody = document.getElementById("auditsBody");
    if (!tbody) return;
    var empty = document.getElementById("auditsEmpty");
    if (!allAudits.length) { tbody.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    tbody.innerHTML = allAudits.map(function (a) {
      var date = new Date(a.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
      var followup = a.followup_sent_at
        ? new Date(a.followup_sent_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })
        : "—";
      return "<tr>" +
        '<td><a href="/audit?r=' + esc(a.share_slug) + '" target="_blank" rel="noopener" style="color:var(--gold)">' + esc(a.domain) + '</a></td>' +
        "<td>" + esc(a.brand_name || "—") + "</td>" +
        "<td>" + esc(a.email || "—") + "</td>" +
        "<td>" + scorePill(a.score) + "</td>" +
        "<td><b>" + esc(a.grade || "—") + "</b></td>" +
        '<td style="white-space:nowrap">' + date + "</td>" +
        '<td style="white-space:nowrap">' + followup + "</td>" +
        '<td style="white-space:nowrap"><button class="btn-action" onclick="copyReportLink(\'' + esc(a.share_slug) + '\')">Copy link</button></td>' +
        "</tr>";
    }).join("");
  }

  window.copyReportLink = function (slug) {
    var url = location.origin + "/audit?r=" + slug;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    showToast("Report link copied");
  };

  window.exportAuditsCsv = function () {
    if (!allAudits.length) { showToast("No audits to export"); return; }
    var rows = [["Domain", "Business", "Email", "Score", "Grade", "Date", "ShareLink"]];
    allAudits.forEach(function (a) {
      rows.push([a.domain, '"' + (a.brand_name || "") + '"', a.email || "", a.score, a.grade,
        new Date(a.created_at).toLocaleDateString("en-MY"),
        location.origin + "/audit?r=" + a.share_slug]);
    });
    downloadCsv(rows, "duta_integra_audits_" + todayKey() + ".csv");
  };

  function renderStats(stats) {
    var grid = document.getElementById("statsGrid");
    if (!grid || !stats) return;
    var items = [
      { label: "Audit runs", value: stats.audits30d, icon: "M21 21l-4.35-4.35" },
      { label: "Leads from audits", value: stats.leadsFromAudit, icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
      { label: "Avg. audit score", value: stats.avgScore != null ? stats.avgScore : "—", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14" },
      { label: "Follow-ups sent", value: stats.followupsSent, icon: "M22 2L11 13M22 2l-7 20-4-9-9-4z" }
    ];
    var eventBits = Object.keys(stats.events || {}).map(function (k) {
      return k.replace(/_/g, " ") + ": <b>" + stats.events[k] + "</b>";
    }).join(" &nbsp;·&nbsp; ");
    grid.innerHTML = items.map(function (it) {
      return '<div class="kpi-card"><div class="kpi-icon blue">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="' + it.icon + '"/></svg>' +
        '</div><div class="kpi-data"><div class="kpi-label">' + it.label + '</div>' +
        '<div class="kpi-value">' + it.value + "</div></div></div>";
    }).join("") +
    '<div class="kpi-card" style="grid-column:1/-1"><div class="kpi-data">' +
    '<div class="kpi-label">Events · last 30 days</div>' +
    '<div class="kpi-value" style="font-size:15px;font-weight:500">' +
    (eventBits || "No events yet") +
    "</div></div></div>";
  }

  /* ── Products ─────────────────────────────────────────────────── */
  var allProducts = [];

  async function loadProducts() {
    var data = await apiFetch("/products");
    if (!data || !data.ok) return;
    allProducts = data.products || [];
    renderProducts();
  }

  function renderProducts() {
    var tbody = document.getElementById("productsBody");
    if (!tbody) return;
    var empty = document.getElementById("productsEmpty");
    if (!allProducts.length) { tbody.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    tbody.innerHTML = allProducts.map(function (p) {
      var img = p.image_url
        ? '<img class="thumb" src="' + esc(p.image_url) + '" alt="" />'
        : '<span class="thumb"></span>';
      return "<tr>" +
        "<td>" + img + "</td>" +
        "<td><b>" + esc(p.name) + "</b>" + (p.tagline ? '<br><small style="color:var(--text-muted)">' + esc(p.tagline) + "</small>" : "") + "</td>" +
        "<td>" + esc(p.category || "—") + "</td>" +
        "<td>" + (p.preview_url ? '<a href="' + esc(p.preview_url) + '" target="_blank" rel="noopener" style="color:var(--gold)">Open ↗</a>' : "—") + "</td>" +
        "<td>" + Number(p.sort_order || 0) + "</td>" +
        '<td><span class="badge-status badge-' + esc(p.status) + '">' + esc(p.status) + "</span></td>" +
        '<td style="white-space:nowrap">' +
          '<button class="btn-action" onclick=\'openProductModal(' + JSON.stringify(p).replace(/'/g, "&#39;") + ')\'>Edit</button> ' +
          '<button class="btn-action" onclick="toggleProduct(\'' + p.id + "','" + (p.status === "published" ? "draft" : "published") + '\')">' +
            (p.status === "published" ? "Unpublish" : "Publish") + "</button>" +
        "</td></tr>";
    }).join("");
  }

  window.toggleProduct = async function (id, status) {
    var data = await apiFetch("/products?id=" + id, { method: "PATCH", body: JSON.stringify({ status: status }) });
    if (data && data.ok) { showToast("Product " + status); loadProducts(); }
    else showToast((data && data.error) || "Update failed");
  };

  /* Product modal */
  function metricRow(value, label) {
    var row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML =
      '<input placeholder="70%" value="' + (value || "") + '" />' +
      '<input placeholder="Fewer enquiries" value="' + (label || "") + '" />' +
      '<button type="button" aria-label="Remove">×</button>';
    row.querySelector("button").addEventListener("click", function () { row.remove(); });
    return row;
  }

  function openProductModal(product) {
    var m = document.getElementById("productModal");
    document.getElementById("productModalTitle").textContent = product ? "Edit product" : "Add product";
    document.getElementById("pf-id").value = product ? product.id : "";
    document.getElementById("pf-name").value = product ? product.name : "";
    document.getElementById("pf-category").value = product ? product.category || "" : "";
    document.getElementById("pf-tagline").value = product ? product.tagline || "" : "";
    document.getElementById("pf-desc-en").value = product ? product.description_en || "" : "";
    document.getElementById("pf-desc-ms").value = product ? product.description_ms || "" : "";
    document.getElementById("pf-tags").value = product && Array.isArray(product.tags) ? product.tags.join(", ") : "";
    document.getElementById("pf-preview-url").value = product ? product.preview_url || "" : "";
    document.getElementById("pf-cta-en").value = product ? product.contact_cta_en || "" : "";
    document.getElementById("pf-cta-ms").value = product ? product.contact_cta_ms || "" : "";
    document.getElementById("pf-status").value = product ? product.status : "draft";
    document.getElementById("pf-sort").value = product ? Number(product.sort_order || 0) : allProducts.length;
    document.getElementById("pf-image-url").value = product ? product.image_url || "" : "";
    syncImagePreview();

    var rows = document.getElementById("metricsRows");
    rows.innerHTML = "";
    var metrics = product && Array.isArray(product.metrics) ? product.metrics : [];
    metrics.forEach(function (mt) { rows.appendChild(metricRow(mt.value, mt.label)); });

    document.getElementById("productDeleteBtn").hidden = !product;
    document.getElementById("uploadError").hidden = true;
    m.hidden = false;
  }

  function closeProductModal() {
    document.getElementById("productModal").hidden = true;
  }

  function syncImagePreview() {
    var url = document.getElementById("pf-image-url").value.trim();
    var img = document.getElementById("pf-img-preview");
    img.hidden = !url;
    if (url) img.src = url;
  }

  async function uploadProductImage(file) {
    var errEl = document.getElementById("uploadError");
    errEl.hidden = true;
    var fd = new FormData();
    fd.append("file", file);
    var btn = document.getElementById("pf-upload-btn");
    btn.disabled = true; btn.textContent = "Uploading…";
    try {
      var res = await fetch("/api/admin/products?upload=1", {
        method: "POST",
        headers: { Authorization: "Bearer " + getToken() },
        body: fd
      });
      var data = await res.json();
      if (data.ok && data.url) {
        document.getElementById("pf-image-url").value = data.url;
        syncImagePreview();
        showToast("Image uploaded");
      } else {
        errEl.textContent = data.error || "Upload failed";
        errEl.hidden = false;
      }
    } catch {
      errEl.textContent = "Upload failed — network error";
      errEl.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Upload…";
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    var id = document.getElementById("pf-id").value;
    var metrics = [];
    document.querySelectorAll("#metricsRows .metric-row").forEach(function (row) {
      var inputs = row.querySelectorAll("input");
      if (inputs[0].value.trim() && inputs[1].value.trim()) {
        metrics.push({ value: inputs[0].value.trim(), label: inputs[1].value.trim() });
      }
    });
    var payload = {
      name: document.getElementById("pf-name").value.trim(),
      category: document.getElementById("pf-category").value.trim(),
      tagline: document.getElementById("pf-tagline").value.trim(),
      description_en: document.getElementById("pf-desc-en").value.trim(),
      description_ms: document.getElementById("pf-desc-ms").value.trim(),
      tags: document.getElementById("pf-tags").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
      metrics: metrics,
      preview_url: document.getElementById("pf-preview-url").value.trim(),
      contact_cta_en: document.getElementById("pf-cta-en").value.trim() || "Discuss a similar build",
      contact_cta_ms: document.getElementById("pf-cta-ms").value.trim() || "Bincangkan binaan yang serupa",
      status: document.getElementById("pf-status").value,
      sort_order: Number(document.getElementById("pf-sort").value) || 0,
      image_url: document.getElementById("pf-image-url").value.trim()
    };
    var btn = document.getElementById("productSaveBtn");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      var data = await apiFetch("/products" + (id ? "?id=" + id : ""), {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      if (data && data.ok) {
        showToast(id ? "Product updated" : "Product created");
        closeProductModal();
        loadProducts();
      } else {
        showToast((data && data.error) || "Save failed");
      }
    } finally {
      btn.disabled = false; btn.textContent = "Save product";
    }
  }

  async function deleteProduct() {
    var id = document.getElementById("pf-id").value;
    if (!id) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    var data = await apiFetch("/products?id=" + id, { method: "DELETE" });
    if (data && data.ok) { showToast("Product deleted"); closeProductModal(); loadProducts(); }
  }

  function initProductsUI() {
    var addBtn = document.getElementById("addProductBtn");
    if (!addBtn) return;
    addBtn.addEventListener("click", function () { openProductModal(null); });
    document.getElementById("productModalClose").addEventListener("click", closeProductModal);
    document.getElementById("productCancelBtn").addEventListener("click", closeProductModal);
    document.getElementById("productDeleteBtn").addEventListener("click", deleteProduct);
    document.getElementById("productForm").addEventListener("submit", saveProduct);
    document.getElementById("pf-upload-btn").addEventListener("click", function () {
      document.getElementById("pf-image-file").click();
    });
    document.getElementById("pf-image-file").addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (f) uploadProductImage(f);
      this.value = "";
    });
    document.getElementById("pf-image-url").addEventListener("change", syncImagePreview);
    document.getElementById("addMetricRow").addEventListener("click", function () {
      var rows = document.querySelectorAll("#metricsRows .metric-row").length;
      if (rows < 4) document.getElementById("metricsRows").appendChild(metricRow());
    });
    document.getElementById("exportAuditsCsv").addEventListener("click", window.exportAuditsCsv);
    document.getElementById("productModal").addEventListener("click", function (e) {
      if (e.target === this) closeProductModal();
    });
  }


  function downloadCsv(rows, filename) {
    var csv = rows.map(function (r) {
      return r.map(function (cell) { return String(cell); }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("loginForm")) initLogin();
    else if (document.getElementById("leadsBody")) initDashboard();
  });
})();
