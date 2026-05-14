// detail-availability.js
// Handles the rental form inside the product detail view.

(function () {
    const DetailAvailability = (() => {
        const DAY_MS = 24 * 60 * 60 * 1000;

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
        let _form = null;

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

        function _getDailyPrice() {
            const price = Number(_product?.price ?? 0);
            return Math.round(price / 30);
        }

        function _getMinimumStartDate() {
            const today = _startOfDay(new Date());
            const releaseDate = _parseReleaseDate(_product?.releaseDate);

            if (releaseDate && releaseDate > today) {
                return releaseDate;
            }

            return today;
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
            if (!_authNoteEl || !_submitBtn) return;

            const authenticated = Boolean(window.Auth?.isAuthenticated?.());
            _authNoteEl.textContent = authenticated ? "Elegí las fechas y revisá el costo estimado antes de confirmar el alquiler." : "Iniciá sesión para alquilar este juego.";
            _submitBtn.disabled = !authenticated;
        }

        function _syncInputs() {
            if (!_startInput || !_endInput) return;

            const minStart = _getMinimumStartDate();
            const minISO = _toISO(minStart);

            _startInput.min = minISO;
            _endInput.min = minISO;

            const currentStart = _parseISODate(_startInput.value);
            if (!currentStart || currentStart < minStart) {
                _startInput.value = minISO;
            }

            const startDate = _parseISODate(_startInput.value) || minStart;
            _endInput.min = _toISO(startDate);

            const currentEnd = _parseISODate(_endInput.value);
            if (!currentEnd || currentEnd < startDate) {
                _endInput.value = _startInput.value;
            }
        }

        function _updatePreview() {
            if (!_dailyPriceEl || !_daysEl || !_totalPriceEl || !_warningEl) return;

            const startDate = _parseISODate(_startInput?.value || "");
            const endDate = _parseISODate(_endInput?.value || "");
            const daily = _getDailyPrice();

            _dailyPriceEl.textContent = _formatCurrency(daily);

            if (!startDate || !endDate || endDate < startDate) {
                _daysEl.textContent = "—";
                _totalPriceEl.textContent = "—";
                _warningEl.hidden = true;
                return;
            }

            const days = _daysBetween(startDate, endDate);
            const total = daily * days;

            _daysEl.textContent = `${days} día${days !== 1 ? "s" : ""}`;
            _totalPriceEl.textContent = _formatCurrency(total);
            _warningEl.hidden = days <= 30;
        }

        async function _submitRental(event) {
            event.preventDefault();

            if (!window.Auth?.isAuthenticated?.()) {
                _setFeedback("Tenés que iniciar sesión para alquilar este juego.", "error");
                return;
            }

            const startDate = _parseISODate(_startInput?.value || "");
            const endDate = _parseISODate(_endInput?.value || "");
            const minStart = _getMinimumStartDate();

            if (!startDate || !endDate) {
                _setFeedback("Elegí una fecha de inicio y una fecha de fin válidas.", "error");
                return;
            }

            if (startDate < minStart) {
                const releaseDate = _parseReleaseDate(_product?.releaseDate);
                if (releaseDate && releaseDate > _startOfDay(new Date())) {
                    _setFeedback(`Este juego sale el ${_toISO(releaseDate)}. El alquiler empieza desde esa fecha.`, "error");
                } else {
                    _setFeedback("La fecha de inicio no puede ser anterior a hoy.", "error");
                }
                return;
            }

            if (endDate < startDate) {
                _setFeedback("La fecha de fin no puede ser anterior a la fecha de inicio.", "error");
                return;
            }

            const days = _daysBetween(startDate, endDate);
            const daily = _getDailyPrice();
            const total = daily * days;

            if (days > 30) {
                window.alert("Si lo querés por más de 30 días, conviene comprarlo en lugar de alquilarlo.");
            }

            if (_submitBtn) {
                _submitBtn.disabled = true;
                _submitBtn.textContent = "Procesando...";
            }

            try {
                const response = await fetch(`${API_BASE_URL}/reservations`, {
                    method: "POST",
                    headers: window.Auth.getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        app_id: _product.id,
                        start_date: _toISO(startDate),
                        end_date: _toISO(endDate),
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

                _setFeedback(`Alquiler confirmado. Total: ${_formatCurrency(total)}.`, "success");
            } catch (error) {
                _setFeedback(error.message || "No se pudo crear el alquiler.", "error");
            } finally {
                if (_submitBtn) {
                    _submitBtn.disabled = !Boolean(window.Auth?.isAuthenticated?.());
                    _submitBtn.textContent = "Alquilar ahora";
                }
                _updatePreview();
            }
        }

        function load(product) {
            _product = product && typeof product === "object" ? product : null;

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

            if (!_product || !_startInput || !_endInput || !_dailyPriceEl || !_daysEl || !_totalPriceEl || !_warningEl || !_feedbackEl || !_authNoteEl || !_submitBtn || !_form) {
                return;
            }

            _syncAuthState();
            _syncInputs();

            if (!_form.dataset.bound) {
                _form.addEventListener("submit", _submitRental);
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
            const minISO = _toISO(minStart);
            _startInput.value = minISO;
            _endInput.value = minISO;
            _endInput.min = minISO;

            _setFeedback("");
            _updatePreview();
        }

        return { load };
    })();

    window.DetailAvailability = DetailAvailability;
})();
