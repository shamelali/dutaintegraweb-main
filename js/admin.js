/* Duta Integra — Admin Panel JavaScript */
(function () {
  const API_BASE = "/api/admin";
  const TOKEN_KEY = "di_admin_token";
  const USER_KEY = "di_admin_user";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
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

    document.querySelectorAll(".sidebar-link[data-page]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".sidebar-link").forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
      });
    });

    loadLeads();
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

  /* ── Init ──────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("loginForm")) initLogin();
    else if (document.getElementById("leadsTable") || document.getElementById("leadsBody")) initDashboard();
  });
})();
