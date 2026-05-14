// render.js
// Pure functions that receive data and return HTML strings.
// No event listeners or DOM queries: only markup building.

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        switch (char) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#39;";
            default:
                return char;
        }
    });
}

function buildTagsHTML(tags = []) {
    return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function isImageLikeSource(value) {
    return /^(https?:\/\/|data:image\/)/i.test(String(value || "").trim());
}

function buildImageHTML(product, loading = "lazy") {
    const src = escapeHtml(product.image || window.getFallbackImage?.() || "");
    const fallbackSrc = escapeHtml(window.getFallbackImage?.() || src);
    const alt = escapeHtml(product.title || "Juego");
    const loadingAttr = loading ? ` loading="${loading}"` : "";

    return `<img src="${src}" alt="${alt}" data-fallback-src="${fallbackSrc}" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;"${loadingAttr} />`;
}

function buildFavoriteIconHTML() {
    return `
        <svg class="favorite-toggle__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 21s-6.716-4.35-9.193-8.15C.726 9.677 2.148 5 6.382 5c2.104 0 3.57 1.153 4.418 2.428C11.648 6.153 13.114 5 15.218 5 19.452 5 20.874 9.677 18.793 12.85 16.316 16.65 12 21 12 21Z"></path>
        </svg>
    `;
}

function buildFeatureIconMarkup(icon) {
    const safeIcon = escapeHtml(icon);

    if (isImageLikeSource(icon)) {
        return `<img src="${safeIcon}" alt="" loading="lazy" onerror="this.remove()" />`;
    }

    return safeIcon;
}

function buildDetailFeaturesHTML(features = []) {
    const safeFeatures = Array.isArray(features) ? features.filter((feature) => feature?.name) : [];

    if (safeFeatures.length === 0) return "";

    return `
      <div class="characteristics__features">
        <h3 class="characteristics__subtitle">Géneros</h3>
        <ul class="detail__features-list">
          ${safeFeatures
              .map(
                  (feature) => `
                <li class="detail-feature">
                  <span class="detail-feature__icon" aria-hidden="true">${buildFeatureIconMarkup(feature.icon)}</span>
                  <span class="detail-feature__label">${escapeHtml(feature.name)}</span>
                </li>
              `,
              )
              .join("")}
        </ul>
      </div>
    `;
}

function buildFavoriteCardButton(product) {
    if (!window.Favorites?.canUseFavorites?.()) return "";

    const favorite = Boolean(window.Favorites?.isFavorite?.(product.id));
    const label = favorite ? "Quitar de favoritos" : "Agregar a favoritos";

    return `
        <button
            class="favorite-toggle ${favorite ? "favorite-toggle--active" : ""}"
            type="button"
            data-action="toggle-favorite"
            data-product-id="${escapeHtml(product.id)}"
            aria-label="${label}"
            aria-pressed="${favorite ? "true" : "false"}"
        >
            ${buildFavoriteIconHTML()}
        </button>
    `;
}

function buildDetailFavoriteButton(product) {
    if (!window.Favorites?.canUseFavorites?.()) return "";

    const favorite = Boolean(window.Favorites?.isFavorite?.(product.id));

    return `
        <button
            class="btn-secondary btn-secondary--favorite ${favorite ? "btn-secondary--active" : ""}"
            type="button"
            data-action="toggle-favorite"
            data-product-id="${escapeHtml(product.id)}"
            aria-pressed="${favorite ? "true" : "false"}"
        >
            <span class="btn-secondary__content">
                ${buildFavoriteIconHTML()}
                <span>${favorite ? "Quitar de favoritos" : "Agregar a favoritos"}</span>
            </span>
        </button>
    `;
}

function buildCardHTML(product) {
    const discountBadge = product.discount ? `<span class="card__discount">-${product.discount}%</span>` : "";
    const originalPrice = product.originalPrice ? `<span class="card__price-original">${formatPrice(product.originalPrice)}</span>` : "";
    const favoriteButton = buildFavoriteCardButton(product);

    return `
    <div class="card__img-wrap">
      ${buildImageHTML(product)}
      ${discountBadge}
      ${favoriteButton}
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(product.title)}</h3>
      <div class="card__tags">${buildTagsHTML(product.tags)}</div>
      <div class="card__footer">
        <div class="card__price-block">
          ${originalPrice}
          <span class="card__price">${formatPrice(product.price)}</span>
        </div>
        <span class="card__release">${escapeHtml(product.releaseDate)}</span>
      </div>
    </div>
  `;
}

function buildDetailHTML(product) {
    const discountBadge = product.discount ? `<span class="detail__badge-img">-${product.discount}% OFERTA</span>` : "";
    const originalPrice = product.originalPrice ? `<span class="detail__price-original">${formatPrice(product.originalPrice)}</span>` : "";
    const discountPill = product.discount ? `<span class="detail__discount-pill">-${product.discount}% OFF</span>` : "";
    const favoriteButton = buildDetailFavoriteButton(product);

    return `
    <div class="detail__layout">
      <div class="detail__header-row">
        <h1 class="detail__title">${escapeHtml(product.title)}</h1>
        <button class="detail__back" type="button" data-action="back-to-grid">
          Volver
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 5 5 12 12 19" />
          </svg>
        </button>
      </div>

      <div class="detail__img-wrap">
        ${buildImageHTML(product, "")}
        ${discountBadge}
      </div>

      <div class="detail__info">
        <section class="detail__characteristics" aria-labelledby="detail-characteristics-title">
          <div class="detail__section-header">
            <h2 class="detail__section-title" id="detail-characteristics-title">Características</h2>
            <div class="detail__pricing">
              ${originalPrice}
              <span class="detail__price">${formatPrice(product.price)}</span>
              ${discountPill}
            </div>
          </div>

          <div class="detail__tags-wrapper">
            <div class="detail__tags">${buildTagsHTML(product.tags)}</div>
          </div>

          <p class="detail__description">${escapeHtml(product.description)}</p>

          <div class="detail__meta">
            <div class="meta-item">
              <span class="meta-item__label">Fecha de lanzamiento</span>
              <span class="meta-item__value">${escapeHtml(product.releaseDate)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">Plataformas</span>
              <span class="meta-item__value">PC / PS5 / Xbox</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">Idioma</span>
              <span class="meta-item__value">Espa&ntilde;ol incluido</span>
            </div>
          </div>

          <!-- Alquiler del producto -->
          <div class="detail__rental" aria-labelledby="detail-rental-title">
            <div class="detail__section-header detail__section-header--stacked">
              <h3 class="detail__section-title" id="detail-rental-title">Alquilar producto</h3>
              <p class="detail__section-note" id="rentalAuthNote">Iniciá sesión para alquilar este juego.</p>
            </div>

            <form id="rentalForm" class="rental-form">
              <div class="rental-form__fields">
                <label class="rental-form__field" for="rentalStartDate">
                  <span>Fecha de inicio</span>
                  <input class="date-input rental-form__input" id="rentalStartDate" type="date" />
                </label>

                <label class="rental-form__field" for="rentalEndDate">
                  <span>Fecha de fin</span>
                  <input class="date-input rental-form__input" id="rentalEndDate" type="date" />
                </label>
              </div>

              <div class="rental-summary" aria-live="polite">
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Precio por día</span>
                  <span class="rental-summary__value" id="rentalDailyPrice">—</span>
                </div>
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Días</span>
                  <span class="rental-summary__value" id="rentalDays">—</span>
                </div>
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Total</span>
                  <span class="rental-summary__value rental-summary__value--accent" id="rentalTotalPrice">—</span>
                </div>
              </div>

              <p id="rentalLongStayWarning" class="rental-warning" hidden>Si lo alquilás por más de 30 días, conviene comprarlo.</p>
              <p id="rentalFeedback" class="rental-feedback" hidden></p>

              <button class="btn-primary rental-form__submit" id="rentalSubmitBtn" type="submit">Alquilar ahora</button>
            </form>
          </div>

          
        </section>

        <div class="detail__actions">
          <button class="btn-primary" type="button">Agregar al carrito</button>
          ${favoriteButton}
          <button class="btn-secondary" type="button">Lista de deseos</button>
        </div>
      </div>
    </div>
  `;
}

function buildNoResultsHTML(message = "No se encontraron juegos con ese criterio.") {
    return `
    <div class="no-results">
      <div class="no-results__icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
