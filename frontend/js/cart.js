// cart.js
// User-scoped cart for mixed purchases and rentals.

const Cart = (() => {
    const STORAGE_KEY = "tonkistore.cart";
    let initialized = false;

    function canUseCart() {
        return Boolean(window.Auth?.isAuthenticated?.());
    }

    function getCurrentUserKey() {
        const user = window.Auth?.getCurrentUser?.();
        if (!user) return null;

        const numericId = Number(user.id ?? user.user_id ?? user.uid);
        if (Number.isInteger(numericId)) {
            return `user:${numericId}`;
        }

        if (typeof user.email === "string" && user.email.trim()) {
            return `email:${user.email.trim().toLowerCase()}`;
        }

        // Fallback for legacy/partial auth payloads: keep cart usable for the active session.
        return "user:authenticated";
    }

    function readStore() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }

    function writeStore(store) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        } catch {
            // Ignore storage errors to avoid blocking the UI.
        }
    }

    function normalizeItem(item) {
        if (!item || typeof item !== "object") return null;

        const type = item.type === "rental" ? "rental" : "purchase";
        const appId = Number(item.appId ?? item.game_id ?? item.app_id ?? item.id ?? item.product?.id ?? item.product?.app_id);
        if (!Number.isInteger(appId)) return null;

        const product = item.product || {};
        // Normalize dates to YYYY-MM-DD (strip time) so keys compare consistently
        function toDateOnly(value) {
            if (!value) return null;
            try {
                const text = String(value).trim();
                // Preserve plain date strings as-is to avoid timezone shifts.
                if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                    return text;
                }
                // For ISO timestamps, keep only the date component.
                if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
                    return text.slice(0, 10);
                }

                const d = new Date(text);
                if (Number.isNaN(d.getTime())) return null;
                return d.toISOString().slice(0, 10);
            } catch {
                return null;
            }
        }

        const start = toDateOnly(item.startDate ?? item.start_date ?? item.start ?? item.product?.startDate);
        const end = toDateOnly(item.endDate ?? item.end_date ?? item.end ?? item.product?.endDate);
        const key = type === "rental" ? `${type}:${appId}:${start || ""}:${end || ""}` : `${type}:${appId}`;

        const total = Number(item.total ?? item.price ?? item.purchasePrice ?? product.price ?? 0) || 0;

        return {
            key,
            type,
            appId,
            title: item.title || product.title || product.name || `Juego ${appId}`,
            image: item.image || product.image || product.image_url || "",
            total,
            price: total,
            days: Number(item.days ?? 0) || null,
            startDate: start,
            endDate: end,
            metadata: item.metadata || {},
        };
    }

    function getItems() {
        if (!canUseCart()) return [];

        const userKey = getCurrentUserKey();
        if (!userKey) return [];

        const store = readStore();
        const items = Array.isArray(store[userKey]) ? store[userKey] : [];
        return items.map(normalizeItem).filter(Boolean);
    }

    function getCount() {
        return getItems().length;
    }

    function getTotals() {
        const items = getItems();
        return items.reduce(
            (acc, item) => {
                acc.total += Number(item.total || 0);
                if (item.type === "rental") {
                    acc.rental += Number(item.total || 0);
                    acc.rentals += 1;
                } else {
                    acc.purchase += Number(item.total || 0);
                    acc.purchases += 1;
                }
                return acc;
            },
            { total: 0, rental: 0, purchase: 0, rentals: 0, purchases: 0 },
        );
    }

    function notifyChanged() {
        window.dispatchEvent(
            new CustomEvent("cart:changed", {
                detail: {
                    authenticated: canUseCart(),
                    items: getItems(),
                    count: getCount(),
                    totals: getTotals(),
                },
            }),
        );
    }

    function setItems(items) {
        if (!canUseCart()) return false;

        const userKey = getCurrentUserKey();
        if (!userKey) return false;

        const normalizedItems = Array.isArray(items) ? items.map(normalizeItem).filter(Boolean) : [];
        const store = readStore();
        store[userKey] = normalizedItems;
        writeStore(store);
        notifyChanged();
        return true;
    }

    function addItem(item) {
        if (!canUseCart()) return false;

        const normalizedItem = normalizeItem(item);
        if (!normalizedItem) return false;

        const userKey = getCurrentUserKey();
        if (!userKey) return false;

        const store = readStore();
        const currentItems = Array.isArray(store[userKey]) ? store[userKey] : [];

        // Normalize current items first
        const normalizedCurrent = currentItems.map(normalizeItem).filter(Boolean);
        // If an item with the same key already exists, do not add a duplicate
        const exists = normalizedCurrent.some((existing) => existing.key === normalizedItem.key);
        if (exists) {
            // Idempotent behavior: prevent duplicates without failing the UX flow.
            return true;
        }

        // Prepend the new item
        normalizedCurrent.unshift(normalizedItem);
        store[userKey] = normalizedCurrent;
        writeStore(store);
        notifyChanged();
        return true;
    }

    function removeItem(key) {
        if (!canUseCart()) return false;

        const userKey = getCurrentUserKey();
        if (!userKey) return false;

        const store = readStore();
        const currentItems = Array.isArray(store[userKey]) ? store[userKey] : [];
        store[userKey] = currentItems.filter((item) => normalizeItem(item)?.key !== key);
        writeStore(store);
        notifyChanged();
        return true;
    }

    function clearCart() {
        return setItems([]);
    }

    function handleStorageChange(event) {
        if (event.key && event.key !== STORAGE_KEY) return;
        notifyChanged();
    }

    function init() {
        if (initialized) return;

        initialized = true;
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("auth:changed", notifyChanged);
        notifyChanged();
    }

    return {
        init,
        canUseCart,
        getItems,
        getCount,
        getTotals,
        addItem,
        removeItem,
        clearCart,
        setItems,
    };
})();

window.Cart = Cart;
