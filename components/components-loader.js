// Duta Integra — header/footer component loader (no external deps)

(function() {
  function loadHeader() {
    return fetch('/components/header.html')
      .then(r => r.text())
      .then(html => {
        const header = document.getElementById('di-header');
        if (header) header.innerHTML = html;
        if (typeof applyI18n === 'function') applyI18n();
      });
  }

  function loadFooter() {
    return fetch('/components/footer.html')
      .then(r => r.text())
      .then(html => {
        const footer = document.getElementById('di-footer');
        if (footer) footer.innerHTML = html;
        if (typeof applyI18n === 'function') applyI18n();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadHeader().then(loadFooter);
    });
  } else {
    loadHeader().then(loadFooter);
  }
})();