const ADMIN_API_HOST = window.location.hostname || "127.0.0.1";
const USERS_API_BASE_URL = `http://${ADMIN_API_HOST}:5000/api/users`;
const TAGS_API_BASE_URL = `http://${ADMIN_API_HOST}:5000/api/tags`;
const GAMES_API_BASE_URL = `http://${ADMIN_API_HOST}:5000/api/games`;

const PAGE_SIZE = 10;

document.addEventListener("DOMContentLoaded", async () => {
    await window.Auth.init();

    const loginModal = document.getElementById("loginModal");
    const adminPage = document.getElementById("adminPage");

    document.getElementById("loginCancelBtn")?.addEventListener("click", () => {
        window.location.replace("index.html");
    });

    function updatePageVisibility() {
        const isAuthenticated = window.Auth.isAuthenticated();
        const isAdmin = window.Auth.isAdmin();

        if (!isAuthenticated) {
            loginModal?.removeAttribute("hidden");
            if (adminPage) adminPage.hidden = true;
            return false;
        }

        if (!isAdmin) {
            window.location.replace("index.html");
            return false;
        }

        loginModal?.setAttribute("hidden", "");
        if (adminPage) adminPage.hidden = false;
        return true;
    }

    window.addEventListener("auth:changed", () => {
        if (window.Auth.isAuthenticated() && window.Auth.isAdmin()) {
            window.location.reload();
        }
    });

    if (!updatePageVisibility()) return;

    // ─── Estado ──────────────────────────────────────────────────────
    const state = {
        products: [],
        users: [],
        features: [],
        availableGenres: [],
        selectedGenres: [],
        currentPage: 1,
        currentUsersPage: 1,
        currentUserId: null,
        editingProductId: null,
    };

    // ─── Refs ─────────────────────────────────────────────────────────
    const refs = {
        accessNotice: document.getElementById("adminAccessNotice"),
        accessNoticeText: document.getElementById("adminAccessNoticeText"),
        productsTableBody: document.getElementById("productsTableBody"),
        productsEmpty: document.getElementById("productsEmpty"),
        productsMsg: document.getElementById("productsMsg"),
        productsSearchInput: document.getElementById("productsSearchInput"),
        refreshProductsBtn: document.getElementById("refreshProductsBtn"),
        usersTableBody: document.getElementById("usersTableBody"),
        usersEmpty: document.getElementById("usersEmpty"),
        usersMsg: document.getElementById("usersMsg"),
        usersSearchInput: document.getElementById("usersSearchInput"),
        refreshUsersBtn: document.getElementById("refreshUsersBtn"),
        usersPagination: document.getElementById("usersPagination"),
        usersPaginationPrev: document.getElementById("usersPaginationPrev"),
        usersPaginationNext: document.getElementById("usersPaginationNext"),
        usersPaginationInfo: document.getElementById("usersPaginationInfo"),
        pagination: document.getElementById("productsPagination"),
        paginationPrev: document.getElementById("paginationPrev"),
        paginationNext: document.getElementById("paginationNext"),
        paginationInfo: document.getElementById("paginationInfo"),
        addProductBtn: document.getElementById("addProductBtn"),
        // Modal
        productModal: document.getElementById("productModal"),
        productModalTitle: document.getElementById("productModalTitle"),
        productModalMsg: document.getElementById("productModalMsg"),
        productModalClose: document.getElementById("productModalClose"),
        productModalCancel: document.getElementById("productModalCancel"),
        productModalOverlay: document.getElementById("productModalOverlay"),
        submitBtn: document.getElementById("submitBtn"),
        // Form fields
        fieldName: document.getElementById("fieldName"),
        fieldDesc: document.getElementById("fieldDesc"),
        fieldPrice: document.getElementById("fieldPrice"),
        fieldOriginal: document.getElementById("fieldOriginal"),
        fieldRelease: document.getElementById("fieldRelease"),
        fieldImages: document.getElementById("fieldImages"),
        imagePreviews: document.getElementById("imagePreviews"),
        // Genre picker
        genreTags: document.getElementById("genreTags"),
        genreInputWrap: document.getElementById("genreInputWrap"),
        genreInput: document.getElementById("fieldGenreInput"),
        genreDropdown: document.getElementById("genreDropdown"),
    };

    // ─── Helpers ──────────────────────────────────────────────────────
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
    }

    function isImageLikeSource(value) {
        return /^(https?:\/\/|data:image\/)/i.test(String(value || "").trim());
    }

    function productId(product) {
        // La API devuelve app_id; algunos objetos locales pueden tener id
        return product.app_id ?? product.id;
    }

    function showMsg(element, text, type) {
        if (!element) return;
        element.textContent = text;
        element.className = `form-msg ${type}`;
        window.setTimeout(() => {
            element.className = "form-msg";
        }, 4000);
    }

    function showProductsMsg(text, type) {
        showMsg(refs.productsMsg, text, type);
    }
    function showUsersMsg(text, type) {
        showMsg(refs.usersMsg, text, type);
    }
    function showModalMsg(text, type) {
        showMsg(refs.productModalMsg, text, type);
    }

    function isAdminActive() {
        return !window.Auth.isAuthenticated() || window.Auth.isAdmin();
    }

    function normalizeGenreName(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");
    }

    // ─── API wrappers ─────────────────────────────────────────────────
    async function requestTags(path = "", options = {}) {
        const url = `${TAGS_API_BASE_URL}${path}`;
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
        return data;
    }

    async function requestGames(path = "", options = {}) {
        return window.Auth.requestJsonWithAuth(`${GAMES_API_BASE_URL}${path}`, options);
    }

    async function requestUsers(path = "", options = {}) {
        return window.Auth.requestJsonWithAuth(`${USERS_API_BASE_URL}${path}`, options);
    }

    // ─── Tags: catálogo ────────────────────────────────────────────
    async function loadTagsCatalog() {
        try {
            const features = await requestTags();
            state.features = Array.isArray(features) ? features : [];
            console.log("═══════════════════════════════════════════════════════");
            console.log("  TAGS CARGADOS DEL BACKEND");
            console.log("═══════════════════════════════════════════════════════");
            console.log("Total de TAGS:", state.features.length);
            console.log("Lista de TAGS:");
            state.features.forEach((tag) => {
                console.log(`  • ${tag.name} (id: ${tag.id}, icon: ${tag.icon})`);
            });
            console.log(
                "Todos los nombres:",
                state.features.map((g) => g.name),
            );
            console.log("Tabla completa:");
            console.table(state.features);
            console.log("═══════════════════════════════════════════════════════");
            renderGenreOptions();
        } catch (err) {
            state.features = [];
            console.error("✗ Error cargando tags:", err);
        }
    }

    // ─── Tags: opciones y dropdown personalizado ─────────────────────
    function renderGenreOptions() {
        // Construir lista interna de nombres disponibles (excluye seleccionados)
        const selectedNames = new Set(state.selectedGenres.map((n) => String(n || "").toLowerCase()));
        state.availableGenres = state.features.map((f) => String(f.name || "").trim()).filter((n) => n && !selectedNames.has(n.toLowerCase()));
        console.log("✓ Opciones disponibles de tags:", state.availableGenres.length, state.availableGenres);
        if (refs.genreInput?.matches(":focus") || String(refs.genreInput?.value || "").trim()) {
            renderGenreDropdown(refs.genreInput?.value || "");
        } else if (refs.genreDropdown) {
            refs.genreDropdown.hidden = true;
            refs.genreDropdown.innerHTML = "";
        }
    }

    function renderGenreDropdown(filter = "") {
        const dropdown = document.getElementById("genreDropdown");
        if (!dropdown) return;

        const normalized = String(filter || "")
            .trim()
            .toLowerCase();
        const matches = normalized ? state.availableGenres.filter((n) => n.toLowerCase().includes(normalized)) : state.availableGenres.slice();

        dropdown.innerHTML = "";
        if (matches.length === 0) {
            dropdown.hidden = true;
            return;
        }

        const fragment = document.createDocumentFragment();
        matches.forEach((name) => {
            const li = document.createElement("div");
            li.className = "genre-option";
            li.setAttribute("role", "option");
            li.dataset.genreName = name;
            li.textContent = name;
            fragment.appendChild(li);
        });

        dropdown.appendChild(fragment);
        dropdown.hidden = false;
    }

    function addGenreByName(rawValue) {
        const normalized = normalizeGenreName(rawValue);
        if (!normalized) return false;

        const existingCatalog = state.features.find((f) => f.name.toLowerCase() === normalized.toLowerCase());
        const finalName = existingCatalog?.name || normalized;
        const alreadySelected = state.selectedGenres.some((name) => name.toLowerCase() === finalName.toLowerCase());
        if (alreadySelected) return false;

        state.selectedGenres.push(finalName);
        renderSelectedGenres();
        return true;
    }

    function removeGenreByName(nameToRemove) {
        state.selectedGenres = state.selectedGenres.filter((name) => name.toLowerCase() !== String(nameToRemove || "").toLowerCase());
        renderSelectedGenres();
    }

    function renderSelectedGenres() {
        if (!refs.genreTags) return;

        refs.genreTags.innerHTML = "";
        state.selectedGenres.forEach((name) => {
            const chip = document.createElement("span");
            chip.className = "genre-tag";
            chip.innerHTML = `${escapeHtml(name)}<button type="button" class="genre-tag__remove" data-genre-remove="${escapeHtml(name)}" aria-label="Quitar género">×</button>`;
            refs.genreTags.appendChild(chip);
        });
        // Actualizar opciones sin abrir el dropdown automáticamente
        renderGenreOptions();
    }

    // ─── Productos: carga ─────────────────────────────────────────────
    async function loadProducts(query = "") {
        try {
            let url = GAMES_API_BASE_URL;
            if (query) url += `/search?q=${encodeURIComponent(query)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error al cargar productos");

            const data = await res.json();
            state.products = Array.isArray(data) ? data : [];
            state.currentPage = 1;
            renderProducts();
        } catch (err) {
            showProductsMsg("Error al cargar productos: " + err.message, "error");
            state.products = [];
            renderProducts();
        }
    }

    // ─── Usuarios: carga y render ────────────────────────────────────
    async function loadUsers(query = "") {
        try {
            const response = await requestUsers();
            state.users = Array.isArray(response?.users) ? response.users : [];
            state.currentUserId = response?.current_user?.id ?? null;
            state.currentUsersPage = 1;
            renderUsers(query);
        } catch (err) {
            state.users = [];
            state.currentUsersPage = 1;
            renderUsers(query);
            showUsersMsg("Error al cargar usuarios: " + err.message, "error");
        }
    }

    function renderUsers(query = "") {
        if (!refs.usersTableBody || !refs.usersEmpty) return;

        refs.usersTableBody.innerHTML = "";
        const normalized = query.trim().toLowerCase();
        const users = normalized
            ? state.users.filter((u) => {
                  const fullName = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
                  const email = String(u.email || "").toLowerCase();
                  return fullName.includes(normalized) || email.includes(normalized);
              })
            : state.users;

        if (users.length === 0) {
            refs.usersEmpty.hidden = false;
            if (refs.usersPagination) refs.usersPagination.hidden = true;
            return;
        }

        refs.usersEmpty.hidden = true;
        const totalPages = Math.ceil(users.length / PAGE_SIZE);
        state.currentUsersPage = Math.min(Math.max(state.currentUsersPage, 1), totalPages);
        const start = (state.currentUsersPage - 1) * PAGE_SIZE;
        const pageUsers = users.slice(start, start + PAGE_SIZE);

        const fragment = document.createDocumentFragment();

        pageUsers.forEach((user) => {
            const tr = document.createElement("tr");
            tr.className = "products-table__row";
            const isCurrentUser = Number(user.id) === Number(state.currentUserId);
            const roleClass = user.is_admin ? "users-table__role users-table__role--admin" : "users-table__role users-table__role--user";
            const roleText = user.is_admin ? "Admin" : "Usuario";
            const nextAdmin = !user.is_admin;
            const actionLabel = nextAdmin ? "Dar admin" : "Quitar admin";
            const actionClass = nextAdmin ? "btn-toggle-admin btn-toggle-admin--grant" : "btn-toggle-admin btn-toggle-admin--revoke";

            tr.innerHTML = `
                <td class="col-user-name"><span class="users-table__name">${escapeHtml(user.nombre || "")} ${escapeHtml(user.apellido || "")}</span></td>
                <td class="col-user-email">${escapeHtml(user.email || "")}</td>
                <td class="col-user-role"><span class="${roleClass}">${roleText}</span></td>
                <td class="col-user-actions">
                    <button
                        class="${actionClass}"
                        data-user-id="${user.id}"
                        data-next-admin="${nextAdmin}"
                        ${isCurrentUser ? "disabled" : ""}
                    >
                        ${isCurrentUser ? "Tu cuenta" : actionLabel}
                    </button>
                </td>
            `;
            fragment.appendChild(tr);
        });

        refs.usersTableBody.appendChild(fragment);

        if (refs.usersPagination) {
            refs.usersPagination.hidden = totalPages <= 1;
            if (refs.usersPaginationInfo) refs.usersPaginationInfo.textContent = `${state.currentUsersPage} / ${totalPages}`;
            if (refs.usersPaginationPrev) refs.usersPaginationPrev.disabled = state.currentUsersPage === 1;
            if (refs.usersPaginationNext) refs.usersPaginationNext.disabled = state.currentUsersPage === totalPages;
        }
    }

    // ─── Productos: render ────────────────────────────────────────────
    function renderProducts() {
        if (!refs.productsTableBody || !refs.productsEmpty) return;

        refs.productsTableBody.innerHTML = "";

        if (state.products.length === 0) {
            refs.productsEmpty.hidden = false;
            if (refs.pagination) refs.pagination.hidden = true;
            return;
        }

        refs.productsEmpty.hidden = true;

        const totalPages = Math.ceil(state.products.length / PAGE_SIZE);
        state.currentPage = Math.min(Math.max(state.currentPage, 1), totalPages);

        const start = (state.currentPage - 1) * PAGE_SIZE;
        const pageItems = state.products.slice(start, start + PAGE_SIZE);

        const fragment = document.createDocumentFragment();

        pageItems.forEach((product) => {
            const pid = productId(product);

            // Bug 1 fix: leer imagen desde overrides locales O desde el objeto
            const overrides = window.getProductOverrides?.(pid) ?? {};
            const image = overrides.image || product.image || product.image_url || product.header_image || (Array.isArray(product.images) ? product.images[0] : null) || "";

            const imageHtml = image ? `<img class="products-table__thumb" src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : `<div class="products-table__thumb products-table__thumb--empty"></div>`;

            const genreName = product.genre?.name || "—";
            const genreIcon = product.genre?.icon ? (isImageLikeSource(product.genre.icon) ? `<img src="${escapeHtml(product.genre.icon)}" alt="" class="products-table__genre-icon" />` : `<span class="products-table__genre-emoji">${escapeHtml(product.genre.icon)}</span>`) : "";

            const discountHtml = product.discount_pct ? `<span class="products-table__discount">-${product.discount_pct}%</span>` : `<span class="products-table__nodiscount">—</span>`;

            const tr = document.createElement("tr");
            tr.className = "products-table__row";
            // Bug 2 fix: usar pid (app_id) como identificador en los botones
            tr.innerHTML = `
                <td class="col-img">${imageHtml}</td>
                <td class="col-name">
                    <span class="products-table__name">${escapeHtml(product.name)}</span>
                    ${product.release_date ? `<span class="products-table__release">${escapeHtml(product.release_date)}</span>` : ""}
                </td>
                <td class="col-genre">
                    <span class="products-table__genre">${genreIcon}${escapeHtml(genreName)}</span>
                </td>
                <td class="col-price">
                    <span class="products-table__price">$${product.price_usd?.toFixed(2) || "0.00"}</span>
                </td>
                <td class="col-discount">${discountHtml}</td>
                <td class="col-actions">
                    <div class="products-table__actions">
                        <button class="btn-edit-product" data-product-id="${pid}" title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                        </button>
                        <button class="btn-delete-product" data-product-id="${pid}" title="Eliminar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                            </svg>
                            Eliminar
                        </button>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        });

        refs.productsTableBody.appendChild(fragment);

        if (refs.pagination) {
            refs.pagination.hidden = totalPages <= 1;
            if (refs.paginationInfo) refs.paginationInfo.textContent = `${state.currentPage} / ${totalPages}`;
            if (refs.paginationPrev) refs.paginationPrev.disabled = state.currentPage === 1;
            if (refs.paginationNext) refs.paginationNext.disabled = state.currentPage === totalPages;
        }
    }

    // ─── Modal: abrir / cerrar ────────────────────────────────────────
    async function openProductModal(product = null) {
        if (!refs.productModal) return;

        // Cargar los tags disponibles para el datalist
        await loadTagsCatalog();

        state.editingProductId = product ? productId(product) : null;

        if (refs.productModalTitle) refs.productModalTitle.textContent = product ? "Editar producto" : "Agregar producto";
        if (refs.submitBtn) refs.submitBtn.textContent = product ? "Guardar cambios" : "Guardar producto";
        if (refs.productModalMsg) refs.productModalMsg.className = "form-msg";

        if (refs.fieldName) refs.fieldName.value = product?.name || "";
        if (refs.fieldDesc) refs.fieldDesc.value = product?.description || window.getProductOverrides?.(productId(product))?.description || "";
        if (refs.fieldPrice) refs.fieldPrice.value = product?.price_usd || "";
        if (refs.fieldRelease) refs.fieldRelease.value = product?.release_date || "";
        if (refs.fieldImages) refs.fieldImages.value = "";
        if (refs.imagePreviews) refs.imagePreviews.innerHTML = "";

        if (refs.fieldOriginal) {
            if (product?.price_usd && product?.discount_pct) {
                refs.fieldOriginal.value = (product.price_usd / (1 - product.discount_pct / 100)).toFixed(2);
            } else {
                refs.fieldOriginal.value = "";
            }
        }

        const currentTags = Array.isArray(product?.tags) ? product.tags : [];
        state.selectedGenres = currentTags.length > 0 ? currentTags.slice() : product?.genre?.name ? [product.genre.name] : [];
        renderSelectedGenres();
        if (refs.genreInput) refs.genreInput.value = "";
        if (refs.genreDropdown) {
            refs.genreDropdown.hidden = true;
            refs.genreDropdown.innerHTML = "";
        }

        refs.productModal.classList.remove("modal--hidden");
        document.body.style.overflow = "hidden";
        setTimeout(() => refs.fieldName?.focus(), 50);
    }

    function closeProductModal() {
        refs.productModal?.classList.add("modal--hidden");
        document.body.style.overflow = "";
        state.editingProductId = null;
        state.selectedGenres = [];
        renderSelectedGenres();
        if (refs.genreInput) refs.genreInput.value = "";
        if (refs.genreDropdown) {
            refs.genreDropdown.hidden = true;
            refs.genreDropdown.innerHTML = "";
        }
    }

    // ─── Modal: guardar (Bug 2 fix: POST vs PUT) ──────────────────────
    refs.submitBtn?.addEventListener("click", async () => {
        if (!isAdminActive()) {
            showModalMsg("Necesitas permisos de administrador para guardar productos.", "error");
            return;
        }

        const name = refs.fieldName?.value.trim() || "";
        const desc = refs.fieldDesc?.value.trim() || "";
        const price = parseFloat(refs.fieldPrice?.value || "");
        const original = parseFloat(refs.fieldOriginal?.value || "") || null;
        const release = refs.fieldRelease?.value.trim() || "";

        if (!name) {
            showModalMsg("El nombre es obligatorio.", "error");
            return;
        }
        if (!desc) {
            showModalMsg("La descripción es obligatoria.", "error");
            return;
        }
        if (Number.isNaN(price) || price <= 0) {
            showModalMsg("Ingresa un precio válido.", "error");
            return;
        }

        if (!state.editingProductId) {
            const dup = state.products.some((p) => p.name?.toLowerCase() === name.toLowerCase());
            if (dup) {
                showModalMsg(`Ya existe un producto llamado "${name}".`, "error");
                return;
            }
        }

        const typedGenre = refs.genreInput?.value.trim() || "";
        if (typedGenre) {
            addGenreByName(typedGenre);
            if (refs.genreInput) refs.genreInput.value = "";
        }

        if (state.selectedGenres.length === 0) {
            showModalMsg("El género es obligatorio.", "error");
            return;
        }

        const safeOriginal = original && original > price ? original : null;
        const discount = safeOriginal ? Math.round((1 - price / safeOriginal) * 100) : 0;

        if (refs.submitBtn) {
            refs.submitBtn.disabled = true;
            refs.submitBtn.textContent = "Guardando...";
        }

        try {
            const primaryImageFile = refs.fieldImages?.files?.[0] || null;
            let imageDataUrl = null;
            if (primaryImageFile) {
                imageDataUrl = await readFileAsDataUrl(primaryImageFile);
            }

            if (state.editingProductId) {
                // ── EDITAR (PUT) ──────────────────────────────────────
                const payload = {
                    name,
                    release_date: release || null,
                    price_usd: price,
                    discount_pct: discount,
                    tags: state.selectedGenres,
                };
                await requestGames(`/${state.editingProductId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const overrides = { description: desc };
                if (imageDataUrl) overrides.image = imageDataUrl;
                if (typeof window.saveProductOverrides === "function") {
                    window.saveProductOverrides(state.editingProductId, overrides);
                }
            } else {
                // ── CREAR (POST) ──────────────────────────────────────
                const newId = Date.now() + Math.floor(Math.random() * 1000);
                const payload = {
                    app_id: newId,
                    name,
                    release_date: release || null,
                    price_usd: price,
                    discount_pct: discount,
                    tags: state.selectedGenres,
                };
                const created = await requestGames("", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const createdId = created?.game?.app_id ?? newId;

                const overrides = { description: desc };
                if (imageDataUrl) overrides.image = imageDataUrl;
                if (typeof window.saveProductOverrides === "function") {
                    window.saveProductOverrides(createdId, overrides);
                }
            }

            closeProductModal();
            await loadProducts(refs.productsSearchInput?.value.trim() || "");
            showProductsMsg("Producto guardado correctamente.", "success");
        } catch (err) {
            await window.Auth.refreshCurrentUser?.();
            showModalMsg(`No se pudo guardar el producto: ${err.message || "Error desconocido"}`, "error");
        } finally {
            if (refs.submitBtn) {
                refs.submitBtn.disabled = false;
                refs.submitBtn.textContent = state.editingProductId ? "Guardar cambios" : "Guardar producto";
            }
        }
    });

    // ─── Tabla: editar / eliminar ─────────────────────────────────────
    refs.productsTableBody?.addEventListener("click", async (event) => {
        const editBtn = event.target.closest(".btn-edit-product");
        const deleteBtn = event.target.closest(".btn-delete-product");

        if (editBtn) {
            // Bug 2 fix: buscar por app_id
            const product = state.products.find((p) => String(productId(p)) === String(editBtn.dataset.productId));
            if (product) await openProductModal(product);
        }

        if (deleteBtn) {
            const product = state.products.find((p) => String(productId(p)) === String(deleteBtn.dataset.productId));
            if (!product || !confirm(`¿Eliminar "${product.name}"?`)) return;

            deleteBtn.disabled = true;
            deleteBtn.textContent = "Eliminando...";

            try {
                await requestGames(`/${productId(product)}`, { method: "DELETE" });
                showProductsMsg("Producto eliminado correctamente.", "success");
                await loadProducts(refs.productsSearchInput?.value.trim() || "");
            } catch (err) {
                showProductsMsg("Error al eliminar: " + err.message, "error");
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Eliminar";
            }
        }
    });

    refs.usersTableBody?.addEventListener("click", async (event) => {
        const btn = event.target.closest(".btn-toggle-admin");
        if (!btn || btn.disabled) return;

        const userId = Number(btn.dataset.userId);
        const nextAdmin = String(btn.dataset.nextAdmin) === "true";
        if (!userId) return;

        btn.disabled = true;
        const previousText = btn.textContent;
        btn.textContent = "Guardando...";

        try {
            await requestUsers(`/${userId}/admin`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_admin: nextAdmin }),
            });
            showUsersMsg(nextAdmin ? "Permiso admin otorgado." : "Permiso admin quitado.", "success");
            await loadUsers(refs.usersSearchInput?.value.trim() || "");
        } catch (err) {
            showUsersMsg("No se pudo actualizar el usuario: " + err.message, "error");
            btn.disabled = false;
            btn.textContent = previousText;
        }
    });

    // ─── Controles: búsqueda, refresh, paginación ─────────────────────
    refs.productsSearchInput?.addEventListener("input", (e) => loadProducts(e.target.value.trim()));
    refs.refreshProductsBtn?.addEventListener("click", () => loadProducts(refs.productsSearchInput?.value.trim() || ""));
    refs.usersSearchInput?.addEventListener("input", (e) => {
        state.currentUsersPage = 1;
        renderUsers(e.target.value.trim());
    });
    refs.refreshUsersBtn?.addEventListener("click", () => loadUsers(refs.usersSearchInput?.value.trim() || ""));

    refs.usersPaginationPrev?.addEventListener("click", () => {
        if (state.currentUsersPage > 1) {
            state.currentUsersPage--;
            renderUsers(refs.usersSearchInput?.value.trim() || "");
        }
    });
    refs.usersPaginationNext?.addEventListener("click", () => {
        const query = refs.usersSearchInput?.value.trim() || "";
        const normalized = query.toLowerCase();
        const filteredCount = normalized
            ? state.users.filter((u) => {
                  const fullName = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
                  const email = String(u.email || "").toLowerCase();
                  return fullName.includes(normalized) || email.includes(normalized);
              }).length
            : state.users.length;
        const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

        if (state.currentUsersPage < totalPages) {
            state.currentUsersPage++;
            renderUsers(query);
        }
    });

    refs.genreInputWrap?.addEventListener("click", () => refs.genreInput?.focus());
    refs.genreInput?.addEventListener("input", (e) => {
        renderGenreDropdown(e.target.value || "");
    });
    refs.genreInput?.addEventListener("focus", (e) => {
        renderGenreDropdown(e.target.value || "");
    });
    refs.genreInput?.addEventListener("blur", () => {
        // esperar un poco para permitir click en dropdown
        setTimeout(() => {
            refs.genreDropdown && (refs.genreDropdown.hidden = true);
        }, 150);
    });
    refs.genreInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const added = addGenreByName(refs.genreInput?.value || "");
            if (added && refs.genreInput) refs.genreInput.value = "";
            refs.genreDropdown && (refs.genreDropdown.hidden = true);
        }
    });
    refs.genreTags?.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-genre-remove]");
        if (!btn) return;
        removeGenreByName(btn.dataset.genreRemove || "");
    });

    // Clicks en el dropdown personalizado
    refs.genreDropdown?.addEventListener("click", (e) => {
        const opt = e.target.closest(".genre-option");
        if (!opt) return;
        const name = opt.dataset.genreName;
        if (name) {
            addGenreByName(name);
            if (refs.genreInput) refs.genreInput.value = "";
            refs.genreDropdown && (refs.genreDropdown.hidden = true);
            refs.genreInput?.focus();
        }
    });

    // Cerrar dropdown al clicar fuera
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!refs.genreInputWrap?.contains(target)) {
            refs.genreDropdown && (refs.genreDropdown.hidden = true);
        }
    });

    refs.paginationPrev?.addEventListener("click", () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderProducts();
        }
    });
    refs.paginationNext?.addEventListener("click", () => {
        const totalPages = Math.ceil(state.products.length / PAGE_SIZE);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderProducts();
        }
    });

    // ─── Controles del modal ──────────────────────────────────────────
    refs.addProductBtn?.addEventListener("click", async () => await openProductModal());
    refs.productModalClose?.addEventListener("click", closeProductModal);
    refs.productModalCancel?.addEventListener("click", closeProductModal);
    refs.productModalOverlay?.addEventListener("click", closeProductModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !refs.productModal?.classList.contains("modal--hidden")) closeProductModal();
    });

    // ─── Preview de imágenes ──────────────────────────────────────────
    refs.fieldImages?.addEventListener("change", function () {
        if (!refs.imagePreviews) return;
        refs.imagePreviews.innerHTML = "";
        Array.from(this.files || []).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement("img");
                img.className = "image-preview";
                img.src = e.target?.result || "";
                refs.imagePreviews.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // ─── Estado de acceso ─────────────────────────────────────────────
    function renderAccessState() {
        const authenticated = window.Auth.isAuthenticated();
        const isAdminUser = window.Auth.isAdmin();
        const canManage = !authenticated || isAdminUser;

        if (authenticated && !isAdminUser) {
            window.location.replace("index.html");
            return;
        }

        if (refs.accessNotice) refs.accessNotice.hidden = canManage;
        if (refs.accessNoticeText) {
            refs.accessNoticeText.textContent = authenticated ? "Necesitas una cuenta administradora para gestionar productos." : "Podés ver el panel directamente. Para gestionar productos iniciá sesión con una cuenta administradora.";
        }
        if (refs.addProductBtn) refs.addProductBtn.disabled = !canManage;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
            reader.readAsDataURL(file);
        });
    }

    window.addEventListener("auth:changed", () => {
        if (!window.Auth.canAccessAdminPage?.()) {
            window.location.replace("index.html");
            return;
        }
        renderAccessState();
    });

    // ─── Init ─────────────────────────────────────────────────────────
    renderAccessState();
    await loadTagsCatalog();
    await loadProducts();
    await loadUsers();
});
