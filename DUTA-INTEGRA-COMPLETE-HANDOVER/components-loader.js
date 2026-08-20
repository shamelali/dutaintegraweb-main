// Duta Integra - Shared Component Loader
// Add to every HTML page: <div id="di-header"></div> and <div id="di-footer"></div>
// Then load this script
(async function() {
  async function loadComponent(id, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const html = await res.text();
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    } catch(e) { console.warn('Failed to load', url, e); }
  }
  await Promise.all([
    loadComponent('di-header', '/components/header.html'),
    loadComponent('di-footer', '/components/footer.html')
  ]);
})();
