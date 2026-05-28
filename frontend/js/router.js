// router.js
// Simple client-side view router to switch between home, detail, search and favorites views.

const Router = (() => {
    let _home = null;
    let _detail = null;
    let _preview = null;
    let _confirmation = null;
    let _cart = null;
    let _search = null;
    let _favorites = null;
    let _library = null;
    let _detailContent = null;
    let _previewContent = null;
    let _confirmationContent = null;
    let _cartContent = null;
    let _currentProduct = null;
    let _currentTransaction = null;
    let _cartOriginProduct = null;
    let _cartBtn = null;
    let _libraryBtn = null;
    let _handlingPopState = false;
    let _currentView = "home";

    const API_BASE_URL = `http://${window.location.hostname || "127.0.0.1"}:5000/api`;

    function _startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function _toISO(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function _addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + Number(days || 0));
        return _startOfDay(result);
    }

    function _hideAll() {
        if (_home) _home.style.display = "none";
        if (_detail) _detail.style.display = "none";
        if (_preview) _preview.style.display = "none";
        if (_confirmation) _confirmation.style.display = "none";
        if (_cart) _cart.style.display = "none";
        if (_search) _search.style.display = "none";
        if (_favorites) _favorites.style.display = "none";
        if (_library) _library.style.display = "none";
    }

    function _syncCartButton() {
        if (!_cartBtn) return;

        const enabled = Boolean(window.Cart?.canUseCart?.());

        _cartBtn.hidden = !enabled;
        _cartBtn.setAttribute("aria-pressed", "false");
        _cartBtn.title = "Carrito";
    }

    function _syncLibraryButton() {
        if (!_libraryBtn) return;

        const enabled = Boolean(window.Auth?.isAuthenticated?.());
        _libraryBtn.hidden = !enabled;
        _libraryBtn.setAttribute("aria-pressed", "false");
    }

    function _syncSearchAfterViewChange() {
        window.UI?.refreshSearch?.();
    }

    function _pushHistory(view, data = {}) {
        if (_handlingPopState) return;
        try {
            const state = { view, ...data };
            window.history.pushState(state, "");
        } catch {
            // Ignore history API errors to avoid blocking navigation.
        }
    }

    function _replaceHistory(view, data = {}) {
        try {
            const state = { view, ...data };
            window.history.replaceState(state, "");
        } catch {
            // Ignore history API errors to avoid blocking navigation.
        }
    }

    function _showHome(pushHistory = true) {
        _hideAll();
        if (_home) _home.style.display = "block";
        _currentView = "home";
        if (pushHistory) {
            _pushHistory("home");
        }
        _syncSearchAfterViewChange();
    }

    function navigateTo(id, options = {}) {
        const pushHistory = options.pushHistory !== false;
        // Show detail view for product id
        const show = async () => {
            try {
                const product = await window.getProductById?.(id);
                if (!product) {
                    _detailContent.innerHTML = '<div class="no-results"><p>Producto no encontrado.</p></div>';
                } else {
                    _currentProduct = product;
                    _currentTransaction = null;
                    _detailContent.innerHTML = buildDetailHTML(product);
                    window.DetailAvailability?.load?.(product);
                }
            } catch (e) {
                _detailContent.innerHTML = '<div class="no-results"><p>Error al cargar el producto.</p></div>';
            }

            _hideAll();
            if (_detail) _detail.style.display = "block";
            _currentView = "detail";
            if (pushHistory) {
                _pushHistory("detail", { productId: Number(id) || id });
            }
            _syncSearchAfterViewChange();
            window.scrollTo({ top: 0, behavior: "smooth" });
        };

        show();
    }

    function openSearchView(options = {}) {
        const pushHistory = options.pushHistory !== false;
        _hideAll();
        if (_search) _search.style.display = "block";
        _currentView = "search";
        if (pushHistory) {
            _pushHistory("search");
        }
        _syncSearchAfterViewChange();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function closeSearchView(options = {}) {
        _showHome(options.pushHistory !== false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openFavoritesView(options = {}) {
        const pushHistory = options.pushHistory !== false;
        _hideAll();
        if (_favorites) _favorites.style.display = "block";
        _currentView = "favorites";
        // let favorites view manage filling itself
        window.FavoritesView?.open?.();
        if (pushHistory) {
            _pushHistory("favorites");
        }
        _syncSearchAfterViewChange();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openLibraryView(options = {}) {
        const pushHistory = options.pushHistory !== false;
        _hideAll();
        if (_library) _library.style.display = "block";
        _currentView = "library";
        window.LibraryView?.open?.();
        if (pushHistory) {
            _pushHistory("library");
        }
        _syncSearchAfterViewChange();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openCartView(payload = {}, options = {}) {
        const pushHistory = options.pushHistory !== false;
        _cartOriginProduct = payload?.originProduct || null;

        const items = window.Cart?.getItems?.() || [];
        const totals = window.Cart?.getTotals?.() || { total: 0, purchases: 0, rentals: 0 };

        if (_cartContent) {
            _cartContent.innerHTML = buildCartSummaryHTML(items, totals);
        }

        _hideAll();
        if (_cart) _cart.style.display = "block";
        _currentView = "cart";

        if (pushHistory) {
            _pushHistory("cart");
        }
        _syncSearchAfterViewChange();

        const backBtn = document.getElementById("cartBackBtn");
        if (backBtn) {
            backBtn.onclick = () => {
                if (_cartOriginProduct) {
                    navigateTo(_cartOriginProduct.id);
                } else {
                    _hideAll();
                    if (_home) _home.style.display = "block";
                }
            };
        }

        const clearBtn = document.getElementById("cartClearBtn");
        if (clearBtn) {
            clearBtn.onclick = () => {
                window.Cart?.clearCart?.();
                openCartView({ originProduct: _cartOriginProduct });
            };
        }

        const checkoutBtn = document.getElementById("cartCheckoutBtn");
        const statusEl = document.getElementById("cartStatus");
        if (checkoutBtn) {
            checkoutBtn.onclick = async () => {
                const authenticated = Boolean(window.Auth?.isAuthenticated?.());
                if (!authenticated) {
                    document.getElementById("openLoginBtn")?.click();
                    return;
                }

                const itemsToCheckout = window.Cart?.getItems?.() || [];
                if (itemsToCheckout.length === 0) return;

                checkoutBtn.disabled = true;
                checkoutBtn.textContent = "Procesando...";
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = "Procesando el carrito...";
                    statusEl.classList.remove("transaction-summary__status--success", "transaction-summary__status--error");
                }

                try {
                    // Map items to backend shape: use `game_id` and flatten fields
                    const payloadItems = (itemsToCheckout || []).map((it) => {
                        const base = { type: it.type };
                        if (it.type === "rental") {
                            return {
                                ...base,
                                game_id: Number(it.appId || it.game_id || it.id),
                                startDate: it.startDate || it.start_date || null,
                                endDate: it.endDate || it.end_date || null,
                                days: Number(it.days || 0) || 0,
                                total: Number(it.total || it.price || 0) || 0,
                            };
                        }
                        return {
                            ...base,
                            game_id: Number(it.appId || it.game_id || it.id),
                            total: Number(it.total || it.price || 0) || 0,
                        };
                    });

                    const response = await fetch(`${API_BASE_URL}/cart/checkout`, {
                        method: "POST",
                        headers: window.Auth.getAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({
                            user_id: window.Auth?.getCurrentUser?.()?.id,
                            items: payloadItems,
                        }),
                    });

                    const text = await response.text();
                    let data = {};
                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch {
                            data = {};
                        }
                    }

                    if (!response.ok) {
                        throw new Error(data.error || data.message || text || `HTTP ${response.status}`);
                    }

                    window.Cart?.clearCart?.();
                    openCartConfirmation(data);
                } catch (error) {
                    if (statusEl) {
                        statusEl.hidden = false;
                        statusEl.textContent = error.message || "No se pudo procesar el carrito.";
                        statusEl.classList.remove("transaction-summary__status--success");
                        statusEl.classList.add("transaction-summary__status--error");
                    }
                } finally {
                    checkoutBtn.disabled = false;
                    checkoutBtn.textContent = "Confirmar carrito";
                }
            };
        }

        // Make cart item titles open the detail page when clicked
        const cartContentEl = document.getElementById("cartContent");
        if (cartContentEl) {
            cartContentEl.querySelectorAll(".cart-item__link").forEach((link) => {
                link.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const article = link.closest(".cart-item");
                    const id = Number(article?.dataset?.gameId || article?.getAttribute("data-game-id") || 0);
                    if (Number.isInteger(id) && id > 0) {
                        Router.navigateTo(id);
                    }
                });
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openCartConfirmation(result, options = {}) {
        const pushHistory = options.pushHistory !== false;
        if (_confirmationContent) {
            _confirmationContent.innerHTML = buildCartConfirmationHTML(result || {});
        }

        _hideAll();
        if (_confirmation) _confirmation.style.display = "block";

        if (pushHistory) {
            _pushHistory("confirmation", { kind: "cart" });
        }

        const homeBtn = document.getElementById("cartHomeBtn");
        if (homeBtn) {
            homeBtn.onclick = () => {
                _hideAll();
                if (_home) _home.style.display = "block";
            };
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openTransactionSummary(payload, options = {}) {
        const pushHistory = options.pushHistory !== false;
        const product = payload?.product || _currentProduct;
        const selectedPackage = payload?.package || payload?.selectedPackage || null;

        if (!product || !selectedPackage) return;

        const user = window.Auth?.getCurrentUser?.() || {};
        const days = Number(payload?.days || selectedPackage.days || 0);
        const startDate = _startOfDay(new Date());
        const expiryDate = _addDays(startDate, days);
        const dailyPrice = Math.round(Number(product.price ?? 0) / 30);
        const subtotal = dailyPrice * days;
        const total = Number(payload?.total ?? subtotal);

        _currentProduct = product;
        _currentTransaction = {
            product,
            user,
            days,
            startDate,
            expiryDate,
            dailyPrice,
            subtotal,
            total,
            package: {
                ...selectedPackage,
                days,
                totalLabel: formatPrice(total),
            },
        };

        if (_previewContent) {
            _previewContent.innerHTML = buildTransactionSummaryHTML(_currentTransaction);
        }
        _hideAll();
        if (_preview) _preview.style.display = "block";
        _currentView = "preview";
        if (pushHistory) {
            _pushHistory("preview", { kind: "rental", productId: Number(product.id) || product.id });
        }
        _syncSearchAfterViewChange();

        const backBtn = document.getElementById("transactionBackBtn");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                if (_currentProduct) {
                    navigateTo(_currentProduct.id);
                } else {
                    closeSearchView();
                }
            });
        }

        const confirmBtn = document.getElementById("transactionConfirmBtn");
        const statusEl = document.getElementById("transactionStatus");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", async () => {
                const authenticated = Boolean(window.Auth?.isAuthenticated?.());
                if (!authenticated) {
                    document.getElementById("openLoginBtn")?.click();
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.textContent = "Procesando...";
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = "Procesando la transacción...";
                    statusEl.classList.remove("transaction-summary__status--success", "transaction-summary__status--error");
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/rentals`, {
                        method: "POST",
                        headers: window.Auth.getAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({
                            user_id: user.id,
                            game_id: product.id,
                            package_days: days,
                        }),
                    });

                    const text = await response.text();
                    let data = {};
                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch {
                            data = {};
                        }
                    }

                    if (!response.ok) {
                        throw new Error(data.error || data.message || text || `HTTP ${response.status}`);
                    }

                    openRentalConfirmation({
                        product,
                        user,
                        endDate: data.end_date || _toISO(expiryDate),
                        package_days: data.package_days || days,
                    });
                } catch (error) {
                    if (statusEl) {
                        statusEl.hidden = false;
                        statusEl.textContent = error.message || "No se pudo procesar la transacción.";
                        statusEl.classList.remove("transaction-summary__status--success");
                        statusEl.classList.add("transaction-summary__status--error");
                    }
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Procesar transacción";
                }
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openPurchaseSummary(payload, options = {}) {
        const pushHistory = options.pushHistory !== false;
        const product = payload?.product || _currentProduct;
        if (!product) return;

        const user = window.Auth?.getCurrentUser?.() || {};
        const total = Number(payload?.total ?? Number(product.price ?? 0));

        _currentProduct = product;
        _currentTransaction = {
            product,
            user,
            total,
        };

        if (_previewContent) {
            _previewContent.innerHTML = buildPurchaseSummaryHTML(_currentTransaction);
        }
        _hideAll();
        if (_preview) _preview.style.display = "block";
        _currentView = "preview";
        if (pushHistory) {
            _pushHistory("preview", { kind: "purchase", productId: Number(product.id) || product.id });
        }
        _syncSearchAfterViewChange();

        const backBtn = document.getElementById("purchaseBackBtn");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                if (_currentProduct) {
                    navigateTo(_currentProduct.id);
                } else {
                    closeSearchView();
                }
            });
        }

        const confirmBtn = document.getElementById("purchaseConfirmBtn");
        const statusEl = document.getElementById("purchaseStatus");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", async () => {
                const authenticated = Boolean(window.Auth?.isAuthenticated?.());
                if (!authenticated) {
                    document.getElementById("openLoginBtn")?.click();
                    return;
                }

                confirmBtn.disabled = true;
                confirmBtn.textContent = "Procesando...";
                if (statusEl) {
                    statusEl.hidden = false;
                    statusEl.textContent = "Procesando la compra...";
                    statusEl.classList.remove("transaction-summary__status--success", "transaction-summary__status--error");
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/purchases`, {
                        method: "POST",
                        headers: window.Auth.getAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({
                            user_id: user.id,
                            game_id: product.id,
                        }),
                    });

                    const text = await response.text();
                    let data = {};
                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch {
                            data = {};
                        }
                    }

                    if (!response.ok) {
                        throw new Error(data.error || data.message || text || `HTTP ${response.status}`);
                    }

                    openPurchaseConfirmation({
                        product,
                        user,
                        purchase_date: data.purchase_date,
                    });
                } catch (error) {
                    if (statusEl) {
                        statusEl.hidden = false;
                        statusEl.textContent = error.message || "No se pudo procesar la compra.";
                        statusEl.classList.remove("transaction-summary__status--success");
                        statusEl.classList.add("transaction-summary__status--error");
                    }
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Confirmar compra";
                }
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openRentalConfirmation(payload, options = {}) {
        const pushHistory = options.pushHistory !== false;
        const product = payload?.product || _currentProduct;
        const user = payload?.user || window.Auth?.getCurrentUser?.() || {};
        if (!product) return;

        const endDate = payload?.endDate || payload?.expiryDate || new Date();

        _currentTransaction = {
            product,
            user,
            endDate,
        };

        if (_confirmationContent) {
            _confirmationContent.innerHTML = buildRentalConfirmationHTML(_currentTransaction);
        }

        _hideAll();
        if (_confirmation) _confirmation.style.display = "block";
        _currentView = "confirmation";

        if (pushHistory) {
            _pushHistory("confirmation", { kind: "rental", productId: Number(product.id) || product.id });
        }
        _syncSearchAfterViewChange();

        const homeBtn = document.getElementById("confirmationHomeBtn");
        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                _hideAll();
                if (_home) _home.style.display = "block";
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openPurchaseConfirmation(payload, options = {}) {
        const pushHistory = options.pushHistory !== false;
        const product = payload?.product || _currentProduct;
        const user = payload?.user || window.Auth?.getCurrentUser?.() || {};
        if (!product) return;

        _currentTransaction = {
            product,
            user,
        };

        if (_confirmationContent) {
            _confirmationContent.innerHTML = buildPurchaseConfirmationHTML(_currentTransaction);
        }

        _hideAll();
        if (_confirmation) _confirmation.style.display = "block";
        _currentView = "confirmation";

        if (pushHistory) {
            _pushHistory("confirmation", { kind: "purchase", productId: Number(product.id) || product.id });
        }
        _syncSearchAfterViewChange();

        const homeBtn = document.getElementById("purchaseHomeBtn");
        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                _hideAll();
                if (_home) _home.style.display = "block";
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function closeFavoritesView(options = {}) {
        _showHome(options.pushHistory !== false);
    }

    function closeLibraryView(options = {}) {
        _showHome(options.pushHistory !== false);
    }

    function _restoreFromHistoryState(state) {
        const view = state?.view || "home";
        switch (view) {
            case "detail": {
                const productId = Number(state?.productId || 0);
                if (Number.isInteger(productId) && productId > 0) {
                    navigateTo(productId, { pushHistory: false });
                    return;
                }
                break;
            }
            case "search":
                openSearchView({ pushHistory: false });
                return;
            case "favorites":
                openFavoritesView({ pushHistory: false });
                return;
            case "library":
                openLibraryView({ pushHistory: false });
                return;
            case "cart":
                openCartView({}, { pushHistory: false });
                return;
            case "home":
            default:
                _showHome(false);
                return;
        }

        _showHome(false);
    }

    function init() {
        _home = document.getElementById("homeView");
        _detail = document.getElementById("detailView");
        _preview = document.getElementById("previewView");
        _confirmation = document.getElementById("confirmationView");
        _cart = document.getElementById("cartView");
        _search = document.getElementById("searchView");
        _favorites = document.getElementById("favoritesView");
        _library = document.getElementById("libraryView");
        _detailContent = document.getElementById("detailContent");
        _previewContent = document.getElementById("previewContent");
        _confirmationContent = document.getElementById("confirmationContent");
        _cartContent = document.getElementById("cartContent");
        _cartBtn = document.getElementById("cartBtn");
        _libraryBtn = document.getElementById("libraryBtn");

        const previewBack = document.getElementById("previewBackBtn");
        if (previewBack) {
            previewBack.addEventListener("click", (e) => {
                e.preventDefault();
                if (_currentProduct) {
                    navigateTo(_currentProduct.id);
                } else {
                    closeSearchView();
                }
            });
        }

        // Wire header filter button
        const filterBtn = document.getElementById("filterBtn");
        if (filterBtn) {
            filterBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openSearchView();
            });
        }

        if (_cartBtn) {
            _cartBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const cartVisible = _cart && window.getComputedStyle(_cart).display !== "none";
                if (cartVisible) {
                    _showHome(true);
                } else {
                    openCartView();
                }
            });
        }

        if (_libraryBtn) {
            _libraryBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const libraryVisible = _library && window.getComputedStyle(_library).display !== "none";
                if (libraryVisible) {
                    closeLibraryView();
                } else {
                    openLibraryView();
                }
            });
        }

        // Clicking the logo returns to home
        const logo = document.querySelector(".logo");
        if (logo) {
            logo.style.cursor = "pointer";
            logo.addEventListener("click", (e) => {
                e.preventDefault();
                _showHome(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        // Back buttons
        const searchBack = document.getElementById("searchBackBtn");
        if (searchBack)
            searchBack.addEventListener("click", (e) => {
                e.preventDefault();
                closeSearchView();
            });

        const favoritesBack = document.getElementById("favoritesBackBtn");
        if (favoritesBack)
            favoritesBack.addEventListener("click", (e) => {
                e.preventDefault();
                closeFavoritesView();
            });

        const libraryBack = document.getElementById("libraryBackBtn");
        if (libraryBack)
            libraryBack.addEventListener("click", (e) => {
                e.preventDefault();
                closeLibraryView();
            });

        // Detail back (built into detail markup as a button with data-action="back-to-grid")
        document.addEventListener("click", (e) => {
            const btn = e.target.closest && e.target.closest("[data-action='back-to-grid']");
            if (btn) {
                e.preventDefault();
                _showHome(true);
            }
        });

        document.addEventListener("click", (e) => {
            const btn = e.target.closest && e.target.closest("[data-action='toggle-favorite']");
            if (!btn) return;

            const inDetailView = Boolean(_detail && _detail.style.display === "block");
            if (!inDetailView) return;

            const productId = Number(btn.getAttribute("data-product-id") || _currentProduct?.id || 0);
            if (!Number.isInteger(productId) || productId <= 0) return;

            e.preventDefault();
            e.stopPropagation();
            window.Favorites?.toggleFavorite?.(productId);
        });

        // Cart item removal (delegated)
        document.addEventListener("click", (e) => {
            const btn = e.target.closest && e.target.closest("[data-action='remove-cart-item']");
            if (!btn) return;
            e.preventDefault();

            const article = btn.closest && btn.closest(".cart-item");
            const key = article && article.getAttribute ? article.getAttribute("data-key") : null;
            if (!key) return;

            window.Cart?.removeItem?.(key);
            // Re-open the cart view to refresh contents
            openCartView({ originProduct: _cartOriginProduct });
        });

        // Default state: show home
        _hideAll();
        if (_home) _home.style.display = "block";
        _replaceHistory("home");
        _syncCartButton();
        _syncLibraryButton();

        window.addEventListener("popstate", (event) => {
            _handlingPopState = true;
            try {
                _restoreFromHistoryState(event.state || { view: "home" });
            } finally {
                _handlingPopState = false;
            }
        });

        window.addEventListener("favorites:changed", () => {
            if (_detail && _detail.style.display === "block" && _currentProduct) {
                _detailContent.innerHTML = buildDetailHTML(_currentProduct);
                window.DetailAvailability?.load?.(_currentProduct);
            }
        });

        window.addEventListener("auth:changed", _syncCartButton);
        window.addEventListener("cart:changed", _syncCartButton);
        window.addEventListener("auth:changed", _syncLibraryButton);
    }

    return {
        init,
        navigateTo,
        openSearchView,
        closeSearchView,
        openFavoritesView,
        closeFavoritesView,
        openLibraryView,
        closeLibraryView,
        openCartView,
        openCartConfirmation,
        openTransactionSummary,
        openRentalConfirmation,
        openPurchaseSummary,
        openPurchaseConfirmation,
        getCurrentView: () => _currentView,
    };
})();

window.Router = Router;
