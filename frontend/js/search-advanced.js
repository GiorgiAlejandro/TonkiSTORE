// search-advanced.js
// Handles advanced search functionality with a dual-calendar range selector and autocomplete

const AdvancedSearch = (() => {
    const PAGE_SIZE = 10;
    const AUTOCOMPLETE_DEBOUNCE_MS = 150;

    let _searchView = null;
    let _homeView = null;
    let _detailView = null;
    let _form = null;
    let _keywordInput = null;
    let _autocompleteDropdown = null;
    let _offersOnlyInput = null;
    let _dateFromInput = null;
    let _dateToInput = null;
    let _searchResults = null;
    let _resultsGrid = null;
    let _pagination = null;
    let _noResults = null;

    let _autocompleteTimer = null;
    let _currentSearchResults = [];
    let _currentPage = 1;
    let _allKeywords = [];
    let _visibleMonth = new Date();
    let _selectedStartDate = null;
    let _selectedEndDate = null;

    function _buildAllKeywords() {
        // Extract unique keywords from all products
        const keywords = new Set();

        if (products && Array.isArray(products)) {
            products.forEach((product) => {
                // Add title words
                if (product.title) {
                    product.title.split(/\s+/).forEach((word) => {
                        if (word.length > 2) keywords.add(word.toLowerCase());
                    });
                }

                // Add tags
                if (product.tags && Array.isArray(product.tags)) {
                    product.tags.forEach((tag) => {
                        if (tag && tag.length > 0) keywords.add(tag.toLowerCase());
                    });
                }
            });
        }

        _allKeywords = Array.from(keywords).sort();
    }

    function _normalizeDate(date) {
        if (!date || Number.isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function _parseDateString(dateString) {
        if (!dateString) return null;

        // Accept full ISO (`YYYY-MM-DD`), ISO with time (`YYYY-MM-DDTHH:MM:SSZ`) or other parseable strings.
        try {
            const dateOnly = String(dateString).split("T")[0];
            const parts = dateOnly.split("-").map(Number);
            if (parts.length === 3 && !parts.some((p) => Number.isNaN(p))) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }

            const parsed = new Date(dateString);
            if (!Number.isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            }
        } catch {
            // fall through
        }

        return null;
    }

    function _formatDate(date) {
        if (!date) return "";

        return date.toLocaleDateString("es-ES", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function _toISO(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function _startOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function _addMonths(date, amount) {
        return new Date(date.getFullYear(), date.getMonth() + amount, 1);
    }

    function _compareDates(left, right) {
        return _normalizeDate(left) - _normalizeDate(right);
    }

    function _isSameDay(left, right) {
        if (!left || !right) return false;
        return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
    }

    function _isInSelectedRange(date) {
        if (!_selectedStartDate || !_selectedEndDate) return false;

        const normalized = _normalizeDate(date);
        return normalized > _selectedStartDate && normalized < _selectedEndDate;
    }

    function _setRangeSummary() {
        if (!_dateRangeSummary) return;

        if (_selectedStartDate && _selectedEndDate) {
            _dateRangeSummary.textContent = `Rango seleccionado: ${_formatDate(_selectedStartDate)} - ${_formatDate(_selectedEndDate)}`;
            return;
        }

        if (_selectedStartDate) {
            _dateRangeSummary.textContent = `Inicio seleccionado: ${_formatDate(_selectedStartDate)}. Selecciona una fecha final.`;
            return;
        }

        _dateRangeSummary.textContent = "Aún no seleccionaste un rango.";
    }

    function _selectDate(date) {
        const normalized = _normalizeDate(date);
        if (!normalized) return;

        if (!_selectedStartDate || _selectedEndDate) {
            _selectedStartDate = normalized;
            _selectedEndDate = null;
        } else if (_compareDates(normalized, _selectedStartDate) < 0) {
            _selectedEndDate = _selectedStartDate;
            _selectedStartDate = normalized;
        } else {
            _selectedEndDate = normalized;
        }

        _setRangeSummary();
        _renderCalendars();
    }

    function _renderCalendarMonth(container, monthDate) {
        if (!container) return;

        const monthStart = _startOfMonth(monthDate);
        const nextMonthStart = _addMonths(monthStart, 1);
        const firstDayIndex = monthStart.getDay();
        const daysInMonth = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), 0).getDate();
        const today = _normalizeDate(new Date());

        const monthLabel = monthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

        const weekdays = ["D", "L", "M", "M", "J", "V", "S"];
        const cells = [];

        for (let emptyIndex = 0; emptyIndex < firstDayIndex; emptyIndex += 1) {
            cells.push('<div class="search-calendar__day search-calendar__day--empty" aria-hidden="true"></div>');
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const currentDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
            const isStart = _selectedStartDate && _isSameDay(currentDate, _selectedStartDate);
            const isEnd = _selectedEndDate && _isSameDay(currentDate, _selectedEndDate);
            const isSelected = isStart || isEnd;
            const isRange = _isInSelectedRange(currentDate);
            const isCurrentDay = today ? _isSameDay(currentDate, today) : false;
            const classes = ["search-calendar__day"];

            if (isCurrentDay) classes.push("search-calendar__day--today");
            if (isRange) classes.push("search-calendar__day--range");
            if (isSelected) classes.push("search-calendar__day--selected");

            cells.push(`
                <button
                    type="button"
                    class="${classes.join(" ")}"
                    data-date="${_toISO(currentDate)}"
                    aria-pressed="${isSelected ? "true" : "false"}"
                >
                    <span>${day}</span>
                </button>
            `);
        }

        container.innerHTML = `
            <div class="search-calendar__header">
                <span class="search-calendar__month">${monthLabel}</span>
            </div>
            <div class="search-calendar__grid">
                ${weekdays.map((weekday) => `<div class="search-calendar__weekday">${weekday}</div>`).join("")}
                ${cells.join("")}
            </div>
        `;

        container.querySelectorAll("[data-date]").forEach((button) => {
            button.addEventListener("click", () => {
                _selectDate(_parseDateString(button.dataset.date));
            });
        });
    }

    function _renderSupportSections() {
        const categoriesGrid = document.getElementById("categoriesGrid");

        if (categoriesGrid) {
            const categoryMap = new Map();

            (products || []).forEach((product) => {
                (product.tags || []).forEach((tag) => {
                    const normalized = String(tag || "").trim();
                    if (!normalized) return;
                    categoryMap.set(normalized, (categoryMap.get(normalized) || 0) + 1);
                });
            });

            const categories = [...categoryMap.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6);

            categoriesGrid.innerHTML = categories
                .map(
                    ([name, count]) => `
                        <button type="button" class="category-card" data-category="${escapeHtml(name)}">
                            <div class="category-card__icon">#</div>
                            <div class="category-card__name">${escapeHtml(name)}</div>
                            <div class="category-card__count">${count} juego${count !== 1 ? "s" : ""}</div>
                        </button>
                    `,
                )
                .join("");

            categoriesGrid.querySelectorAll("[data-category]").forEach((button) => {
                button.addEventListener("click", () => {
                    const category = button.dataset.category || "";
                    if (_keywordInput) {
                        _keywordInput.value = category;
                        _getAutocomplete(category);
                    }
                    const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
                    _form?.dispatchEvent(submitEvent);
                });
            });
        }
    }

    function _showAutocomplete(suggestions) {
        if (!_autocompleteDropdown || suggestions.length === 0) {
            _autocompleteDropdown.hidden = true;
            return;
        }

        const html = suggestions
            .slice(0, 8)
            .map(
                (suggestion) => `
                <div class="autocomplete-item" data-suggestion="${escapeHtml(suggestion)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>${escapeHtml(suggestion)}</span>
                </div>
            `,
            )
            .join("");

        _autocompleteDropdown.innerHTML = html;
        _autocompleteDropdown.hidden = false;

        _autocompleteDropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
            item.addEventListener("click", () => {
                _keywordInput.value = item.dataset.suggestion;
                _autocompleteDropdown.hidden = true;
            });
        });
    }

    function _getAutocomplete(query) {
        if (!query || query.length < 1) {
            _autocompleteDropdown.hidden = true;
            return;
        }

        if (_allKeywords.length === 0 && Array.isArray(products) && products.length > 0) {
            _buildAllKeywords();
        }

        const lowerQuery = query.toLowerCase();
        const suggestions = _allKeywords.filter((keyword) => keyword.includes(lowerQuery));

        _showAutocomplete(suggestions);
    }

    function _performSearch(keyword = "", startDate = null, endDate = null) {
        const normalizedKeyword = String(keyword || "")
            .trim()
            .toLowerCase();
        const offersOnly = Boolean(_offersOnlyInput?.checked);

        const results = (products || []).filter((product) => {
            // Filter by keyword
            if (offersOnly) {
                if (Number(product.discount || 0) <= 0) return false;
            } else if (normalizedKeyword.length > 0) {
                const matchesTitle = product.title && product.title.toLowerCase().includes(normalizedKeyword);
                const matchesTags = product.tags && product.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));

                if (!matchesTitle && !matchesTags) return false;
            }

            // Filter by date range
            if (startDate || endDate) {
                const productDate = product.releaseDate;
                if (productDate && productDate !== "Fecha no disponible") {
                    try {
                        const productDateObj = _parseDateString(productDate) || null;
                        if (productDateObj) {
                            const prodNorm = _normalizeDate(productDateObj);
                            const startNorm = startDate ? _normalizeDate(startDate) : null;
                            const endNorm = endDate ? _normalizeDate(endDate) : null;

                            if (startNorm && prodNorm < startNorm) return false;
                            if (endNorm && prodNorm > endNorm) return false;
                        }
                    } catch {
                        // If date parsing fails, include the product
                    }
                }
            }

            return true;
        });

        return results;
    }

    function _runCurrentSearch() {
        const keyword = _keywordInput?.value.trim() || "";
        const startDate = _dateFromInput?.value ? _parseDateString(_dateFromInput.value) : null;
        const endDate = _dateToInput?.value ? _parseDateString(_dateToInput.value) : null;

        const results = _performSearch(keyword, startDate, endDate);
        _renderSearchResults(results);
        return results;
    }

    function searchOffersOnly() {
        if (_offersOnlyInput) {
            _offersOnlyInput.checked = true;
        }

        return _runCurrentSearch();
    }

    function _createProductCard(product, index) {
        const card = document.createElement("article");
        card.className = "product-card";
        card.setAttribute("data-id", product.id);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", product.title);
        card.style.animationDelay = `${0.05 + index * 0.05}s`;
        card.innerHTML = buildCardHTML(product);

        const openDetail = () => Router.navigateTo(product.id);
        const favoriteBtn = card.querySelector("[data-action='toggle-favorite']");

        favoriteBtn?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.Favorites?.toggleFavorite?.(product.id);
        });

        card.addEventListener("click", openDetail);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
            }
        });

        return card;
    }

    function _renderSearchResults(results, resetPage = true) {
        // Update results only if different reference; optionally reset to page 1.
        if (results !== _currentSearchResults) {
            _currentSearchResults = results;
            _currentPage = 1;
        } else if (resetPage) {
            _currentPage = 1;
        }

        const hasResults = results.length > 0;
        const resultsSection = document.getElementById("resultsSection");
        const noResults = document.getElementById("searchNoResults");

        if (!hasResults) {
            resultsSection.hidden = true;
            noResults.hidden = false;
            return;
        }

        noResults.hidden = true;
        resultsSection.hidden = false;

        const resultsGrid = document.getElementById("searchResultsGrid");
        const resultsCount = document.getElementById("searchResultsCount");

        resultsCount.textContent = `${results.length} resultado${results.length !== 1 ? "s" : ""}`;

        const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
        // Ensure current page is within valid bounds
        _currentPage = Math.min(Math.max(1, _currentPage), totalPages);
        const startIndex = (_currentPage - 1) * PAGE_SIZE;
        const pageItems = results.slice(startIndex, startIndex + PAGE_SIZE);

        const fragment = document.createDocumentFragment();
        pageItems.forEach((product, index) => {
            fragment.appendChild(_createProductCard(product, index));
        });

        resultsGrid.innerHTML = "";
        resultsGrid.appendChild(fragment);

        _renderSearchPagination(totalPages);
    }

    function _renderSearchPagination(totalPages) {
        const pagination = document.getElementById("searchPagination");
        pagination.innerHTML = "";

        if (totalPages <= 1) return;

        const visiblePageCount = 5;
        const pageWindowCount = Math.min(visiblePageCount, totalPages);
        let startPage = Math.max(1, _currentPage - Math.floor(pageWindowCount / 2));
        let endPage = startPage + pageWindowCount - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - pageWindowCount + 1);
        }

        const prevBtn = document.createElement("button");
        prevBtn.className = "pagination__btn";
        prevBtn.type = "button";
        prevBtn.disabled = _currentPage === 1;
        prevBtn.innerHTML = "←";
        prevBtn.addEventListener("click", () => {
            if (_currentPage > 1) {
                _currentPage--;
                _renderSearchResults(_currentSearchResults, false);
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            }
        });
        pagination.appendChild(prevBtn);

        for (let page = startPage; page <= endPage; page++) {
            const btn = document.createElement("button");
            btn.className = "pagination__btn";
            btn.type = "button";
            if (page === _currentPage) {
                btn.classList.add("pagination__btn--active");
                btn.disabled = true;
            }
            btn.textContent = page;
            btn.addEventListener("click", () => {
                _currentPage = page;
                _renderSearchResults(_currentSearchResults, false);
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            });
            pagination.appendChild(btn);
        }

        const nextBtn = document.createElement("button");
        nextBtn.className = "pagination__btn";
        nextBtn.type = "button";
        nextBtn.disabled = _currentPage === totalPages;
        nextBtn.innerHTML = "→";
        nextBtn.addEventListener("click", () => {
            if (_currentPage < totalPages) {
                _currentPage++;
                _renderSearchResults(_currentSearchResults, false);
                window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            }
        });
        pagination.appendChild(nextBtn);
    }

    function _showSearchView() {
        if (_searchView && _homeView && _detailView) {
            _homeView.style.display = "none";
            _detailView.style.display = "none";
            _searchView.style.display = "block";
            _renderSupportSections();
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
    }

    function _hideSearchView() {
        if (_searchView && _homeView) {
            _searchView.style.display = "none";
            _homeView.style.display = "block";
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
    }

    function init() {
        _searchView = document.getElementById("searchView");
        _homeView = document.getElementById("homeView");
        _detailView = document.getElementById("detailView");
        _form = document.getElementById("advancedSearchForm");
        _keywordInput = document.getElementById("searchKeyword");
        _autocompleteDropdown = document.getElementById("searchAutocomplete");
        _offersOnlyInput = document.getElementById("searchOffersOnly");
        _dateFromInput = document.getElementById("dateFrom");
        _dateToInput = document.getElementById("dateTo");
        _searchResults = document.getElementById("searchResults");
        _resultsGrid = document.getElementById("searchResultsGrid");
        _pagination = document.getElementById("searchPagination");
        _noResults = document.getElementById("searchNoResults");

        if (!_searchView || !_form) return;

        _buildAllKeywords();
        _renderSupportSections();

        const today = new Date();
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(today.getFullYear() - 2);

        if (_dateFromInput) _dateFromInput.value = _toISO(twoYearsAgo);
        if (_dateToInput) _dateToInput.value = _toISO(today);

        window.addEventListener("products:updated", () => {
            _buildAllKeywords();
            _renderSupportSections();
        });

        window.addEventListener("favorites:changed", () => {
            if (_currentSearchResults.length > 0) {
                _renderSearchResults(_currentSearchResults);
            }
            _renderSupportSections();
        });

        // Autocomplete listener
        _keywordInput.addEventListener("input", (e) => {
            clearTimeout(_autocompleteTimer);
            _autocompleteTimer = setTimeout(() => {
                _getAutocomplete(e.target.value);
            }, AUTOCOMPLETE_DEBOUNCE_MS);
        });

        _keywordInput.addEventListener("focus", () => {
            if (_keywordInput.value.trim()) {
                _getAutocomplete(_keywordInput.value.trim());
            }
        });

        // Close autocomplete on blur
        _keywordInput.addEventListener("blur", () => {
            setTimeout(() => {
                _autocompleteDropdown.hidden = true;
            }, 200);
        });

        // Form submit
        _form.addEventListener("submit", (e) => {
            e.preventDefault();
            _runCurrentSearch();
        });

        // Form reset
        _form.addEventListener("reset", (e) => {
            setTimeout(() => {
                _keywordInput.value = "";
                _autocompleteDropdown.hidden = true;
                if (_offersOnlyInput) _offersOnlyInput.checked = false;
                if (_dateFromInput) _dateFromInput.value = _toISO(twoYearsAgo);
                if (_dateToInput) _dateToInput.value = _toISO(today);
                document.getElementById("searchNoResults").hidden = true;
                document.getElementById("resultsSection").hidden = true;
            }, 0);
        });

        // Back button
        const backBtn = document.getElementById("searchBackBtn");
        if (backBtn) {
            backBtn.addEventListener("click", (e) => {
                e.preventDefault();
                Router.closeSearchView();
            });
        }
    }

    function _dateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    return {
        init,
        searchOffersOnly,
    };
})();

window.AdvancedSearch = AdvancedSearch;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    AdvancedSearch.init();
});
