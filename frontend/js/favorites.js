// favorites.js
// Client-side favorites storage scoped to the authenticated user.

const Favorites = (() => {
    const STORAGE_KEY = "tonkistore.favorites";
    let initialized = false;

    function canUseFavorites() {
        return Boolean(window.Auth?.isAuthenticated?.());
    }

    function getCurrentUserKey() {
        const user = window.Auth?.getCurrentUser?.();
        if (!user) return null;

        if (user.id !== undefined && user.id !== null) {
            return `user:${user.id}`;
        }

        if (typeof user.email === "string" && user.email.trim()) {
            return `email:${user.email.trim().toLowerCase()}`;
        }

        return null;
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

    function normalizeIds(ids) {
        if (!Array.isArray(ids)) return [];

        return [...new Set(ids.map((value) => Number(value)).filter(Number.isInteger))];
    }

    function getIds() {
        if (!canUseFavorites()) return [];

        const userKey = getCurrentUserKey();
        if (!userKey) return [];

        const store = readStore();
        return normalizeIds(store[userKey]);
    }

    function getCount() {
        return getIds().length;
    }

    function isFavorite(appId) {
        const normalizedId = Number(appId);
        if (!Number.isInteger(normalizedId)) return false;
        return getIds().includes(normalizedId);
    }

    function notifyChanged() {
        window.dispatchEvent(
            new CustomEvent("favorites:changed", {
                detail: {
                    authenticated: canUseFavorites(),
                    ids: getIds(),
                    count: getCount(),
                },
            })
        );
    }

    function setFavorite(appId, shouldBeFavorite) {
        if (!canUseFavorites()) return false;

        const normalizedId = Number(appId);
        if (!Number.isInteger(normalizedId)) return false;

        const userKey = getCurrentUserKey();
        if (!userKey) return false;

        const store = readStore();
        const currentIds = new Set(normalizeIds(store[userKey]));

        if (shouldBeFavorite) {
            currentIds.add(normalizedId);
        } else {
            currentIds.delete(normalizedId);
        }

        store[userKey] = [...currentIds];
        writeStore(store);
        notifyChanged();
        return shouldBeFavorite;
    }

    function toggleFavorite(appId) {
        const nextValue = !isFavorite(appId);
        return setFavorite(appId, nextValue);
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
        canUseFavorites,
        getIds,
        getCount,
        isFavorite,
        setFavorite,
        toggleFavorite,
    };
})();

window.Favorites = Favorites;
