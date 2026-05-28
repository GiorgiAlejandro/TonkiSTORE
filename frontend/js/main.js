// main.js
// App bootstrap: initialize shared modules and load initial product list.

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await window.Auth?.init?.();
    } catch (e) {
        // Auth init failure should not block UI rendering
        console.warn("Auth init failed", e);
    }

    try {
        window.Cart?.init?.();
    } catch (e) {
        console.warn("Cart init failed", e);
    }

    try {
        window.Favorites?.init?.();
    } catch (e) {
        console.warn("Favorites init failed", e);
    }

    try {
        window.Router?.init?.();
    } catch (e) {
        console.warn("Router init failed", e);
    }

    try {
        window.UI?.init?.();
    } catch (e) {
        console.warn("UI init failed", e);
    }

    try {
        window.FavoritesView?.init?.();
    } catch (e) {
        console.warn("FavoritesView init failed", e);
    }

    try {
        window.LibraryView?.init?.();
    } catch (e) {
        console.warn("LibraryView init failed", e);
    }

    try {
        window.Recommendations?.init?.();
    } catch (e) {
        console.warn("Recommendations init failed", e);
    }

    try {
        // Kick off product loading
        await window.UI?.loadInitialProducts?.();
    } catch (e) {
        console.warn("Failed loading initial products", e);
    }

    const heroOffersBtn = document.getElementById("heroOffersBtn");
    if (heroOffersBtn) {
        heroOffersBtn.addEventListener("click", (event) => {
            event.preventDefault();
            window.Router?.openSearchView?.();
            window.AdvancedSearch?.searchOffersOnly?.();
        });
    }
});
