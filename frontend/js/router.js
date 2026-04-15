// router.js
// Handles navigation between the home view and the full-screen detail view.
// Instead of a modal overlay, swaps visibility between #homeView and #detailView.
// Depends on: data.js (getProductById), render.js (buildDetailHTML)

const Router = (() => {
    // ── Private state ───────────────────────────────────────────────────────
    let _homeView = null;
    let _detailView = null;
    let _detailContent = null;

    // ── Private helpers ─────────────────────────────────────────────────────

    function _open(product) {
        _detailContent.innerHTML = buildDetailHTML(product);

        // swap views: hide home, show detail
        _homeView.style.display = "none";
        _detailView.style.display = "block";

        // scroll to top of the page so the detail header is visible
        window.scrollTo({ top: 0, behavior: "instant" });
    }

    function _close() {
        // swap back: show home, hide detail
        _detailView.style.display = "none";
        _homeView.style.display = "block";

        _detailContent.innerHTML = "";
    }

    // ── Public API ──────────────────────────────────────────────────────────

    function init() {
        _homeView = document.getElementById("homeView");
        _detailView = document.getElementById("detailView");
        _detailContent = document.getElementById("detailContent");

        _detailContent.addEventListener("click", (e) => {
            if (e.target.closest("[data-action='back-to-grid']")) {
                _close();
            }
        });

        // Escape key also goes back
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && _detailView.style.display === "block") _close();
        });
    }

    async function navigateTo(productId) {
        try {
            const product = await getProductById(productId);
            if (!product) return;
            _open(product);
        } catch (error) {
            alert("No se pudo cargar el detalle del juego.");
        }
    }

    return { init, navigateTo };
})();
