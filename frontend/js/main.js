// main.js
// Entry point. Initializes all modules in the correct order
// and kicks off the first render once the DOM is ready.
// Load order in index.html: data → favorites → render → search-advanced → router → ui → auth → main

document.addEventListener("DOMContentLoaded", async () => {
    AdvancedSearch.init();
    Router.init();
    Favorites.init();
    window.FavoritesView?.init?.();
    UI.init();
    await Auth.init();
    UI.loadInitialProducts();
});
