// in-memory snapshot from backend for duplicate-name checks
let adminProducts = [];

async function loadAdminProducts() {
    try {
        if (typeof window.fetchGames !== "function") {
            throw new Error("fetchGames no esta disponible en window");
        }
        adminProducts = await window.fetchGames();
    } catch (error) {
        adminProducts = [];
        console.warn("No se pudo cargar adminProducts:", error);
    }
}

loadAdminProducts();

// ── image preview ────────────────────────────────────────────────
document.getElementById("fieldImages").addEventListener("change", function () {
    const previews = document.getElementById("imagePreviews");
    previews.innerHTML = "";
    Array.from(this.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement("img");
            img.className = "image-preview";
            img.src = e.target.result;
            previews.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// ── feedback helper ──────────────────────────────────────────────
function showMsg(text, type) {
    const el = document.getElementById("formMsg");
    el.textContent = text;
    el.className = `form-msg ${type}`;
    setTimeout(() => {
        el.className = "form-msg";
    }, 4000);
}
// ── submit ───────────────────────────────────────────────────────
document.getElementById("submitBtn").addEventListener("click", async () => {
    const name = document.getElementById("fieldName").value.trim();
    const desc = document.getElementById("fieldDesc").value.trim();
    const price = parseFloat(document.getElementById("fieldPrice").value);
    const original = parseFloat(document.getElementById("fieldOriginal").value) || null;
    const tagsRaw = document.getElementById("fieldTags").value.trim();
    const release = document.getElementById("fieldRelease").value.trim();
    const files = document.getElementById("fieldImages").files;

    if (!name) {
        showMsg("El nombre es obligatorio.", "error");
        return;
    }
    if (!desc) {
        showMsg("La descripción es obligatoria.", "error");
        return;
    }
    if (isNaN(price) || price <= 0) {
        showMsg("Ingresá un precio válido.", "error");
        return;
    }

    // duplicate name check (sprint requirement)
    const exists = adminProducts.some((p) => p.title.toLowerCase() === name.toLowerCase());
    if (exists) {
        showMsg(`Ya existe un producto llamado "${name}".`, "error");
        return;
    }

    const tags = tagsRaw
        ? tagsRaw
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
        : [];

    const safeOriginal = original && original > price ? original : null;
    const discount = safeOriginal ? Math.round((1 - price / safeOriginal) * 100) : 0;

    const payload = {
        app_id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        release_date: release || null,
        genre: tags[0] || null,
        price_usd: price,
        discount_pct: discount,
        tags,
    };

    try {
        if (typeof window.createGame !== "function") {
            throw new Error("createGame no esta disponible en window");
        }
        const created = await window.createGame(payload);
        const createdId = created?.game?.app_id ?? payload.app_id;

        if (typeof window.getProductById === "function") {
            await window.getProductById(createdId);
        }

        await loadAdminProducts();
        resetForm();
    } catch (error) {
        const detail = error instanceof Error ? error.message : "Error desconocido";
        showMsg(`No se pudo guardar el producto: ${detail}`, "error");
    }
});

// ── reset ────────────────────────────────────────────────────────
function resetForm() {
    ["fieldName", "fieldDesc", "fieldPrice", "fieldOriginal", "fieldTags", "fieldRelease"].forEach((id) => {
        document.getElementById(id).value = "";
    });
    document.getElementById("fieldImages").value = "";
    document.getElementById("imagePreviews").innerHTML = "";
}
