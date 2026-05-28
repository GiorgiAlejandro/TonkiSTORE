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

function buildFavoriteIconHTML(favorite = false) {
    return `
    <svg class="favorite-toggle__icon ${favorite ? "favorite-toggle__icon--active" : ""}" width="18" height="18" viewBox="0 0 24 24" fill="${favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
          ${buildFavoriteIconHTML(favorite)}
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
            ${buildFavoriteIconHTML(favorite)}
                <span>${favorite ? "Quitar de favoritos" : "Agregar a favoritos"}</span>
            </span>
        </button>
    `;
}

function buildRentalDateFieldsHTML() {
    return `
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
    `;
}

function buildCardHTML(product) {
    const isLibraryItem = Boolean(product?.type);
    const isOwned = Boolean(window.LibraryView?.isOwned?.(product?.id));
    const discountBadge = !isLibraryItem && !isOwned && product.discount ? `<span class="card__discount">-${product.discount}%</span>` : "";
    const rentalBadge = product.type === "rental" && product.rentalRemainingLabel ? `<span class="card__rental-badge">${escapeHtml(product.rentalRemainingLabel)}</span>` : "";
    const ownedBadge = isOwned ? `<span class="card__owned-badge">En tu biblioteca</span>` : "";
    const statusBadges = [ownedBadge, discountBadge, rentalBadge].filter(Boolean).join("");
    const originalPrice = !isLibraryItem && !isOwned && product.originalPrice ? `<span class="card__price-original">${formatPrice(product.originalPrice)}</span>` : "";
    const favoriteButton = buildFavoriteCardButton(product);
    const priceBlock =
        !isLibraryItem && !isOwned
            ? `
        <div class="card__price-block">
          ${originalPrice}
          <span class="card__price">${formatPrice(product.price)}</span>
        </div>
      `
            : "";

    return `
    <div class="card__img-wrap">
      ${buildImageHTML(product)}
      <div class="card__badges">${statusBadges}</div>
      ${favoriteButton}
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(product.title)}</h3>
      <div class="card__tags">${buildTagsHTML(product.tags)}</div>
      <div class="card__footer">
        ${priceBlock}
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
    const isOwnedGame = Boolean(window.LibraryView?.isOwned?.(product?.id));
    const canRent = Number(product?.price ?? 0) >= 2;
    const rentalSection =
        !isOwnedGame && canRent
            ? `
          <div class="detail__rental" aria-labelledby="detail-rental-title">
            <div class="detail__section-header detail__section-header--stacked">
              <h3 class="detail__section-title" id="detail-rental-title">Elegí las fechas de alquiler</h3>
              <p class="detail__section-note" id="rentalAuthNote">Elegí una fecha de inicio y una fecha de fin. El rango no puede superar 30 días.</p>
            </div>

            <form id="rentalForm" class="rental-form">
              ${buildRentalDateFieldsHTML()}

              <div class="rental-summary" aria-live="polite">
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Precio por día</span>
                  <span class="rental-summary__value" id="rentalDailyPrice">—</span>
                </div>
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Duración</span>
                  <span class="rental-summary__value" id="rentalDays">—</span>
                </div>
                <div class="rental-summary__item">
                  <span class="rental-summary__label">Total estimado</span>
                  <span class="rental-summary__value rental-summary__value--accent" id="rentalTotalPrice">—</span>
                </div>
              </div>

              <p id="rentalLongStayWarning" class="rental-warning" hidden>El rango máximo permitido es de 30 días.</p>
              <p id="rentalFeedback" class="rental-feedback" hidden></p>

              <button class="btn-primary rental-form__submit" id="rentalSubmitBtn" type="submit">Agregar alquiler al carrito</button>
            </form>
          </div>
        `
            : "";

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
        ${favoriteButton}
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

          ${rentalSection}
        </section>

        <div class="detail__actions">
          ${isOwnedGame ? "" : '<button class="btn-primary" type="button" id="detailAddToCartBtn">Agregar al carrito</button>'}
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

function buildTransactionSummaryHTML(transaction) {
    const product = transaction?.product || {};
    const packageInfo = transaction?.package || {};
    const user = transaction?.user || window.Auth?.getCurrentUser?.() || {};
    const startDate = transaction?.startDate || new Date();
    const expiryDate = transaction?.expiryDate || new Date();
    const dailyPrice = Number(transaction?.dailyPrice ?? Math.round(Number(product.price ?? 0) / 30));
    const days = Number(transaction?.days ?? packageInfo.days ?? 0);
    const subtotal = Number(transaction?.subtotal ?? dailyPrice * days);
    const total = Number(transaction?.total ?? subtotal);
    const dateFormatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return `
    <div class="preview-panel">
      <div class="preview-hero">
        <div class="preview-hero__media">
          ${buildImageHTML(product, "")}
          <span class="preview-hero__badge">Vista previa del alquiler</span>
        </div>

        <div class="preview-hero__content">
          <p class="hero__label">// Vista previa del alquiler</p>
          <h1 class="search-block__title">${escapeHtml(product.title || "Juego seleccionado")}</h1>
          <p class="search-block__description">Revisá el acceso, el precio y los datos de tu sesión antes de procesar la transacción.</p>

          <div class="preview-user">
            <div class="preview-user__avatar">${escapeHtml(
                user.nombre || user.apellido
                    ? `${String(user.nombre || "").charAt(0)}${String(user.apellido || "").charAt(0)}`.trim() || "U"
                    : String(user.email || "U")
                          .charAt(0)
                          .toUpperCase(),
            )}</div>
            <div>
              <p class="preview-user__label">Usuario activo</p>
              <p class="preview-user__name">${escapeHtml([user.nombre, user.apellido].filter(Boolean).join(" ") || user.email || "Usuario")}</p>
              <p class="preview-user__email">${escapeHtml(user.email || "")}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-grid">
        <section class="preview-card">
          <h2 class="preview-card__title">Características principales</h2>
          <div class="preview-card__body">
            <div class="preview-tags">${buildTagsHTML(product.tags)}</div>
            ${buildDetailFeaturesHTML(product.features)}
          </div>
        </section>

        <section class="preview-card">
          <h2 class="preview-card__title">Acceso y expiración</h2>
          <div class="preview-list">
            <div class="preview-list__item">
              <span class="preview-list__label">Inicio del acceso</span>
              <span class="preview-list__value">${escapeHtml(dateFormatter.format(new Date(startDate)))}</span>
            </div>
            <div class="preview-list__item preview-list__item--accent">
              <span class="preview-list__label">Expira el</span>
              <span class="preview-list__value">${escapeHtml(dateFormatter.format(new Date(expiryDate)))}</span>
            </div>
            <div class="preview-list__item">
              <span class="preview-list__label">Duración elegida</span>
              <span class="preview-list__value">${escapeHtml(days ? `${days} día${days !== 1 ? "s" : ""}` : "—")}</span>
            </div>
          </div>
        </section>

        <section class="preview-card">
          <h2 class="preview-card__title">Desglose del precio</h2>
          <div class="preview-list">
            <div class="preview-list__item">
              <span class="preview-list__label">Precio por día</span>
              <span class="preview-list__value">${escapeHtml(formatPrice(dailyPrice))}</span>
            </div>
            <div class="preview-list__item">
              <span class="preview-list__label">Días</span>
              <span class="preview-list__value">${escapeHtml(days || "—")}</span>
            </div>
            <div class="preview-list__item preview-list__item--accent">
              <span class="preview-list__label">Total</span>
              <span class="preview-list__value">${escapeHtml(formatPrice(total))}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="transactionConfirmBtn">Procesar transacción</button>
        <button type="button" class="btn-search-reset" id="transactionBackBtn">Volver al detalle</button>
      </div>

      <p class="transaction-summary__status" id="transactionStatus" hidden></p>
    </div>
  `;
}

function buildRentalConfirmationHTML(transaction) {
    const product = transaction?.product || {};
    const endDate = transaction?.endDate || transaction?.expiryDate || new Date();
    const endDateValue = typeof endDate === "string" ? `${endDate}T00:00:00` : endDate;
    const dateFormatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return `
    <div class="preview-panel confirmation-panel">
      <div class="preview-hero confirmation-hero">
        <div class="preview-hero__media confirmation-hero__media">
          ${buildImageHTML(product, "")}
          <span class="preview-hero__badge confirmation-hero__badge">Alquiler confirmado</span>
        </div>

        <div class="preview-hero__content confirmation-hero__content">
          <p class="hero__label">// Confirmación</p>
          <h1 class="search-block__title">${escapeHtml(product.title || "Juego disponible")}</h1>
          <p class="search-block__description">El juego ya está disponible en tu biblioteca del perfil.</p>

          <div class="confirmation-status">
            <span class="confirmation-status__label">Acceso habilitado</span>
            <span class="confirmation-status__value">Sí, disponible hasta el ${escapeHtml(dateFormatter.format(new Date(endDateValue)))}</span>
          </div>
        </div>
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="confirmationHomeBtn">Volver al catálogo</button>
      </div>
    </div>
  `;
}

function buildPurchaseSummaryHTML(transaction) {
    const product = transaction?.product || {};
    const user = transaction?.user || window.Auth?.getCurrentUser?.() || {};
    const total = Number(transaction?.total ?? Number(product.price ?? 0));
    const dateFormatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return `
    <div class="preview-panel">
      <div class="preview-hero">
        <div class="preview-hero__media">
          ${buildImageHTML(product, "")}
          <span class="preview-hero__badge">Vista previa de compra</span>
        </div>

        <div class="preview-hero__content">
          <p class="hero__label">// Vista previa de compra</p>
          <h1 class="search-block__title">${escapeHtml(product.title || "Juego seleccionado")}</h1>
          <p class="search-block__description">Revisá el precio final y los datos de tu cuenta antes de confirmar la compra permanente.</p>

          <div class="preview-user">
            <div class="preview-user__avatar">${escapeHtml(
                user.nombre || user.apellido
                    ? `${String(user.nombre || "").charAt(0)}${String(user.apellido || "").charAt(0)}`.trim() || "U"
                    : String(user.email || "U")
                          .charAt(0)
                          .toUpperCase(),
            )}</div>
            <div>
              <p class="preview-user__label">Usuario activo</p>
              <p class="preview-user__name">${escapeHtml([user.nombre, user.apellido].filter(Boolean).join(" ") || user.email || "Usuario")}</p>
              <p class="preview-user__email">${escapeHtml(user.email || "")}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-grid">
        <section class="preview-card">
          <h2 class="preview-card__title">Características principales</h2>
          <div class="preview-card__body">
            <div class="preview-tags">${buildTagsHTML(product.tags)}</div>
            ${buildDetailFeaturesHTML(product.features)}
          </div>
        </section>

        <section class="preview-card">
          <h2 class="preview-card__title">Compra permanente</h2>
          <div class="preview-list">
            <div class="preview-list__item">
              <span class="preview-list__label">Fecha de compra</span>
              <span class="preview-list__value">${escapeHtml(dateFormatter.format(new Date()))}</span>
            </div>
            <div class="preview-list__item preview-list__item--accent">
              <span class="preview-list__label">Acceso</span>
              <span class="preview-list__value">Permanente</span>
            </div>
            <div class="preview-list__item">
              <span class="preview-list__label">Biblioteca</span>
              <span class="preview-list__value">Disponible al confirmar</span>
            </div>
          </div>
        </section>

        <section class="preview-card">
          <h2 class="preview-card__title">Desglose del precio</h2>
          <div class="preview-list">
            <div class="preview-list__item">
              <span class="preview-list__label">Precio del juego</span>
              <span class="preview-list__value">${escapeHtml(formatPrice(total))}</span>
            </div>
            <div class="preview-list__item preview-list__item--accent">
              <span class="preview-list__label">Total a pagar</span>
              <span class="preview-list__value">${escapeHtml(formatPrice(total))}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="purchaseConfirmBtn">Confirmar compra</button>
        <button type="button" class="btn-search-reset" id="purchaseBackBtn">Volver al detalle</button>
      </div>

      <p class="transaction-summary__status" id="purchaseStatus" hidden></p>
    </div>
  `;
}

function buildPurchaseConfirmationHTML(transaction) {
    const product = transaction?.product || {};
    const dateFormatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return `
    <div class="preview-panel confirmation-panel">
      <div class="preview-hero confirmation-hero">
        <div class="preview-hero__media confirmation-hero__media">
          ${buildImageHTML(product, "")}
          <span class="preview-hero__badge confirmation-hero__badge">Compra confirmada</span>
        </div>

        <div class="preview-hero__content confirmation-hero__content">
          <p class="hero__label">// Confirmación</p>
          <h1 class="search-block__title">${escapeHtml(product.title || "Juego comprado")}</h1>
          <p class="search-block__description">La compra se realizó con éxito y el juego ya es tuyo.</p>

          <div class="confirmation-status">
            <span class="confirmation-status__label">Estado</span>
            <span class="confirmation-status__value">Comprado correctamente el ${escapeHtml(dateFormatter.format(new Date()))}</span>
          </div>
        </div>
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="purchaseHomeBtn">Volver al catálogo</button>
      </div>
    </div>
  `;
}

function _formatCartType(item) {
    return item?.type === "rental" ? "Alquiler" : "Compra";
}

function buildCartItemHTML(item) {
    const label = _formatCartType(item);
    const details = item.type === "rental" ? `${item.days || "—"} día${Number(item.days) === 1 ? "" : "s"} · ${escapeHtml(item.startDate || "")}${item.endDate ? ` al ${escapeHtml(item.endDate)}` : ""}` : "Acceso permanente";

    return `
      <article class="cart-item" data-key="${escapeHtml(item.key)}" data-game-id="${escapeHtml(String(item.appId || item.appId === 0 ? item.appId : ""))}">
        <div class="cart-item__media">
          ${buildImageHTML(item, "lazy")}
        </div>
        <div class="cart-item__body">
          <span class="cart-item__type">${escapeHtml(label)}</span>
          <h3 class="cart-item__title"><a href="#" class="cart-item__link">${escapeHtml(item.title || "Juego")}</a></h3>
          <p class="cart-item__details">${details}</p>
          <strong class="cart-item__price">${escapeHtml(formatPrice(item.total || 0))}</strong>
        </div>
        <button type="button" class="cart-item__remove" data-action="remove-cart-item">Quitar</button>
      </article>
    `;
}

function buildCartSummaryHTML(items = [], totals = {}) {
    const count = Array.isArray(items) ? items.length : 0;
    const total = Number(totals.total || 0);
    if (count === 0) {
        return `
        <div class="preview-panel">
          <div class="preview-hero preview-hero--compact">
            <div class="preview-hero__branding">
              <span class="preview-hero__logo" aria-hidden="true">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
                  <path d="M7 4h-2l-1 2H2v2h1l3.6 7.59-1.35 2.45A1 1 0 0 0 6 19h12v-2H7.42a.25.25 0 0 1-.23-.15L7.1 16h9.45a1 1 0 0 0 .96-.74l1.54-6.17A1 1 0 0 0 18.1 8H6.21l-.94-2z" fill="currentColor"/>
                  <circle cx="10" cy="21" r="1" fill="currentColor"/>
                  <circle cx="18" cy="21" r="1" fill="currentColor"/>
                </svg>
              </span>
              <h2 class="preview-hero__title">Carrito</h2>
            </div>
          </div>

          <div class="preview-grid">
            <div class="no-results cart-empty-message">
              <p class="cart-empty-message__text">Todavía no hay ningún juego en el carrito.</p>
            </div>
          </div>
        </div>
      `;
    }

    return `
    <div class="preview-panel">
      <div class="preview-hero preview-hero--compact">
        <div class="preview-hero__branding">
          <span class="preview-hero__logo" aria-hidden="true">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
              <path d="M7 4h-2l-1 2H2v2h1l3.6 7.59-1.35 2.45A1 1 0 0 0 6 19h12v-2H7.42a.25.25 0 0 1-.23-.15L7.1 16h9.45a1 1 0 0 0 .96-.74l1.54-6.17A1 1 0 0 0 18.1 8H6.21l-.94-2z" fill="currentColor"/>
              <circle cx="10" cy="21" r="1" fill="currentColor"/>
              <circle cx="18" cy="21" r="1" fill="currentColor"/>
            </svg>
          </span>
          <h2 class="preview-hero__title">Carrito</h2>
        </div>
      </div>

      <div class="preview-grid">
        <section class="preview-card preview-card--full">
          <h2 class="preview-card__title">Items en el carrito</h2>
          <div class="cart-list">
            ${items.map((item) => buildCartItemHTML(item)).join("")}
          </div>
        </section>

        <section class="preview-card preview-card--summary">

          <div class="preview-summary__stats">
            <span class="preview-summary__stat">
              <strong>${escapeHtml(String(count))}</strong>
              Items
            </span>
            <span class="preview-summary__stat">
              <strong>${escapeHtml(String(totals.purchases || 0))}</strong>
              Compras
            </span>
            <span class="preview-summary__stat">
              <strong>${escapeHtml(String(totals.rentals || 0))}</strong>
              Alquileres
            </span>
          </div>

          <div class="preview-summary__rows" aria-label="Detalle del resumen">
            <div class="preview-summary__row">
              <span class="preview-summary__label">Cantidad de ítems</span>
              <span class="preview-summary__value">${escapeHtml(String(count))}</span>
            </div>
            <div class="preview-summary__row">
              <span class="preview-summary__label">Compras</span>
              <span class="preview-summary__value">${escapeHtml(String(totals.purchases || 0))}</span>
            </div>
            <div class="preview-summary__row">
              <span class="preview-summary__label">Alquileres</span>
              <span class="preview-summary__value">${escapeHtml(String(totals.rentals || 0))}</span>
            </div>
          </div>

          <div class="preview-summary__total">
            <span class="preview-summary__total-label">Total a pagar</span>
            <span class="preview-summary__total-value">${escapeHtml(formatPrice(total))}</span>
          </div>

          <p class="preview-summary__note">Podés revisar los ítems del carrito antes de confirmar la operación.</p>
        </section>
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="cartCheckoutBtn">Confirmar carrito</button>
        <button type="button" class="btn-search-reset" id="cartClearBtn">Vaciar carrito</button>
      </div>

      <p class="transaction-summary__status" id="cartStatus" hidden></p>
    </div>
  `;
}

function buildCartConfirmationHTML(result) {
    const total = Number(result?.total ?? 0);
    const count = Number(result?.count ?? 0);
    const purchaseCount = Number(result?.purchases?.length ?? 0);
    const rentalCount = Number(result?.rentals?.length ?? 0);
    const purchases = Array.isArray(result?.purchases) ? result.purchases : [];
    const rentals = Array.isArray(result?.rentals) ? result.rentals : [];

    const buildPurchaseItemHTML = (item) => {
        const title = escapeHtml(item?.title || `Juego ${item?.game_id || ""}` || "Juego");
        const price = Number(item?.purchase_price ?? item?.total ?? 0);
        return `
          <li class="confirmation-list__item">
            <span class="confirmation-list__title">${title}</span>
            <span class="confirmation-list__meta">${escapeHtml(formatPrice(price))}</span>
          </li>
        `;
    };

    const buildRentalItemHTML = (item) => {
        const title = escapeHtml(item?.title || `Juego ${item?.game_id || ""}` || "Juego");
        const startDate = escapeHtml(String(item?.start_date || ""));
        const endDate = escapeHtml(String(item?.end_date || ""));
        const days = Number(item?.days || 0);
        const meta = [days > 0 ? `${days} día${days === 1 ? "" : "s"}` : "", startDate && endDate ? `${startDate} al ${endDate}` : ""].filter(Boolean).join(" · ");
        return `
          <li class="confirmation-list__item">
            <span class="confirmation-list__title">${title}</span>
            <span class="confirmation-list__meta">${escapeHtml(meta || "Alquiler confirmado")}</span>
          </li>
        `;
    };

    return `
    <div class="preview-panel confirmation-panel confirmation-panel--cart">
      <div class="confirmation-header">
        <span class="confirmation-header__badge">Compra confirmada</span>
        <h1 class="confirmation-header__title">Carrito procesado</h1>
        <p class="confirmation-header__text">Tu compra se registró correctamente. Acá tenés el detalle de lo que se agregó a tu cuenta.</p>
      </div>

      <div class="confirmation-summary">
        <div class="confirmation-summary__item">
          <span class="confirmation-summary__label">Items</span>
          <span class="confirmation-summary__value">${escapeHtml(String(count))}</span>
        </div>
        <div class="confirmation-summary__item">
          <span class="confirmation-summary__label">Compras</span>
          <span class="confirmation-summary__value">${escapeHtml(String(purchaseCount))}</span>
        </div>
        <div class="confirmation-summary__item">
          <span class="confirmation-summary__label">Alquileres</span>
          <span class="confirmation-summary__value">${escapeHtml(String(rentalCount))}</span>
        </div>
        <div class="confirmation-summary__item confirmation-summary__item--total">
          <span class="confirmation-summary__label">Total gastado</span>
          <span class="confirmation-summary__value">${escapeHtml(formatPrice(total))}</span>
        </div>
      </div>

      <div class="confirmation-lists">
        ${
            purchases.length > 0
                ? `
          <section class="confirmation-section">
            <h2 class="confirmation-section__title">Comprados</h2>
            <ul class="confirmation-list">
              ${purchases.map(buildPurchaseItemHTML).join("")}
            </ul>
          </section>
        `
                : ""
        }

        ${
            rentals.length > 0
                ? `
          <section class="confirmation-section">
            <h2 class="confirmation-section__title">Alquilados</h2>
            <ul class="confirmation-list">
              ${rentals.map(buildRentalItemHTML).join("")}
            </ul>
          </section>
        `
                : ""
        }
      </div>

      <div class="search-form__actions transaction-summary__actions">
        <button type="button" class="btn-search-submit" id="cartHomeBtn">Volver al catálogo</button>
      </div>
    </div>
  `;
}
