// data.js
// API client + data mappers for the frontend.

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE_URL = `http://${API_HOST}:5000/api`;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80";
const PRODUCT_OVERRIDES_STORAGE_KEY = "tonkistore.productOverrides";

/** @type {Product[]} */
let products = [];
/** @type {Product[]} */
let catalogProducts = [];

function mapGameFeature(feature) {
    if (!feature || typeof feature !== "object") return null;

    const name = typeof feature.name === "string" ? feature.name.trim() : "";
    const icon = typeof feature.icon === "string" ? feature.icon.trim() : "";

    if (!name) return null;

    return {
        id: Number(feature.id) || name,
        name,
        icon,
    };
}

function _buildOriginalPrice(priceUsd, discountPct) {
    if (!discountPct || discountPct <= 0 || discountPct >= 100) return null;
    const raw = priceUsd / (1 - discountPct / 100);
    return Math.round(raw * 100) / 100;
}

function _readProductOverrides() {
    try {
        const raw = window.localStorage.getItem(PRODUCT_OVERRIDES_STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function _writeProductOverrides(overrides) {
    try {
        window.localStorage.setItem(PRODUCT_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
        // Ignore storage errors to avoid blocking the UI.
    }
}

function _normalizeOverride(override) {
    if (!override || typeof override !== "object") return {};

    const normalized = {};

    if (typeof override.description === "string" && override.description.trim()) {
        normalized.description = override.description.trim();
    }

    if (typeof override.image === "string" && override.image.trim()) {
        normalized.image = override.image.trim();
    }

    return normalized;
}

function _applyProductOverride(product) {
    const overrides = _readProductOverrides();
    const override = _normalizeOverride(overrides[String(product.id)]);

    return {
        ...product,
        ...override,
    };
}

function saveProductOverrides(appId, override) {
    const normalized = _normalizeOverride(override);
    if (!appId || Object.keys(normalized).length === 0) return;

    const overrides = _readProductOverrides();
    overrides[String(appId)] = {
        ...(overrides[String(appId)] || {}),
        ...normalized,
    };

    _writeProductOverrides(overrides);
}

function mapGameToProduct(game) {
    // Accept either 'price_usd' or legacy 'price' fields and coerce to number
    const price = Number(game.price_usd ?? game.price ?? 0) || 0;
    const discount = Number(game.discount_pct ?? 0);
    const rawGenre = game.genre;
    const genre = rawGenre && typeof rawGenre === "object" ? rawGenre.name || "" : game.genre || "";
    const tags = Array.isArray(game.tags) ? game.tags.filter(Boolean) : [];
    const features = Array.isArray(game.features) ? game.features.map(mapGameFeature).filter(Boolean) : [];
    const mergedTags = tags;
    const description = typeof game.description === "string" && game.description.trim() ? game.description.trim() : typeof game.desc === "string" && game.desc.trim() ? game.desc.trim() : `Juego del genero ${genre || "general"} disponible en catalogo.`;

    const product = {
        id: game.app_id,
        title: game.name,
        publisher: game.publisher || game.developer || "Editorial no disponible",
        tags: mergedTags,
        price,
        originalPrice: _buildOriginalPrice(price, discount),
        discount: discount || null,
        releaseDate: game.release_date || "Fecha no disponible",
        description,
        image: game.image || game.image_url || FALLBACK_IMAGE,
        features,
    };

    return _applyProductOverride(product);
}

async function _fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        let detail = text;
        try {
            const parsed = JSON.parse(text);
            detail = parsed.error || parsed.message || text;
        } catch {
            // Keep original text when response is not JSON.
        }
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return response.json();
}

async function fetchGames() {
    const games = await _fetchJson(`${API_BASE_URL}/games`);
    products = games.map(mapGameToProduct);
    catalogProducts = [...products];
    // Notify listeners that product list updated
    try {
        window.dispatchEvent(new CustomEvent("products:updated", { detail: { count: products.length } }));
    } catch {}
    return products;
}

async function searchGames(query) {
    const q = query.trim();
    if (!q) return fetchGames();

    const games = await _fetchJson(`${API_BASE_URL}/games?q=${encodeURIComponent(q)}`);
    products = games.map(mapGameToProduct);
    try {
        window.dispatchEvent(new CustomEvent("products:updated", { detail: { count: products.length } }));
    } catch {}
    return products;
}

async function getGameFeatures(appId) {
    try {
        const features = await _fetchJson(`${API_BASE_URL}/games/${appId}/features`);
        return Array.isArray(features) ? features : [];
    } catch {
        return [];
    }
}

async function getProductById(id) {
    const [game, features] = await Promise.all([_fetchJson(`${API_BASE_URL}/games/${id}`), getGameFeatures(id)]);
    return mapGameToProduct({ ...game, features });
}

async function createGame(payload) {
    const headers = { "Content-Type": "application/json" };

    if (window.Auth && typeof window.Auth.getAuthHeaders === "function") {
        Object.assign(headers, window.Auth.getAuthHeaders());
    }

    return _fetchJson(`${API_BASE_URL}/games`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
}

function formatPrice(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

function getCatalogProducts() {
    return [...catalogProducts];
}

window.fetchGames = fetchGames;
window.searchGames = searchGames;
window.getProductById = getProductById;
window.createGame = createGame;
window.saveProductOverrides = saveProductOverrides;
window.getCatalogProducts = getCatalogProducts;
window.getFallbackImage = () => FALLBACK_IMAGE;
