// main.js
// Entry point. Initializes all modules in the correct order
// and kicks off the first render once the DOM is ready.
// Load order in index.html: data → render → router → ui → auth → main

document.addEventListener("DOMContentLoaded", async () => {
    Router.init();
    UI.init();
    await Auth.init();
    Favorites.init();
    UI.loadInitialProducts();
});
