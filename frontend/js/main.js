// main.js
// Entry point. Initializes all modules in the correct order
// and kicks off the first render once the DOM is ready.
// Load order in index.html: data → render → router → ui → main

document.addEventListener("DOMContentLoaded", () => {
    Router.init();
    UI.init();
    UI.loadInitialProducts();
});
