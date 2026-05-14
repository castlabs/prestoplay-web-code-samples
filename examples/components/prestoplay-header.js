class PrestoplayHeader extends HTMLElement {
  connectedCallback() {
    const logoSrc = new URL('../../assets/logo.png', import.meta.url);
    const stylesheetHref = new URL('./prestoplay-header.styles.css', import.meta.url);

    const backHref = this.getAttribute('back-href');
    const backLink = backHref ? `<a href="${backHref}" class="header-back">Back</a>` : '';

    let root = this.shadowRoot;
    // Calling attachShadow would throw an error if element is removed and re-added.
    if (!root) {
      root = this.attachShadow({ mode: "open" });
    }

    root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetHref}">
      <header class="header">
        ${backLink}
        <img src="${logoSrc}" alt="castlabs" class="header-logo">
      </header>
    `;
  }
}

customElements.define('prestoplay-header', PrestoplayHeader);
