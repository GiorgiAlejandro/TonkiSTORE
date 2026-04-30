// features.js
// Maneja el ABM de géneros y notifica cambios al formulario de productos.

const Features = (() => {
    const API_HOST = window.location.hostname || "127.0.0.1";
    const FEATURES_API_BASE_URL = `http://${API_HOST}:5000/api/genres`;

    let initialized = false;
    let modal = null;
    let form = null;
    let overlay = null;
    let closeBtn = null;
    let cancelBtn = null;
    let submitBtn = null;
    let addFeatureBtn = null;
    let featuresList = null;
    let featuresEmpty = null;
    let featuresMsg = null;
    let modalTitle = null;
    let inputName = null;
    let inputIcon = null;
    let errorName = null;
    let errorIcon = null;
    let generalError = null;

    let editingFeatureId = null;
    let allFeatures = [];

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => {
            switch (char) {
                case "&":
                    return "&amp;";
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                case '"':
                    return "&quot;";
                case "'":
                    return "&#39;";
                default:
                    return char;
            }
        });
    }

    function isImageLikeSource(value) {
        return /^(https?:\/\/|data:image\/)/i.test(String(value || "").trim());
    }

    function buildFeatureIconMarkup(icon) {
        const safeIcon = escapeHtml(icon);

        if (isImageLikeSource(icon)) {
            return `<img src="${safeIcon}" alt="" loading="lazy" onerror="this.remove()" />`;
        }

        return safeIcon;
    }

    function isAdminActive() {
        return Boolean(window.Auth?.isAuthenticated?.() && window.Auth?.isAdmin?.());
    }

    async function requestFeatures(path = "", options = {}) {
        const url = `${FEATURES_API_BASE_URL}${path}`;

        if (window.Auth && typeof window.Auth.requestJsonWithAuth === "function") {
            return window.Auth.requestJsonWithAuth(url, options);
        }

        const response = await fetch(url, options);
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
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        return data;
    }

    function notifyCatalogChanged() {
        window.dispatchEvent(
            new CustomEvent("features:changed", {
                detail: { features: [...allFeatures] },
            }),
        );
    }

    function showMsg(text, type) {
        if (!featuresMsg) return;

        featuresMsg.textContent = text;
        featuresMsg.className = `form-msg ${type}`;

        window.setTimeout(() => {
            featuresMsg.className = "form-msg";
        }, 4000);
    }

    function validateName(name) {
        const trimmed = name.trim();
        if (!trimmed) return { valid: false, error: "El nombre es requerido" };
        if (trimmed.length < 2) return { valid: false, error: "Minimo 2 caracteres" };
        return { valid: true };
    }

    function validateIcon(icon) {
        const trimmed = icon.trim();
        if (!trimmed) return { valid: false, error: "El icono es requerido" };
        return { valid: true };
    }

    function validateForm() {
        const errors = {};
        let valid = true;

        const validName = validateName(inputName.value);
        if (!validName.valid) {
            errors.name = validName.error;
            valid = false;
        }

        const validIcon = validateIcon(inputIcon.value);
        if (!validIcon.valid) {
            errors.icon = validIcon.error;
            valid = false;
        }

        return { valid, errors };
    }

    function displayErrors(errors) {
        errorName.textContent = errors.name || "";
        errorIcon.textContent = errors.icon || "";
        generalError.textContent = "";
    }

    function clearErrors() {
        errorName.textContent = "";
        errorIcon.textContent = "";
        generalError.textContent = "";
    }

    function clearForm() {
        form.reset();
        clearErrors();
        editingFeatureId = null;
    }

    function openModal(featureId = null) {
        if (!isAdminActive()) {
            showMsg("Solo un administrador puede gestionar géneros.", "error");
            return;
        }

        editingFeatureId = featureId;

        if (featureId) {
            modalTitle.textContent = "Editar género";
            const feature = allFeatures.find((item) => item.id === featureId);
            if (feature) {
                inputName.value = feature.name;
                inputIcon.value = feature.icon;
            }
        } else {
            modalTitle.textContent = "Agregar género";
            form.reset();
        }

        clearErrors();
        modal.classList.remove("modal--hidden");
        inputName.focus();
    }

    function closeModal() {
        modal.classList.add("modal--hidden");
        clearForm();
    }

    function renderAccessState() {
        const admin = isAdminActive();

        if (addFeatureBtn) {
            addFeatureBtn.disabled = !admin;
        }

        if (featuresList) {
            featuresList.querySelectorAll(".btn-edit, .btn-delete").forEach((button) => {
                button.disabled = !admin;
            });
        }

        if (!admin && modal && !modal.classList.contains("modal--hidden")) {
            closeModal();
        }
    }

    function renderFeaturesList() {
        featuresList.innerHTML = "";

        if (allFeatures.length === 0) {
            featuresEmpty.hidden = false;
            renderAccessState();
            return;
        }

        featuresEmpty.hidden = true;

        const container = document.createElement("div");
        container.className = "features-grid";

        allFeatures.forEach((feature) => {
            const item = document.createElement("div");
            item.className = "feature-item";

            item.innerHTML = `
                <div class="feature-item__content">
                    <div class="feature-item__icon">${buildFeatureIconMarkup(feature.icon)}</div>
                    <div class="feature-item__info">
                        <h4 class="feature-item__name">${escapeHtml(feature.name)}</h4>
                    </div>
                </div>
                <div class="feature-item__actions">
                    <button class="btn-edit" data-id="${feature.id}" type="button">Editar</button>
                    <button class="btn-delete" data-id="${feature.id}" type="button">Eliminar</button>
                </div>
            `;

            const editBtn = item.querySelector(".btn-edit");
            const deleteBtn = item.querySelector(".btn-delete");

            editBtn.addEventListener("click", () => openModal(feature.id));
            deleteBtn.addEventListener("click", () => handleDeleteFeature(feature.id, feature.name));

            container.appendChild(item);
        });

        featuresList.appendChild(container);
        renderAccessState();
    }

    async function loadFeatures() {
        try {
            const features = await requestFeatures();
            allFeatures = Array.isArray(features) ? features : [];
            renderFeaturesList();
            notifyCatalogChanged();
            return [...allFeatures];
        } catch (error) {
            allFeatures = [];
            renderFeaturesList();
            showMsg(error.message || "Error al cargar géneros.", "error");
            notifyCatalogChanged();
            return [];
        }
    }

    async function submitFeature(data) {
        const path = editingFeatureId ? `/${editingFeatureId}` : "";
        const method = editingFeatureId ? "PUT" : "POST";

        return requestFeatures(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    }

    async function deleteFeature(featureId) {
        return requestFeatures(`/${featureId}`, {
            method: "DELETE",
        });
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!isAdminActive()) {
            generalError.textContent = "Solo un administrador puede guardar cambios.";
            return;
        }

        const validation = validateForm();
        if (!validation.valid) {
            displayErrors(validation.errors);
            return;
        }

        clearErrors();
        submitBtn.disabled = true;
        submitBtn.textContent = editingFeatureId ? "Guardando..." : "Agregando...";

        const wasEditing = Boolean(editingFeatureId);
        const data = {
            name: inputName.value.trim(),
            icon: inputIcon.value.trim(),
        };

        submitFeature(data)
            .then(async () => {
                closeModal();
                await loadFeatures();
                showMsg(wasEditing ? "Género actualizado." : "Género agregado.", "success");
            })
            .catch((error) => {
                generalError.textContent = error.message || "No se pudo guardar el género.";
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = wasEditing ? "Guardar" : "Agregar";
            });
    }

    function handleDeleteFeature(featureId, featureName) {
        if (!isAdminActive()) {
            showMsg("Solo un administrador puede eliminar géneros.", "error");
            return;
        }

        const confirmed = window.confirm(`Eliminar el género "${featureName}"?`);
        if (!confirmed) return;

        deleteFeature(featureId)
            .then(async () => {
                await loadFeatures();
                showMsg("Género eliminado.", "success");
            })
            .catch((error) => {
                showMsg(error.message || "No se pudo eliminar el género.", "error");
            });
    }

    function bindEvents() {
        addFeatureBtn.addEventListener("click", () => openModal());
        closeBtn.addEventListener("click", closeModal);
        cancelBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });
        form.addEventListener("submit", handleSubmit);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && modal && !modal.classList.contains("modal--hidden")) {
                closeModal();
            }
        });

        window.addEventListener("auth:changed", () => {
            renderAccessState();
        });
    }

    function init() {
        if (initialized) return;

        modal = document.getElementById("featureModal");
        form = document.getElementById("featureForm");
        overlay = document.querySelector("#featureModal .modal__overlay");
        closeBtn = document.querySelector("#featureModal .modal__close");
        cancelBtn = document.getElementById("featureCancelBtn");
        submitBtn = document.getElementById("featureSubmitBtn");
        addFeatureBtn = document.getElementById("addFeatureBtn");
        featuresList = document.getElementById("featuresList");
        featuresEmpty = document.getElementById("featuresAdminEmpty");
        featuresMsg = document.getElementById("featuresMsg");
        modalTitle = document.getElementById("featureModalTitle");
        inputName = document.getElementById("featureName");
        inputIcon = document.getElementById("featureIcon");
        errorName = document.getElementById("errorFeatureName");
        errorIcon = document.getElementById("errorFeatureIcon");
        generalError = document.getElementById("featureGeneralError");

        if (!modal || !form || !featuresList || !featuresEmpty || !addFeatureBtn) {
            return;
        }

        initialized = true;
        bindEvents();
        renderAccessState();
        loadFeatures();
    }

    function getAll() {
        return [...allFeatures];
    }

    async function refresh() {
        return loadFeatures();
    }

    return { init, getAll, refresh };
})();

window.Features = Features;

document.addEventListener("DOMContentLoaded", () => {
    window.Features.init();
});
