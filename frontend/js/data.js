// data.js
// API client + data mappers for the frontend.

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE_URL = `http://${API_HOST}:5000/api`;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80";

/** @type {Product[]} */
let products = [];

function _buildOriginalPrice(priceUsd, discountPct) {
    if (!discountPct || discountPct <= 0 || discountPct >= 100) return null;
    const raw = priceUsd / (1 - discountPct / 100);
    return Math.round(raw * 100) / 100;
}

function mapGameToProduct(game) {
    const price = Number(game.price_usd ?? 0);
    const discount = Number(game.discount_pct ?? 0);
    const genre = (game.genre || "").trim();
    const tags = Array.isArray(game.tags) ? game.tags : [];
    const mergedTags = genre && !tags.includes(genre) ? [genre, ...tags] : tags;

    return {
        id: game.app_id,
        title: game.name,
        publisher: genre || "Editorial no disponible",
        tags: mergedTags,
        price,
        originalPrice: _buildOriginalPrice(price, discount),
        discount: discount || null,
        releaseDate: game.release_date || "Fecha no disponible",
        description: `Juego del genero ${genre || "general"} disponible en catalogo.`,
        image: game.image_url || game.image || FALLBACK_IMAGE,
    };
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
            // keep original text when response is not JSON
        }
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return response.json();
}

async function fetchGames() {
    const games = await _fetchJson(`${API_BASE_URL}/games`);
    products = games.map(mapGameToProduct);
    return products;
}

async function searchGames(query) {
    const q = query.trim();
    if (!q) return fetchGames();

    const games = await _fetchJson(`${API_BASE_URL}/games?q=${encodeURIComponent(q)}`);
    products = games.map(mapGameToProduct);
    return products;
}

async function getProductById(id) {
    const game = await _fetchJson(`${API_BASE_URL}/games/${id}`);
    return mapGameToProduct(game);
}

async function createGame(payload) {
    return _fetchJson(`${API_BASE_URL}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

/** Formats a numeric price into "$XX.XX" string. */
function formatPrice(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

window.fetchGames = fetchGames;
window.searchGames = searchGames;
window.getProductById = getProductById;
window.createGame = createGame;
