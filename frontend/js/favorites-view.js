// favorites-view.js
// Renders the authenticated user's favorites in a dedicated view and keeps it in sync in real-time.

const FavoritesView = (() => {
    const PAGE_SIZE = 10;

    let _grid = null;
    let _pagination = null;
    let _noResults = null;
    let _currentPage = 1;

    function _getFavoriteProducts() {
        const ids = window.Favorites?.getIds?.() || [];
        const byId = (products || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});
        return ids.map((id) => byId[id]).filter(Boolean);
    }

    function _render() {
        if (!_grid || !_pagination || !_noResults) return;

        const list = _getFavoriteProducts();
        if (list.length === 0) {
            _grid.innerHTML = "";
            _pagination.innerHTML = "";
            _noResults.hidden = false;
            return;
        }

        _noResults.hidden = true;

        const totalPages = Math.ceil(list.length / PAGE_SIZE);
        if (_currentPage > totalPages) _currentPage = totalPages || 1;

        const start = (_currentPage - 1) * PAGE_SIZE;
        const pageItems = list.slice(start, start + PAGE_SIZE);

        const fragment = document.createDocumentFragment();
        pageItems.forEach((product, index) => {
            const card = document.createElement("article");
            card.className = "product-card";
            card.setAttribute("data-id", product.id);
            card.innerHTML = buildCardHTML(product);

            const favoriteBtn = card.querySelector("[data-action='toggle-favorite']");
            favoriteBtn?.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.Favorites?.toggleFavorite?.(product.id);
            });

            card.addEventListener("click", () => Router.navigateTo(product.id));
            fragment.appendChild(card);
        });

        _grid.innerHTML = "";
        _grid.appendChild(fragment);

        // Render pagination
        _pagination.innerHTML = "";
        if (totalPages > 1) {
            for (let p = 1; p <= totalPages; p++) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "pagination__btn" + (p === _currentPage ? " pagination__btn--active" : "");
                btn.textContent = String(p);
                if (p !== _currentPage)
                    btn.addEventListener("click", () => {
                        _currentPage = p;
                        _render();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    });
                _pagination.appendChild(btn);
            }
        }
    }

    function init() {
        _grid = document.getElementById("favoritesGrid");
        _pagination = document.getElementById("favoritesPagination");
        _noResults = document.getElementById("favoritesNoResults");

        if (!_grid) return;

        // Re-render when favorites or auth changes
        window.addEventListener("favorites:changed", _render);
        window.addEventListener("auth:changed", _render);

        // Re-render when product list updates
        window.addEventListener("products:updated", _render);

        // initial render
        _render();
    }

    function open() {
        // Ensure products are loaded
        if (!products || products.length === 0) {
            fetchGames()
                .then(() => {
                    _currentPage = 1;
                    _render();
                })
                .catch(() => {
                    _grid.innerHTML = '<div class="no-results"><p>No se pudo cargar productos.</p></div>';
                });
        } else {
            _currentPage = 1;
            _render();
        }
    }

    return { init, open };
})();

window.FavoritesView = FavoritesView;
