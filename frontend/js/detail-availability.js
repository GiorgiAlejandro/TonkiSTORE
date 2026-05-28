// detail-availability.js
// Handles the rental date range inside the product detail view.

(function () {
    const DetailAvailability = (() => {
        const DAY_MS = 24 * 60 * 60 * 1000;
        const MIN_RENTABLE_PRICE = 2;

        let _product = null;
        let _startInput = null;
        let _endInput = null;
        let _dailyPriceEl = null;
        let _daysEl = null;
        let _totalPriceEl = null;
        let _warningEl = null;
        let _feedbackEl = null;
        let _authNoteEl = null;
        let _submitBtn = null;
        let _detailAddToCartBtn = null;
        let _form = null;
        let _rentalSection = null;
        let _libraryCheckToken = 0;

        const API_BASE_URL = `http://${window.location.hostname || "127.0.0.1"}:5000/api`;

        function _startOfDay(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }

        function _toISO(date) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }

        function _parseISODate(value) {
            if (!value) return null;

            const parts = String(value).trim().split("-").map(Number);
            if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;

            const [year, month, day] = parts;
            const parsed = new Date(year, month - 1, day);
            return Number.isNaN(parsed.getTime()) ? null : _startOfDay(parsed);
        }

        function _parseReleaseDate(value) {
            const release = String(value || "").trim();
            if (!release || release.toLowerCase() === "fecha no disponible") return null;
            return _parseISODate(release);
        }

        function _formatCurrency(amount) {
            return formatPrice(amount);
        }

        function _daysBetween(startDate, endDate) {
            const left = _startOfDay(startDate).getTime();
            const right = _startOfDay(endDate).getTime();
            if (right < left) return 0;
            return Math.floor((right - left) / DAY_MS) + 1;
        }

        function _isRentable() {
            const price = Number(_product?.price ?? 0);
            return price >= MIN_RENTABLE_PRICE;
        }

        function _normalizePriceForFormula(price) {
            const numericPrice = Number(price);
            if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 0;

            // If price ends with .99, round to the next integer for rental formula.
            const cents = Math.round((numericPrice - Math.floor(numericPrice)) * 100);
            if (cents === 99) {
                return Math.ceil(numericPrice);
            }

            return numericPrice;
        }

        function _getPriceForRentalCalculation() {
            return _normalizePriceForFormula(_product?.price ?? 0);
        }

        function _getDailyPrice() {
            const basePrice = _getPriceForRentalCalculation();
            const denominator = 2 + basePrice * 0.15;
            if (basePrice <= 0 || denominator <= 0) return 0;
            const daily = basePrice / denominator;
            return Math.round(daily * 100) / 100;
        }

        function _getMaxRentalDays() {
            const totalPrice = _getPriceForRentalCalculation();
            const dailyPrice = _getDailyPrice();
            if (totalPrice <= 0 || dailyPrice <= 0) return 1;

            // Minimum integer days such that dailyPrice * days >= totalPrice
            return Math.max(1, Math.ceil(totalPrice / dailyPrice));
        }

        function _getMinimumStartDate() {
            const today = _startOfDay(new Date());
            const releaseDate = _parseReleaseDate(_product?.releaseDate);

            if (releaseDate && releaseDate > today) {
                return releaseDate;
            }

            return today;
        }

        function _getMaximumEndDate(startDate) {
            const maxRentalDays = _getMaxRentalDays();
            const max = new Date(startDate);
            max.setDate(max.getDate() + maxRentalDays - 1);
            return _startOfDay(max);
        }

        function _getPresetEndDate(startDate) {
            const maxRentalDays = _getMaxRentalDays();
            const presetDays = Math.max(1, Math.floor(maxRentalDays / 2));
            const preset = new Date(startDate);
            preset.setDate(preset.getDate() + presetDays - 1);
            return _startOfDay(preset);
        }

        function _setFeedback(message, kind) {
            if (!_feedbackEl) return;

            _feedbackEl.hidden = !message;
            _feedbackEl.textContent = message || "";
            _feedbackEl.classList.remove("rental-feedback--error", "rental-feedback--success");

            if (kind) {
                _feedbackEl.classList.add(`rental-feedback--${kind}`);
            }
        }

        function _syncAuthState() {
            if (!_authNoteEl) return;

            const authenticated = Boolean(window.Auth?.isAuthenticated?.());
            const maxDays = _getMaxRentalDays();
            _authNoteEl.textContent = authenticated ? `Elegí una fecha de inicio y una fecha de fin. El rango máximo para este juego es de ${maxDays} día${maxDays !== 1 ? "s" : ""}.` : "Iniciá sesión para agregar productos al carrito.";
        }

        function _syncInputs() {
            if (!_startInput || !_endInput) return;

            const minStart = _getMinimumStartDate();
            const minISO = _toISO(minStart);

            _startInput.min = minISO;

            const currentStart = _parseISODate(_startInput.value);
            if (!currentStart || currentStart < minStart) {
                _startInput.value = minISO;
            }

            const startDate = _parseISODate(_startInput.value) || minStart;
            const maxEnd = _getMaximumEndDate(startDate);
            const presetEnd = _getPresetEndDate(startDate);

            _endInput.min = _toISO(startDate);
            _endInput.max = _toISO(maxEnd);

            const currentEnd = _parseISODate(_endInput.value);
            if (!currentEnd || currentEnd < startDate || currentEnd > maxEnd) {
                _endInput.value = _toISO(presetEnd <= maxEnd ? presetEnd : maxEnd);
            }
        }

        function _updatePreview() {
            if (!_dailyPriceEl || !_daysEl || !_totalPriceEl || !_warningEl) return;

            const startDate = _parseISODate(_startInput?.value || "");
            const endDate = _parseISODate(_endInput?.value || "");
            const dailyPrice = _getDailyPrice();

            _dailyPriceEl.textContent = _formatCurrency(dailyPrice);

            if (!startDate || !endDate || endDate < startDate) {
                _daysEl.textContent = "—";
                _totalPriceEl.textContent = "—";
                _warningEl.hidden = true;
                return;
            }

            const days = _daysBetween(startDate, endDate);
            const total = Math.round(dailyPrice * days * 100) / 100;

            _daysEl.textContent = `${days} día${days !== 1 ? "s" : ""}`;
            _totalPriceEl.textContent = _formatCurrency(total);

            const maxDays = _getMaxRentalDays();
            const tooLong = days > maxDays;
            _warningEl.hidden = !tooLong;
            _warningEl.textContent = tooLong ? `El rango máximo permitido para este juego es de ${maxDays} día${maxDays !== 1 ? "s" : ""}.` : "";
        }

        function _openLoginForm() {
            const loginButton = document.getElementById("openLoginBtn");
            if (loginButton) {
                loginButton.click();
                return;
            }

            const loginModal = document.getElementById("loginModal");
            if (loginModal) {
                loginModal.removeAttribute("hidden");
            }
        }

        function _openCartView() {
            window.Router?.openCartView?.({ originProduct: _product });
        }

        async function _fetchLibraryGameIds() {
            const response = await fetch(`${API_BASE_URL}/library`, {
                headers: window.Auth?.getAuthHeaders?.() || {},
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

            const ids = new Set();
            const purchases = Array.isArray(data.purchases) ? data.purchases : [];
            const rentals = Array.isArray(data.rentals) ? data.rentals : [];

            purchases.forEach((item) => {
                const id = Number(item?.game_id || item?.app_id || item?.id);
                if (Number.isInteger(id) && id > 0) ids.add(id);
            });
            rentals.forEach((item) => {
                const id = Number(item?.game_id || item?.app_id || item?.id);
                if (Number.isInteger(id) && id > 0) ids.add(id);
            });

            return ids;
        }

        async function _syncOwnedState() {
            const token = ++_libraryCheckToken;
            const cachedIds = window.LibraryView?.getOwnedGameIds?.();
            // While we check ownership, hide/disable controls to avoid a brief
            // state where the button is visible but will later be blocked.
            if (_detailAddToCartBtn) {
                _detailAddToCartBtn.hidden = true;
                _detailAddToCartBtn.disabled = true;
            }
            if (_submitBtn) {
                _submitBtn.hidden = true;
                _submitBtn.disabled = true;
            }
            if (_rentalSection) {
                _rentalSection.hidden = true;
            }

            if (!_product || !window.Auth?.isAuthenticated?.()) {
                // Not authenticated: restore controls so user can be invited to login.
                if (_detailAddToCartBtn) {
                    _detailAddToCartBtn.hidden = false;
                    _detailAddToCartBtn.disabled = false;
                }
                if (_submitBtn) {
                    _submitBtn.hidden = false;
                    _submitBtn.disabled = false;
                }
                if (_rentalSection) {
                    _rentalSection.hidden = false;
                }
                return;
            }

            try {
                // Prefer cached ids when available and non-empty to avoid a fetch.
                let ids = cachedIds instanceof Set && cachedIds.size > 0 ? cachedIds : await _fetchLibraryGameIds();
                // Ignore stale async results if user switched product quickly.
                if (token !== _libraryCheckToken) return;

                const alreadyOwned = ids.has(Number(_product?.id));
                if (alreadyOwned) {
                    if (_detailAddToCartBtn) {
                        _detailAddToCartBtn.hidden = true;
                        _detailAddToCartBtn.disabled = true;
                    }
                    if (_submitBtn) {
                        _submitBtn.hidden = true;
                        _submitBtn.disabled = true;
                    }
                    if (_rentalSection) {
                        _rentalSection.hidden = true;
                    }
                    _setFeedback("Este juego ya está en tu biblioteca.", "success");
                    return;
                }

                // Not owned: restore controls
                if (_detailAddToCartBtn) {
                    _detailAddToCartBtn.hidden = false;
                    _detailAddToCartBtn.disabled = false;
                }
                if (_submitBtn) {
                    _submitBtn.hidden = false;
                    _submitBtn.disabled = false;
                }
                if (_rentalSection) {
                    _rentalSection.hidden = false;
                }
                _setFeedback("");
            } catch {
                // If library lookup fails, restore controls to avoid blocking the flow.
                if (_detailAddToCartBtn) {
                    _detailAddToCartBtn.hidden = false;
                    _detailAddToCartBtn.disabled = false;
                }
                if (_submitBtn) {
                    _submitBtn.hidden = false;
                    _submitBtn.disabled = false;
                }
                if (_rentalSection) {
                    _rentalSection.hidden = false;
                }
            }
        }

        function _addRentalToCart(event) {
            event.preventDefault();

            if (!window.Auth?.isAuthenticated?.()) {
                _openLoginForm();
                return;
            }

            if (!_isRentable()) {
                _setFeedback("Este juego no está disponible para alquiler.", "error");
                return;
            }

            const startDate = _parseISODate(_startInput?.value || "");
            const endDate = _parseISODate(_endInput?.value || "");

            if (!startDate || !endDate) {
                _setFeedback("Elegí una fecha de inicio y una fecha de fin válidas.", "error");
                return;
            }

            const minStart = _getMinimumStartDate();
            const maxEnd = _getMaximumEndDate(startDate);

            if (startDate < minStart) {
                _setFeedback("La fecha de inicio no puede ser anterior a hoy.", "error");
                return;
            }

            if (endDate < startDate) {
                _setFeedback("La fecha de fin no puede ser anterior a la fecha de inicio.", "error");
                return;
            }

            if (endDate > maxEnd) {
                const maxDays = _getMaxRentalDays();
                _setFeedback(`El alquiler no puede superar ${maxDays} día${maxDays !== 1 ? "s" : ""} para este juego.`, "error");
                return;
            }

            const days = _daysBetween(startDate, endDate);
            const total = Math.round(_getDailyPrice() * days * 100) / 100;

            const added = window.Cart?.addItem?.({
                type: "rental",
                appId: _product.id,
                title: _product.title,
                image: _product.image,
                total,
                days,
                startDate: _toISO(startDate),
                endDate: _toISO(endDate),
                product: _product,
            });

            if (added) {
                _setFeedback("Alquiler agregado al carrito.", "success");
                _openCartView();
            } else {
                _setFeedback("No se pudo agregar el alquiler al carrito.", "error");
            }
        }

        async function _addPurchaseToCart(event) {
            event.preventDefault();

            if (!window.Auth?.isAuthenticated?.()) {
                _openLoginForm();
                return;
            }

            try {
                const ownedIds = await _fetchLibraryGameIds();
                if (ownedIds.has(Number(_product?.id))) {
                    _setFeedback("Este juego ya está en tu biblioteca.", "error");
                    return;
                }
            } catch {
                // If the library lookup fails, keep the flow available instead of blocking it.
            }

            const added = window.Cart?.addItem?.({
                type: "purchase",
                appId: _product.id,
                title: _product.title,
                image: _product.image,
                total: Number(_product?.price ?? 0),
                product: _product,
            });

            if (added) {
                _setFeedback("Juego agregado al carrito.", "success");
                _openCartView();
            } else {
                _setFeedback("No se pudo agregar el juego al carrito.", "error");
            }
        }

        function load(product) {
            _product = product && typeof product === "object" ? product : null;

            _detailAddToCartBtn = document.getElementById("detailAddToCartBtn");
            _startInput = document.getElementById("rentalStartDate");
            _endInput = document.getElementById("rentalEndDate");
            _dailyPriceEl = document.getElementById("rentalDailyPrice");
            _daysEl = document.getElementById("rentalDays");
            _totalPriceEl = document.getElementById("rentalTotalPrice");
            _warningEl = document.getElementById("rentalLongStayWarning");
            _feedbackEl = document.getElementById("rentalFeedback");
            _authNoteEl = document.getElementById("rentalAuthNote");
            _submitBtn = document.getElementById("rentalSubmitBtn");
            _form = document.getElementById("rentalForm");
            _rentalSection = document.querySelector(".detail__rental");

            if (!_product || !_detailAddToCartBtn) {
                return;
            }

            if (!_detailAddToCartBtn.dataset.bound) {
                _detailAddToCartBtn.addEventListener("click", _addPurchaseToCart);
                _detailAddToCartBtn.dataset.bound = "true";
            }

            // Always sync ownership so free games already in the library hide the main action too.
            _syncOwnedState();

            // If rental UI is not present (price <= $2), keep purchase flow available and exit.
            if (!_startInput || !_endInput || !_dailyPriceEl || !_daysEl || !_totalPriceEl || !_warningEl || !_feedbackEl || !_authNoteEl || !_submitBtn || !_form) {
                return;
            }

            _syncAuthState();
            _syncInputs();

            if (!_form.dataset.bound) {
                _form.addEventListener("submit", _addRentalToCart);
                _startInput.addEventListener("change", () => {
                    _syncInputs();
                    _updatePreview();
                });
                _endInput.addEventListener("change", () => {
                    _syncInputs();
                    _updatePreview();
                });
                _form.dataset.bound = "true";
            }

            const minStart = _getMinimumStartDate();
            const maxEnd = _getMaximumEndDate(minStart);
            const presetEnd = _getPresetEndDate(minStart);
            _startInput.value = _toISO(minStart);
            _endInput.value = _toISO(presetEnd <= maxEnd ? presetEnd : maxEnd);
            _endInput.min = _toISO(minStart);
            _endInput.max = _toISO(maxEnd);

            _setFeedback("");
            _updatePreview();
        }

        return { load };
    })();

    window.DetailAvailability = DetailAvailability;
})();
