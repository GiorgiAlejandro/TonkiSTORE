// router.js
// Handles navigation between the home view, detail view, and search view.

const Router = (() => {
    let _homeView = null;
    let _detailView = null;
    let _searchView = null;
    let _favoritesView = null;
    let _detailContent = null;
    let _lastScrollY = 0;
    let _currentProductId = null;
    let _currentProduct = null;

    function _open(product) {
        if (!_homeView || !_detailView || !_detailContent) return;

        _lastScrollY = window.scrollY || window.pageYOffset || 0;
        _currentProductId = product.id;
        _currentProduct = product;
        _detailContent.innerHTML = buildDetailHTML(product);

        // After rendering detail HTML, load rental and availability UI for the product
        try {
            if (window.DetailAvailability && typeof window.DetailAvailability.load === "function") {
                window.DetailAvailability.load(product);
            }
        } catch {
            // Fail silently to avoid breaking navigation
        }

        _homeView.style.display = "none";
        _detailView.style.display = "block";
        if (_searchView) _searchView.style.display = "none";

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    function _close() {
        if (!_homeView || !_detailView || !_detailContent) return;

        _detailView.style.display = "none";
        _homeView.style.display = "block";
        _detailContent.innerHTML = "";
        _currentProductId = null;
        _currentProduct = null;

        window.scrollTo({ top: _lastScrollY, left: 0, behavior: "auto" });
    }

    function _openSearchView() {
        if (!_homeView || !_searchView || !_detailView) return;

        _lastScrollY = window.scrollY || window.pageYOffset || 0;
        _homeView.style.display = "none";
        _detailView.style.display = "none";
        _searchView.hidden = false;
        _searchView.style.display = "block";

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    function _closeSearchView() {
        if (!_homeView || !_searchView) return;

        _searchView.style.display = "none";
        _searchView.hidden = true;
        _homeView.style.display = "block";

        window.scrollTo({ top: _lastScrollY, left: 0, behavior: "auto" });
    }

    function _closeFavoritesView() {
        if (!_homeView || !_favoritesView) return;

        _favoritesView.style.display = "none";
        _favoritesView.hidden = true;
        _homeView.style.display = "block";

        window.scrollTo({ top: _lastScrollY, left: 0, behavior: "auto" });
    }

    async function _refreshOpenDetail() {
        if (!_currentProductId || !_detailView || _detailView.style.display !== "block") return;

        try {
            const product = await getProductById(_currentProductId);
            if (!product) return;
            _currentProduct = product;
            _detailContent.innerHTML = buildDetailHTML(product);
            if (window.DetailAvailability && typeof window.DetailAvailability.load === "function") {
                window.DetailAvailability.load(product);
            }
        } catch {
            // Keep the current detail state if the refresh fails.
        }
    }

    function init() {
        _homeView = document.getElementById("homeView");
        _detailView = document.getElementById("detailView");
        _searchView = document.getElementById("searchView");
        _favoritesView = document.getElementById("favoritesView");
        _detailContent = document.getElementById("detailContent");

        if (!_homeView || !_detailView || !_detailContent) return;

        // Make logo clickable to return to home
        const logo = document.querySelector(".logo");
        if (logo) {
            logo.addEventListener("click", () => {
                if (_detailView.style.display === "block") {
                    _close();
                } else if (_searchView && _searchView.style.display === "block") {
                    _closeSearchView();
                }
            });
            logo.style.cursor = "pointer";
        }

        // Filters button opens advanced search view
        const filterBtn = document.getElementById("filterBtn");
        if (filterBtn) {
            filterBtn.disabled = false;
            filterBtn.setAttribute("aria-disabled", "false");
            filterBtn.addEventListener("click", _openSearchView);
        }

        const favoritesBackBtn = document.getElementById("favoritesBackBtn");
        if (favoritesBackBtn) favoritesBackBtn.addEventListener("click", _closeFavoritesView);

        _detailContent.addEventListener("click", (event) => {
            if (event.target.closest("[data-action='back-to-grid']")) {
                _close();
                return;
            }

            const favoriteBtn = event.target.closest("[data-action='toggle-favorite']");
            if (favoriteBtn) {
                event.preventDefault();
                event.stopPropagation();
                const productId = Number(favoriteBtn.dataset.productId);
                if (Number.isInteger(productId)) {
                    window.Favorites?.toggleFavorite?.(productId);
                }
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (_detailView.style.display === "block") {
                    _close();
                } else if (_searchView && _searchView.style.display === "block") {
                    _closeSearchView();
                }
            }
        });

        window.addEventListener("auth:changed", () => {
            _refreshOpenDetail();
        });

        window.addEventListener("favorites:changed", () => {
            _refreshOpenDetail();
        });
    }

    async function navigateTo(productId) {
        try {
            const product = await getProductById(productId);
            if (!product) return;
            _open(product);
        } catch {
            alert("No se pudo cargar el detalle del juego.");
        }
    }

    return {
        init,
        navigateTo,
        openSearchView: _openSearchView,
        closeSearchView: _closeSearchView,
    };
})();
