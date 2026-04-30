// router.js
// Handles navigation between the home view and the detail view.

const Router = (() => {
    let _homeView = null;
    let _detailView = null;
    let _detailContent = null;
    let _lastScrollY = 0;
    let _currentProductId = null;

    function _open(product) {
        if (!_homeView || !_detailView || !_detailContent) return;

        _lastScrollY = window.scrollY || window.pageYOffset || 0;
        _currentProductId = product.id;
        _detailContent.innerHTML = buildDetailHTML(product);

        _homeView.style.display = "none";
        _detailView.style.display = "block";

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    function _close() {
        if (!_homeView || !_detailView || !_detailContent) return;

        _detailView.style.display = "none";
        _homeView.style.display = "block";
        _detailContent.innerHTML = "";
        _currentProductId = null;

        window.scrollTo({ top: _lastScrollY, left: 0, behavior: "auto" });
    }

    async function _refreshOpenDetail() {
        if (!_currentProductId || !_detailView || _detailView.style.display !== "block") return;

        try {
            const product = await getProductById(_currentProductId);
            if (!product) return;
            _detailContent.innerHTML = buildDetailHTML(product);
        } catch {
            // Keep the current detail state if the refresh fails.
        }
    }

    function init() {
        _homeView = document.getElementById("homeView");
        _detailView = document.getElementById("detailView");
        _detailContent = document.getElementById("detailContent");

        if (!_homeView || !_detailView || !_detailContent) return;

        // Make logo clickable to return to home
        const logo = document.querySelector(".logo");
        if (logo) {
            logo.addEventListener("click", () => {
                if (_detailView.style.display === "block") {
                    _close();
                }
            });
            logo.style.cursor = "pointer";
        }

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
            if (event.key === "Escape" && _detailView.style.display === "block") {
                _close();
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

    return { init, navigateTo };
})();
