// render.js
// Pure functions that receive data and return HTML strings.
// No event listeners, no DOM queries — only building markup.
// Depends on: data.js (formatPrice)

/**
 * Builds the tag pill HTML for a list of tag strings.
 * Used by both the card and the detail view.
 */
function buildTagsHTML(tags) {
    return tags.map((t) => `<span class="tag">${t}</span>`).join("");
}

/**
 * Builds the complete HTML for a product card.
 * The card element itself is created in ui.js so event listeners
 * can be attached before insertion into the DOM.
 */
function buildCardHTML(product) {
    const discountBadge = product.discount ? `<span class="card__discount">-${product.discount}%</span>` : "";

    const originalPrice = product.originalPrice ? `<span class="card__price-original">${formatPrice(product.originalPrice)}</span>` : "";

    return `
    <div class="card__img-wrap">
      <img src="${product.image}" alt="${product.title}" loading="lazy" />
      ${discountBadge}
    </div>
    <div class="card__body">
      <h3 class="card__title">${product.title}</h3>
      <div class="card__tags">${buildTagsHTML(product.tags)}</div>
      <div class="card__footer">
        <div class="card__price-block">
          ${originalPrice}
          <span class="card__price">${formatPrice(product.price)}</span>
        </div>
        <span class="card__release">${product.releaseDate}</span>
      </div>
    </div>
  `;
}

/**
 * Builds the full detail view HTML for a single product.
 * Injected into #detailContent by router.js.
 */
function buildDetailHTML(product) {
    const discountBadge = product.discount ? `<span class="detail__badge-img">-${product.discount}% OFERTA</span>` : "";

    const originalPrice = product.originalPrice ? `<span class="detail__price-original">${formatPrice(product.originalPrice)}</span>` : "";

    const discountPill = product.discount ? `<span class="detail__discount-pill">-${product.discount}% OFF</span>` : "";

    return `
    <div class="detail__layout">

      <div class="detail__header-row">
        <h1 class="detail__title">${product.title}</h1>
        <button class="detail__back" type="button" data-action="back-to-grid">
          Volver
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 19 5 12 12 19" />
          </svg>
        </button>
      </div>

      <!-- full-width hero image -->
      <div class="detail__img-wrap">
        <img src="${product.image}" alt="${product.title}" />
        ${discountBadge}
      </div>

      <!-- all info below the image -->
      <div class="detail__info">

        <div class="detail__info-top">
          <div>
            <p class="detail__publisher">${product.publisher}</p>
            <div class="detail__tags">${buildTagsHTML(product.tags)}</div>
          </div>
          <div class="detail__pricing">
            ${originalPrice}
            <span class="detail__price">${formatPrice(product.price)}</span>
            ${discountPill}
          </div>
        </div>

        <p class="detail__description">${product.description}</p>

        <div class="detail__meta">
          <div class="meta-item">
            <span class="meta-item__label">Fecha de lanzamiento</span>
            <span class="meta-item__value">${product.releaseDate}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Desarrollador</span>
            <span class="meta-item__value">${product.publisher}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Plataformas</span>
            <span class="meta-item__value">PC / PS5 / Xbox</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">Idioma</span>
            <span class="meta-item__value">Español incluido</span>
          </div>
        </div>

        <div class="detail__actions">
          <button class="btn-primary" type="button">Agregar al carrito</button>
          <button class="btn-secondary" type="button">Lista de deseos</button>
        </div>

      </div>

    </div>
  `;
}

/**
 * Builds the empty-state HTML shown when search yields no results.
 */
function buildNoResultsHTML() {
    return `
    <div class="no-results">
      <div class="no-results__icon">🔍</div>
      <p>No se encontraron juegos con ese criterio.</p>
    </div>
  `;
}
