// Duta Integra — header/footer component loader (no external deps)

customElements.define('components-loader', class extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="di-header"></div>
      <div id="di-footer"></div>
    `;
    this.loadHeader().then(() => this.loadFooter());
  }

  loadHeader() {
    return fetch('/components/header.html')
      .then(r => r.text())
      .then(html => {
        const header = document.getElementById('di-header');
        if (header) header.innerHTML = html;
      });
  }

  loadFooter() {
    return fetch('/components/footer.html')
      .then(r => r.text())
      .then(html => {
        const footer = document.getElementById('di-footer');
        if (footer) footer.innerHTML = html;
      });
  }
});