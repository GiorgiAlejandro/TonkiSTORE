// recommendations.js
// Builds a recommendation strip from favorites, library history, and popular games.

const Recommendations = (() => {
    const MAX_RECOMMENDATIONS = 6;
    const POPULAR_FETCH_LIMIT = MAX_RECOMMENDATIONS * 4;
    const API_BASE_URL = `http://${window.location.hostname || "127.0.0.1"}:5000/api`;

    let _section = null;
    let _grid = null;
    let _empty = null;
    let _pagination = null;
    let _searchQuery = "";
    let _renderToken = 0;
    let _currentCandidates = [];
    let _currentPage = 1;

    function _normalizeText(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }

    function _tokenizeText(value) {
        return _normalizeText(value)
            .replace(/[^a-z0-9áéíóúñü]+/gi, " ")
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 1);
    }

    function _getCatalogProducts() {
        return window.getCatalogProducts?.() || products || [];
    }

    function _getCatalogById(catalog) {
        return catalog.reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
        }, {});
    }

    function _getFavoriteProducts(catalog) {
        const ids = window.Favorites?.getIds?.() || [];
        const byId = _getCatalogById(catalog);
        return ids.map((id) => byId[id]).filter(Boolean);
    }

    function _getLibraryItems() {
        const headers = window.Auth?.getAuthHeaders?.() || {};

        return fetch(`${API_BASE_URL}/library`, { headers })
            .then(async (response) => {
                const text = await response.text();
                let data = {};
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch {
                        data = {};
                    }
                }

                if (!response.ok) {
                    return { purchases: [], rentals: [] };
                }

                return data;
            })
            .catch(() => ({ purchases: [], rentals: [] }));
    }

    function _mapRawGameToProduct(game) {
        const price = Number(game?.price_usd ?? game?.price ?? 0) || 0;
        const discount = Number(game?.discount_pct ?? 0);
        const rawGenre = game?.genre;
        const genre = rawGenre && typeof rawGenre === "object" ? rawGenre.name || "" : game?.genre || "";
        return {
            id: Number(game?.app_id ?? game?.id ?? 0),
            title: game?.name || game?.title || "Juego",
            publisher: game?.publisher || game?.developer || "Editorial no disponible",
            tags: Array.isArray(game?.tags) ? game.tags.filter(Boolean) : [],
            price,
            originalPrice: discount > 0 && discount < 100 ? Math.round((price / (1 - discount / 100)) * 100) / 100 : null,
            discount: discount || null,
            releaseDate: game?.release_date || "Fecha no disponible",
            description: typeof game?.description === "string" && game.description.trim() ? game.description.trim() : `Juego del genero ${genre || "general"} disponible en catalogo.`,
            image: game?.image_url || game?.image || window.getFallbackImage?.() || "",
            features: Array.isArray(game?.features) ? game.features : [],
        };
    }

    function _collectTokens(product) {
        const tokens = new Set();

        _tokenizeText(product?.title).forEach((token) => tokens.add(token));

        (product?.tags || []).forEach((tag) => {
            _tokenizeText(tag).forEach((token) => tokens.add(token));
        });

        (product?.features || []).forEach((feature) => {
            _tokenizeText(feature?.name).forEach((token) => tokens.add(token));
        });

        return tokens;
    }

    function _buildTasteProfile(productsList) {
        const profile = {
            tokenCounts: new Map(),
            titles: [],
        };

        productsList.forEach((product) => {
            const titleTokens = _tokenizeText(product?.title);
            if (titleTokens.length > 0) {
                profile.titles.push({ title: product.title, tokens: new Set(titleTokens) });
            }

            _collectTokens(product).forEach((token) => {
                profile.tokenCounts.set(token, (profile.tokenCounts.get(token) || 0) + 1);
            });
        });

        return profile;
    }

    function _findBestTitleMatch(product, profile) {
        const productTokens = new Set(_tokenizeText(product?.title));
        let bestMatch = { title: "", overlap: 0 };

        profile.titles.forEach((candidate) => {
            let overlap = 0;
            candidate.tokens.forEach((token) => {
                if (productTokens.has(token)) {
                    overlap += 1;
                }
            });

            if (overlap > bestMatch.overlap) {
                bestMatch = { title: candidate.title, overlap };
            }
        });

        return bestMatch;
    }

    function _pickReason(product, matchedTitle, matchedTags, matchedFeatures, fallbackLabel) {
        if (matchedTitle?.overlap >= 2 && matchedTitle.title) {
            return `Similar a ${matchedTitle.title}`;
        }

        const reasons = [...new Set([...matchedTags, ...matchedFeatures])].slice(0, 2);
        if (reasons.length > 0) {
            return `Coincide en ${reasons.join(" y ")}`;
        }

        return fallbackLabel || "Similar a tu biblioteca";
    }

    function _scoreProduct(product, profile, ownedIds, fallbackLabel = "Similar a tu biblioteca") {
        if (ownedIds.has(product.id)) return null;

        const titleTokens = _tokenizeText(product?.title);
        let score = 0;
        const matchedTags = [];
        const matchedFeatures = [];

        titleTokens.forEach((token) => {
            const count = profile.tokenCounts.get(token);
            if (count) {
                score += 6 * count;
            }
        });

        (product.tags || []).forEach((tag) => {
            const tokens = _tokenizeText(tag);
            if (tokens.some((token) => profile.tokenCounts.has(token))) {
                score += 4;
                matchedTags.push(tag);
            }
        });

        (product.features || []).forEach((feature) => {
            const tokens = _tokenizeText(feature?.name);
            if (tokens.some((token) => profile.tokenCounts.has(token))) {
                score += 3;
                matchedFeatures.push(feature.name);
            }
        });

        const matchedTitle = _findBestTitleMatch(product, profile);
        if (matchedTitle.overlap >= 2) {
            score += 8 + matchedTitle.overlap * 2;
        }

        if (score <= 0) return null;

        return {
            product,
            score,
            reason: _pickReason(product, matchedTitle, matchedTags, matchedFeatures, fallbackLabel),
            matchCount: matchedTags.length + matchedFeatures.length + matchedTitle.overlap,
        };
    }

    function _buildCardHTML(product, reason) {
        return `
        <article class="recommendation-card" data-id="${product.id}">
            <div class="recommendation-card__media">
                ${buildImageHTML(product)}
            </div>
            <div class="recommendation-card__body">
                <p class="recommendation-card__reason">${escapeHtml(reason)}</p>
                <h3 class="recommendation-card__title">${escapeHtml(product.title)}</h3>
                <div class="recommendation-card__tags">${buildTagsHTML((product.tags || []).slice(0, 3))}</div>
                <div class="recommendation-card__footer">
                    <span class="recommendation-card__price">${escapeHtml(formatPrice(product.price))}</span>
                </div>
            </div>
        </article>
    `;
    }

    function _renderPagination(totalPages) {
        if (!_pagination) return;

        _pagination.innerHTML = "";
        if (totalPages <= 1) return;

        const visiblePageCount = 5;
        const pageWindowCount = Math.min(visiblePageCount, totalPages);

        let startPage = Math.max(1, _currentPage - Math.floor(pageWindowCount / 2));
        let endPage = startPage + pageWindowCount - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - pageWindowCount + 1);
        }

        const makeBtn = (label, page, disabled, active) => {
            const button = document.createElement("button");
            button.className = "pagination__btn" + (active ? " pagination__btn--active" : "");
            button.textContent = label;
            button.disabled = disabled;

            if (!disabled) {
                button.addEventListener("click", () => {
                    _currentPage = page;
                    _renderPage();
                    _grid.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }

            return button;
        };

        _pagination.appendChild(makeBtn("Inicio", 1, _currentPage === 1, false));
        _pagination.appendChild(makeBtn("Anterior", _currentPage - 1, _currentPage === 1, false));

        for (let page = startPage; page <= endPage; page += 1) {
            _pagination.appendChild(makeBtn(String(page), page, false, page === _currentPage));
        }

        _pagination.appendChild(makeBtn("Siguiente", _currentPage + 1, _currentPage === totalPages, false));
    }

    function _renderPage() {
        const totalPages = Math.ceil(_currentCandidates.length / MAX_RECOMMENDATIONS);
        const start = (_currentPage - 1) * MAX_RECOMMENDATIONS;
        const pageItems = _currentCandidates.slice(start, start + MAX_RECOMMENDATIONS);

        if (pageItems.length === 0) {
            _grid.innerHTML = "";
            _empty.hidden = false;
            _renderPagination(0);
            return;
        }

        _grid.innerHTML = pageItems.map(({ product, reason }) => _buildCardHTML(product, reason)).join("");
        _empty.hidden = true;
        _section.hidden = false;
        _renderPagination(totalPages);

        _grid.querySelectorAll(".recommendation-card").forEach((card) => {
            const productId = Number(card.dataset.id);

            card.addEventListener("click", () => {
                if (Number.isInteger(productId)) {
                    Router.navigateTo(productId);
                }
            });
        });
    }

    async function _fetchPopularProducts(limit = MAX_RECOMMENDATIONS) {
        try {
            const response = await fetch(`${API_BASE_URL}/games/popular?limit=${encodeURIComponent(String(limit))}`);
            const text = await response.text();
            let data = [];

            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = [];
                }
            }

            if (!response.ok || !Array.isArray(data)) return [];
            return data.map(_mapRawGameToProduct).filter((product) => Number.isInteger(product.id) && product.id > 0);
        } catch {
            return [];
        }
    }

    async function _buildOwnedContext() {
        const catalog = _getCatalogProducts();
        const favoriteProducts = _getFavoriteProducts(catalog);

        let libraryProducts = [];
        if (window.Auth?.isAuthenticated?.()) {
            const libraryData = await _getLibraryItems();
            const byId = _getCatalogById(catalog);
            const ids = new Set();

            [...(Array.isArray(libraryData.purchases) ? libraryData.purchases : []), ...(Array.isArray(libraryData.rentals) ? libraryData.rentals : [])].forEach((item) => {
                const id = Number(item?.game_id || item?.app_id || item?.id);
                if (Number.isInteger(id) && id > 0) ids.add(id);
            });

            libraryProducts = [...ids].map((id) => byId[id]).filter(Boolean);
        }

        const ownedProducts = [...new Map([...favoriteProducts, ...libraryProducts].map((product) => [product.id, product])).values()];
        const ownedIds = new Set(ownedProducts.map((product) => product.id));

        return {
            catalog,
            favoriteProducts,
            libraryProducts,
            ownedProducts,
            ownedIds,
            profile: _buildTasteProfile(ownedProducts),
        };
    }

    async function _render() {
        const token = ++_renderToken;
        if (!_section || !_grid || !_empty || !_pagination) return;

        if (String(_searchQuery || "").trim()) {
            _section.hidden = true;
            _pagination.innerHTML = "";
            return;
        }

        const { catalog, favoriteProducts, libraryProducts, ownedProducts, ownedIds, profile } = await _buildOwnedContext();
        if (token !== _renderToken) return;

        let candidates = [];
        let fallbackLabel = "Popular entre los jugadores";

        if (ownedProducts.length > 0) {
            candidates = catalog
                .map((product) => _scoreProduct(product, profile, ownedIds, "Similar a tu biblioteca"))
                .filter(Boolean)
                .sort((left, right) => right.score - left.score || left.product.title.localeCompare(right.product.title));
        } else {
            fallbackLabel = "Popular en la plataforma";
            const popularProducts = await _fetchPopularProducts(POPULAR_FETCH_LIMIT);
            if (token !== _renderToken) return;

            candidates = popularProducts.filter((product) => !ownedIds.has(product.id)).map((product) => ({ product, score: 0, reason: fallbackLabel, matchCount: 0 }));
        }

        _currentCandidates = candidates;
        _currentPage = 1;

        if (candidates.length === 0) {
            _section.hidden = false;
            _grid.innerHTML = "";
            _empty.hidden = false;
            _empty.textContent = ownedProducts.length > 0 ? "Todavía no hay coincidencias claras entre tus juegos y el catálogo." : "No hay suficiente historial para recomendarte aún. Un buen factor futuro sería la popularidad global de compras y reservas.";
            _renderPagination(0);
            return;
        }

        _renderPage();
    }

    function init() {
        _section = document.getElementById("recommendationsSection");
        _grid = document.getElementById("recommendationsGrid");
        _empty = document.getElementById("recommendationsEmpty");
        _pagination = document.getElementById("recommendationsPagination");

        if (!_section || !_grid || !_empty || !_pagination) return;

        window.addEventListener("products:updated", _render);
        window.addEventListener("favorites:changed", _render);
        window.addEventListener("auth:changed", _render);

        _render();
    }

    function setSearchQuery(query) {
        _searchQuery = String(query || "");
        _render();
    }

    return { init, setSearchQuery };
})();

window.Recommendations = Recommendations;
