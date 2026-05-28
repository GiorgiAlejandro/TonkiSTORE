// library-view.js
// Renders the authenticated user's library (purchases + active rentals).

const LibraryView = (() => {
    const API_BASE_URL = `http://${window.location.hostname || "127.0.0.1"}:5000/api`;

    let _statusEl = null;
    let _purchasesGrid = null;
    let _rentalsGrid = null;
    let _purchasesCount = null;
    let _rentalsCount = null;
    let _purchasesEmpty = null;
    let _rentalsEmpty = null;
    let _ownedGameIds = new Set();
    let _lastPurchases = [];
    let _lastRentals = [];
    let _currentQuery = "";

    function _toOwnedIdSet(data) {
        const ids = new Set();
        const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
        const rentals = Array.isArray(data?.rentals) ? data.rentals : [];

        purchases.forEach((item) => {
            const id = Number(item?.game_id || item?.app_id || item?.id);
            if (Number.isInteger(id) && id > 0) ids.add(id);
        });

        rentals.forEach((item) => {
            const id = Number(item?.game_id || item?.app_id || item?.id);
            if (Number.isInteger(id) && id > 0) ids.add(id);
        });

        return ids;
    }

    function _escape(value) {
        if (typeof window.escapeHtml === "function") {
            return window.escapeHtml(value);
        }
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function _formatDate(value) {
        const text = String(value || "").trim();
        if (!text) return "-";
        const parsed = new Date(text.length > 10 ? text : `${text}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return text;
        return new Intl.DateTimeFormat("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(parsed);
    }

    function _parseDateOnly(value) {
        const text = String(value || "").trim();
        if (!text) return null;
        const parsed = new Date(text.length > 10 ? text : `${text}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function _getRentalRemainingLabel(endDate) {
        const end = _parseDateOnly(endDate);
        if (!end) return "";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDay = new Date(end);
        endDay.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((endDay.getTime() - today.getTime()) / 86400000);
        if (diffDays < 0) return "";
        if (diffDays === 0) return "Vence hoy";
        if (diffDays === 1) return "Queda 1 día";
        return `Quedan ${diffDays} días`;
    }

    function _isActiveRental(item) {
        if (!item || item.type !== "rental") return true;
        const end = _parseDateOnly(item.end_date || item.endDate);
        if (!end) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return end.getTime() >= today.getTime();
    }

    function _showStatus(message, kind) {
        if (!_statusEl) return;
        _statusEl.hidden = !message;
        _statusEl.textContent = message || "";
        _statusEl.classList.remove("library-status--error", "library-status--success");
        if (kind) {
            _statusEl.classList.add(`library-status--${kind}`);
        }
    }

    function _getCatalogProduct(gameId) {
        const normalizedId = Number(gameId);
        if (!Number.isInteger(normalizedId) || normalizedId <= 0) return null;

        const catalog = Array.isArray(window.getCatalogProducts?.()) ? window.getCatalogProducts() : [];
        return catalog.find((product) => Number(product?.id) === normalizedId) || null;
    }

    function _matchesQuery(item, type, query) {
        const normalized = String(query || "")
            .trim()
            .toLowerCase();
        if (!normalized) return true;

        const gameId = Number(item?.game_id || 0);
        const baseProduct = _getCatalogProduct(gameId) || {};
        const tags = Array.isArray(baseProduct.tags) ? baseProduct.tags : [];
        const haystack = [item?.title, baseProduct.title, item?.start_date, item?.end_date, item?.purchase_date, baseProduct.releaseDate, type === "rental" ? "alquiler" : "compra", ...tags].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(normalized);
    }

    function _buildLibraryItemHTML(item, type) {
        const gameId = Number(item?.game_id || 0);
        const baseProduct = _getCatalogProduct(gameId) || {};
        const product = {
            ...baseProduct,
            id: gameId,
            title: item?.title || baseProduct.title || "Juego",
            price: typeof item?.price === "number" ? item.price : baseProduct.price,
            image: item?.image || baseProduct.image,
            type,
        };

        if (type === "rental") {
            product.rentalEndsAt = item?.end_date || item?.endDate || "";
            product.rentalRemainingLabel = _getRentalRemainingLabel(product.rentalEndsAt);
        }

        return `
            <article class="product-card" data-game-id="${gameId}" role="button" tabindex="0" aria-label="${_escape(product.title)}">
                ${window.buildCardHTML ? window.buildCardHTML(product) : ""}
            </article>
        `;
    }

    function _bindItemClicks(scope) {
        scope.querySelectorAll(".product-card[data-game-id]").forEach((card) => {
            const favoriteBtn = card.querySelector("[data-action='toggle-favorite']");

            favoriteBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.Favorites?.toggleFavorite?.(Number(card.getAttribute("data-game-id") || 0));
            });

            favoriteBtn?.addEventListener("keydown", (event) => {
                event.stopPropagation();
            });

            card.addEventListener("click", () => {
                const gameId = Number(card.getAttribute("data-game-id") || 0);
                if (Number.isInteger(gameId) && gameId > 0) {
                    window.Router?.navigateTo?.(gameId);
                }
            });

            card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    const gameId = Number(card.getAttribute("data-game-id") || 0);
                    if (Number.isInteger(gameId) && gameId > 0) {
                        window.Router?.navigateTo?.(gameId);
                    }
                }
            });
        });
    }

    function _renderList(items, type, gridEl, emptyEl, countEl) {
        const list = Array.isArray(items) ? items.filter((item) => (type === "rental" ? _isActiveRental(item) : true)).filter((item) => _matchesQuery(item, type, _currentQuery)) : [];
        if (countEl) {
            countEl.textContent = `${list.length} juego${list.length !== 1 ? "s" : ""}`;
        }

        if (!gridEl || !emptyEl) return;

        if (list.length === 0) {
            gridEl.innerHTML = "";
            emptyEl.hidden = false;
            return;
        }

        emptyEl.hidden = true;
        gridEl.innerHTML = list.map((item) => _buildLibraryItemHTML(item, type)).join("");
        _bindItemClicks(gridEl);
    }

    function _refreshRenderedLibrary() {
        if (!_purchasesGrid || !_rentalsGrid) return;
        _renderList(_lastPurchases, "purchase", _purchasesGrid, _purchasesEmpty, _purchasesCount);
        _renderList(_lastRentals, "rental", _rentalsGrid, _rentalsEmpty, _rentalsCount);
    }

    function search(query) {
        _currentQuery = String(query || "").trim();
        _refreshRenderedLibrary();
    }

    async function _fetchLibrary() {
        const response = await fetch(`${API_BASE_URL}/library`, {
            headers: window.Auth?.getAuthHeaders?.() || {},
        });

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
            throw new Error(data.error || data.message || text || `HTTP ${response.status}`);
        }

        return data;
    }

    async function open() {
        if (!window.Auth?.isAuthenticated?.()) {
            _showStatus("Iniciá sesión para ver tu biblioteca.", "error");
            return;
        }

        _showStatus("Cargando biblioteca...", null);

        try {
            const data = await _fetchLibrary();
            _ownedGameIds = _toOwnedIdSet(data);
            _lastPurchases = Array.isArray(data.purchases) ? data.purchases : [];
            _lastRentals = Array.isArray(data.rentals) ? data.rentals : [];
            _refreshRenderedLibrary();
            _showStatus("", null);
        } catch (error) {
            _ownedGameIds = new Set();
            _lastPurchases = [];
            _lastRentals = [];
            _renderList([], "purchase", _purchasesGrid, _purchasesEmpty, _purchasesCount);
            _renderList([], "rental", _rentalsGrid, _rentalsEmpty, _rentalsCount);
            _showStatus(error.message || "No se pudo cargar la biblioteca.", "error");
        }
    }

    function init() {
        _statusEl = document.getElementById("libraryStatus");
        _purchasesGrid = document.getElementById("libraryPurchasesGrid");
        _rentalsGrid = document.getElementById("libraryRentalsGrid");
        _purchasesCount = document.getElementById("libraryPurchasesCount");
        _rentalsCount = document.getElementById("libraryRentalsCount");
        _purchasesEmpty = document.getElementById("libraryPurchasesEmpty");
        _rentalsEmpty = document.getElementById("libraryRentalsEmpty");

        window.addEventListener("favorites:changed", () => {
            _refreshRenderedLibrary();
        });
    }

    function getOwnedGameIds() {
        return new Set(_ownedGameIds);
    }

    function isOwned(gameId) {
        const normalizedId = Number(gameId);
        return Number.isInteger(normalizedId) && _ownedGameIds.has(normalizedId);
    }

    return {
        init,
        open,
        search,
        getOwnedGameIds,
        isOwned,
    };
})();

window.LibraryView = LibraryView;
