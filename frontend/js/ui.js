// ui.js
// Handles all direct DOM manipulation: rendering the product grid,
// updating the product count, pagination, and wiring up the search input.
// Depends on: data.js (fetchGames, searchGames), render.js (buildCardHTML, buildNoResultsHTML),
//             router.js (Router.navigateTo)

const UI = (() => {
    const PAGE_SIZE = 10; // sprint requirement: max 10 products per page
    const SEARCH_DEBOUNCE_MS = 250;

    // ── Private state ─────────────────────────────────────────────────────────
    let _grid = null;
    let _countEl = null;
    let _searchInput = null;
    let _pagination = null;

    let _currentList = []; // the active filtered list
    let _currentPage = 1;
    let _searchToken = 0;
    let _searchDebounceTimer = null;

    // ── Private helpers ──────────────────────────────────────────────────────

    function _updateCount(n) {
        _countEl.textContent = n > 0 ? `${n} juego${n !== 1 ? "s" : ""}` : "";
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

    /**
     * Fisher-Yates shuffle — returns a new shuffled array, doesn't mutate the original.
     * Used for the random initial render (sprint requirement).
     */
    function _shuffle(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
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

        card.addEventListener("click", () => Router.navigateTo(product.id));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter") Router.navigateTo(product.id);
        });

        return card;
    }

    /**
     * Renders the current page slice into the grid.
     * Always uses 2 columns (sprint requirement).
     */
    function _renderPage() {
        _grid.innerHTML = "";

        const totalPages = Math.ceil(_currentList.length / PAGE_SIZE);
        const start = (_currentPage - 1) * PAGE_SIZE;
        const pageItems = _currentList.slice(start, start + PAGE_SIZE);

        if (pageItems.length === 0) {
            _grid.innerHTML = buildNoResultsHTML();
            _pagination.innerHTML = "";
            _updateCount(0);
            return;
        }

        const fragment = document.createDocumentFragment();
        pageItems.forEach((product, i) => fragment.appendChild(_createCard(product, i)));
        _grid.appendChild(fragment);

        _updateCount(_currentList.length);
        _renderPagination(totalPages);
    }

    /**
     * Renders pagination controls: inicio | ← anterior | pages | siguiente →
     * Only shown when there is more than one page.
     */
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

        // helper to create a pagination button
        function _makeBtn(label, page, disabled, active) {
            const btn = document.createElement("button");
            btn.className = "pagination__btn" + (active ? " pagination__btn--active" : "");
            btn.textContent = label;
            btn.disabled = disabled;
            if (!disabled) {
                btn.addEventListener("click", () => {
                    _currentPage = page;
                    _renderPage();
                    // scroll back to top of grid
                    _grid.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }
            return btn;
        }

        // inicio button
        _pagination.appendChild(_makeBtn("« Inicio", 1, _currentPage === 1, false));
        // anterior button
        _pagination.appendChild(_makeBtn("‹ Anterior", _currentPage - 1, _currentPage === 1, false));

        // page number buttons
        for (let p = startPage; p <= endPage; p++) {
            _pagination.appendChild(_makeBtn(String(p), p, false, p === _currentPage));
        }

        // siguiente button
        _pagination.appendChild(_makeBtn("Siguiente ›", _currentPage + 1, _currentPage === totalPages, false));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Sets the active product list and resets to page 1.
     * Pass shuffle=true for the initial random render.
     */
    function renderGrid(list, shuffle = false) {
        _currentList = shuffle ? _shuffle(list) : list;
        _currentPage = 1;
        _renderPage();
    }

    function init() {
        _grid = document.getElementById("productGrid");
        _countEl = document.getElementById("productCount");
        _searchInput = document.getElementById("searchInput");
        _pagination = document.getElementById("pagination");

        _searchInput.addEventListener("input", function () {
            const value = this.value;

            if (_searchDebounceTimer) {
                clearTimeout(_searchDebounceTimer);
            }

            _searchDebounceTimer = setTimeout(async () => {
                const token = ++_searchToken;

                try {
                    const filtered = await searchGames(value);
                    if (token !== _searchToken) return;
                    renderGrid(filtered, false);
                } catch (error) {
                    if (token !== _searchToken) return;
                    _showGridError("No se pudo cargar la busqueda desde el servidor.");
                }
            }, SEARCH_DEBOUNCE_MS);
        });
    }

    async function loadInitialProducts() {
        try {
            const list = await fetchGames();
            renderGrid(list, true);
        } catch (error) {
            _showGridError("No se pudo cargar el catalogo desde el backend.");
        }
    }

    return { init, renderGrid, loadInitialProducts };
})();
