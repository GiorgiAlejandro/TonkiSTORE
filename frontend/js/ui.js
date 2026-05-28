// ui.js
// Handles direct DOM manipulation for the product grid and search.

const UI = (() => {
    const PAGE_SIZE = 10;
    const SEARCH_DEBOUNCE_MS = 250;

    let _grid = null;
    let _countEl = null;
    let _searchInput = null;
    let _pagination = null;
    let _favoritesBtn = null;
    let _sectionTitle = null;

    let _sourceList = [];
    let _currentList = [];
    let _currentPage = 1;
    let _searchToken = 0;
    let _searchDebounceTimer = null;
    let _favoritesOnly = false;
    let _hasLoadedProducts = false;

    function _updateCount(count) {
        _countEl.textContent = count > 0 ? `${count} juego${count !== 1 ? "s" : ""}` : "";
    }

    function _showGridError(message) {
        _grid.innerHTML = `
            <div class="no-results">
                <p>${message}</p>
            </div>
        `;
        _pagination.innerHTML = "";
        _updateCount(0);
    }

    function _shuffle(list) {
        const copy = [...list];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
        }
        return copy;
    }

    async function _searchCurrentView(query, force = false) {
        const normalizedQuery = String(query || "");
        const currentView = window.Router?.getCurrentView?.() || "home";
        const hasQuery = Boolean(normalizedQuery.trim());

        if (currentView === "home" || currentView === "detail" || currentView === "cart" || currentView === "preview") {
            window.Recommendations?.setSearchQuery?.(normalizedQuery);
        }

        if (currentView === "favorites") {
            window.FavoritesView?.search?.(normalizedQuery);
            return;
        }

        if (currentView === "library") {
            window.LibraryView?.search?.(normalizedQuery);
            return;
        }

        if (!force && !hasQuery) {
            return;
        }

        try {
            const filtered = await searchGames(normalizedQuery);
            renderGrid(filtered, false);
        } catch {
            _showGridError("No se pudo cargar la busqueda desde el servidor.");
        }
    }

    function _canUseFavorites() {
        return Boolean(window.Favorites?.canUseFavorites?.());
    }

    function _favoriteCount() {
        return window.Favorites?.getCount?.() || 0;
    }

    function _applyFavoritesFilter(list) {
        if (!_favoritesOnly || !_canUseFavorites()) {
            return [...list];
        }

        return list.filter((product) => Boolean(window.Favorites?.isFavorite?.(product.id)));
    }

    function _currentEmptyMessage() {
        if (_favoritesOnly) {
            return _searchInput?.value?.trim() ? "No tienes favoritos que coincidan con esa busqueda." : "Todavia no agregaste juegos a tus favoritos.";
        }

        return "No se encontraron juegos con ese criterio.";
    }

    function _syncHeading() {
        if (_sectionTitle) {
            _sectionTitle.textContent = _favoritesOnly ? "Mis favoritos" : "Catalogo";
        }
    }

    function _syncFavoritesButton() {
        if (!_favoritesBtn) return;

        const enabled = _canUseFavorites();
        const count = _favoriteCount();

        _favoritesBtn.hidden = !enabled;
        if (!enabled) {
            _favoritesOnly = false;
            _favoritesBtn.classList.remove("btn-filter--active");
            _favoritesBtn.setAttribute("aria-pressed", "false");
            _favoritesBtn.title = "";
            _syncHeading();
            return;
        }

        _favoritesBtn.classList.toggle("btn-filter--active", _favoritesOnly);
        _favoritesBtn.setAttribute("aria-pressed", _favoritesOnly ? "true" : "false");
        _favoritesBtn.title = _favoritesOnly ? "Mostrar todo el catalogo" : "Favoritos";
        _syncHeading();
    }

    function _refreshRenderedList() {
        if (!_canUseFavorites()) {
            _favoritesOnly = false;
        }

        _currentList = _applyFavoritesFilter(_sourceList);
        const totalPages = Math.ceil(_currentList.length / PAGE_SIZE);

        if (_currentPage > totalPages) {
            _currentPage = totalPages || 1;
        }

        _syncFavoritesButton();
        _renderPage();
    }

    function _setList(list, shuffle = false) {
        let processed = shuffle ? _shuffle(list) : [...list];
        const query = String(_searchInput?.value || "").trim();
        // If there's no manual search query, hide games already owned by the user
        if (!query) {
            try {
                processed = processed.filter((product) => !Boolean(window.LibraryView?.isOwned?.(product?.id)));
            } catch (err) {
                // ignore; if check fails, keep full list
            }
        }
        _sourceList = processed;
        _currentPage = 1;
        _refreshRenderedList();
    }

    function _createCard(product, index) {
        const card = document.createElement("article");
        card.className = "product-card";
        card.setAttribute("data-id", product.id);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", product.title);
        card.style.animationDelay = `${0.05 + index * 0.05}s`;
        card.innerHTML = buildCardHTML(product);

        const openDetail = () => Router.navigateTo(product.id);
        const favoriteBtn = card.querySelector("[data-action='toggle-favorite']");

        favoriteBtn?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.Favorites?.toggleFavorite?.(product.id);
        });

        favoriteBtn?.addEventListener("keydown", (event) => {
            event.stopPropagation();
        });

        card.addEventListener("click", openDetail);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
            }
        });

        return card;
    }

    function _renderPage() {
        _grid.innerHTML = "";

        const totalPages = Math.ceil(_currentList.length / PAGE_SIZE);
        const start = (_currentPage - 1) * PAGE_SIZE;
        const pageItems = _currentList.slice(start, start + PAGE_SIZE);

        if (pageItems.length === 0) {
            if (!_hasLoadedProducts) {
                _grid.innerHTML = "";
                _pagination.innerHTML = "";
                _updateCount(0);
                return;
            }

            _grid.innerHTML = buildNoResultsHTML(_currentEmptyMessage());
            _pagination.innerHTML = "";
            _updateCount(0);
            return;
        }

        const fragment = document.createDocumentFragment();
        pageItems.forEach((product, index) => fragment.appendChild(_createCard(product, index)));
        _grid.appendChild(fragment);

        _updateCount(_currentList.length);
        _renderPagination(totalPages);
    }

    function _renderPagination(totalPages) {
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

        function _makeBtn(label, page, disabled, active) {
            const btn = document.createElement("button");
            btn.className = "pagination__btn" + (active ? " pagination__btn--active" : "");
            btn.textContent = label;
            btn.disabled = disabled;

            if (!disabled) {
                btn.addEventListener("click", () => {
                    _currentPage = page;
                    _renderPage();
                    _grid.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }

            return btn;
        }

        _pagination.appendChild(_makeBtn("Inicio", 1, _currentPage === 1, false));
        _pagination.appendChild(_makeBtn("Anterior", _currentPage - 1, _currentPage === 1, false));

        for (let page = startPage; page <= endPage; page += 1) {
            _pagination.appendChild(_makeBtn(String(page), page, false, page === _currentPage));
        }

        _pagination.appendChild(_makeBtn("Siguiente", _currentPage + 1, _currentPage === totalPages, false));
    }

    function renderGrid(list, shuffle = false) {
        _setList(list, shuffle);
    }

    function init() {
        _grid = document.getElementById("productGrid");
        _countEl = document.getElementById("productCount");
        _searchInput = document.getElementById("searchInput");
        _pagination = document.getElementById("pagination");
        _favoritesBtn = document.getElementById("favoritesBtn");
        _sectionTitle = document.getElementById("catalogTitle");

        if (!_grid || !_countEl || !_searchInput || !_pagination) return;

        _searchInput.addEventListener("input", function () {
            const value = this.value;

            if (_searchDebounceTimer) {
                clearTimeout(_searchDebounceTimer);
            }

            _searchDebounceTimer = setTimeout(async () => {
                const token = ++_searchToken;

                try {
                    await _searchCurrentView(value, true);
                    if (token !== _searchToken) return;
                } catch {
                    if (token !== _searchToken) return;
                    _showGridError("No se pudo cargar la busqueda desde el servidor.");
                }
            }, SEARCH_DEBOUNCE_MS);
        });

        _favoritesBtn?.addEventListener("click", () => {
            if (!_canUseFavorites()) return;

            // If favorites view is already visible, close it (toggle behavior)
            const favView = document.getElementById("favoritesView");
            const favVisible = favView && window.getComputedStyle(favView).display !== "none";
            if (favVisible) {
                window.Router?.closeFavoritesView?.();
            } else {
                window.Router?.openFavoritesView?.();
            }
        });

        window.addEventListener("auth:changed", () => {
            _refreshRenderedList();
        });

        window.addEventListener("favorites:changed", () => {
            _refreshRenderedList();
        });

        _syncFavoritesButton();
    }

    function refreshSearch(query = _searchInput?.value || "") {
        return _searchCurrentView(query, false);
    }

    async function loadInitialProducts() {
        try {
            const list = await fetchGames();
            _hasLoadedProducts = true;
            renderGrid(list, true);
        } catch {
            _hasLoadedProducts = true;
            _showGridError("No se pudo cargar el catalogo desde el backend.");
        }
    }

    return { init, renderGrid, loadInitialProducts, refreshSearch };
})();

window.UI = UI;
