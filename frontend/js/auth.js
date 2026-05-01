// auth.js
// Handles registration, login, persistent sessions and admin UI state.

const Auth = (() => {
    const API_HOST = window.location.hostname || "127.0.0.1";
    const API_BASE_URL = `http://${API_HOST}:5000/api/users`;
    const AUTH_STORAGE_KEY = "tonkistore.auth";
    const ADMIN_PAGE = "admin";

    let initialized = false;
    let initPromise = null;

    const registerRefs = {
        modal: null,
        overlay: null,
        closeBtn: null,
        cancelBtn: null,
        submitBtn: null,
        form: null,
        successMessage: null,
        inputNombre: null,
        inputApellido: null,
        inputEmail: null,
        inputPassword: null,
        errorNombre: null,
        errorApellido: null,
        errorEmail: null,
        errorPassword: null,
        generalError: null,
    };

    const loginRefs = {
        modal: null,
        overlay: null,
        closeBtn: null,
        cancelBtn: null,
        submitBtn: null,
        form: null,
        inputEmail: null,
        inputPassword: null,
        errorEmail: null,
        errorPassword: null,
        generalError: null,
    };

    const uiRefs = {
        openRegisterBtn: null,
        openLoginBtn: null,
        adminLink: null,
        authUser: null,
        avatarBtn: null,
        avatarMenu: null,
        avatarInitials: null,
        avatarName: null,
        menuName: null,
        menuEmail: null,
        logoutBtn: null,
    };

    function getCurrentPage() {
        return document.body?.dataset.page || "";
    }

    function redirectToStore() {
        window.location.replace("index.html");
    }

    function safeParseAuthState(rawValue) {
        if (!rawValue) return null;

        try {
            const parsed = JSON.parse(rawValue);
            if (!parsed || typeof parsed !== "object") return null;
            if (typeof parsed.token !== "string" || !parsed.token.trim()) return null;
            if (!parsed.user || typeof parsed.user !== "object") return null;
            return parsed;
        } catch {
            return null;
        }
    }

    function getAuthState() {
        return safeParseAuthState(window.localStorage.getItem(AUTH_STORAGE_KEY));
    }

    function getCurrentUser() {
        return getAuthState()?.user || null;
    }

    function getToken() {
        return getAuthState()?.token || null;
    }

    function isAuthenticated() {
        return Boolean(getToken() && getCurrentUser());
    }

    function isAdmin() {
        return Boolean(getCurrentUser()?.is_admin);
    }

    function canAccessAdminPage() {
        return !isAuthenticated() || isAdmin();
    }

    function storeAuthState(state) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new CustomEvent("auth:changed", { detail: { state } }));
    }

    function clearAuthState() {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent("auth:changed", { detail: { state: null } }));
    }

    function updateCurrentUser(user) {
        const state = getAuthState();
        if (!state?.token) return;

        storeAuthState({
            token: state.token,
            user,
        });

        syncUi();
    }

    function displayName(user) {
        const parts = [user?.nombre, user?.apellido].map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);

        return parts.join(" ") || user?.email || "Usuario";
    }

    function buildInitials(user) {
        const parts = [user?.nombre, user?.apellido].map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);

        if (parts.length > 0) {
            return parts
                .map((part) => part.charAt(0).toUpperCase())
                .join("")
                .slice(0, 2);
        }

        return String(user?.email || "U")
            .slice(0, 2)
            .toUpperCase();
    }

    function setHidden(element, hidden) {
        if (!element) return;
        element.hidden = hidden;
    }

    function getAuthHeaders(baseHeaders = {}) {
        const headers = { ...baseHeaders };
        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    async function requestJson(url, options = {}) {
        let response;
        let text = "";
        let data = {};

        try {
            response = await fetch(url, options);
        } catch {
            const error = new Error("Error de conexion. Verifica que el servidor este activo.");
            error.status = 0;
            throw error;
        }

        try {
            text = await response.text();
        } catch {
            text = "";
        }

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = {};
            }
        }

        if (!response.ok) {
            const error = new Error(data.error || data.message || text || `HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    async function requestJsonWithAuth(url, options = {}) {
        const headers = getAuthHeaders(options.headers || {});

        try {
            return await requestJson(url, {
                ...options,
                headers,
            });
        } catch (error) {
            if (error.status === 401) {
                clearAuthState();
                syncUi();
            }

            throw error;
        }
    }

    async function refreshCurrentUser() {
        const token = getToken();
        if (!token) {
            clearAuthState();
            syncUi();
            return null;
        }

        try {
            const result = await requestJsonWithAuth(`${API_BASE_URL}/me`);
            if (!result.user) {
                clearAuthState();
                syncUi();
                return null;
            }

            storeAuthState({
                token,
                user: result.user,
            });
            syncUi();
            return result.user;
        } catch {
            clearAuthState();
            syncUi();
            return null;
        }
    }

    function clearRegisterErrors() {
        if (registerRefs.errorNombre) registerRefs.errorNombre.textContent = "";
        if (registerRefs.errorApellido) registerRefs.errorApellido.textContent = "";
        if (registerRefs.errorEmail) registerRefs.errorEmail.textContent = "";
        if (registerRefs.errorPassword) registerRefs.errorPassword.textContent = "";
        if (registerRefs.generalError) registerRefs.generalError.textContent = "";
    }

    function clearLoginErrors() {
        if (loginRefs.errorEmail) loginRefs.errorEmail.textContent = "";
        if (loginRefs.errorPassword) loginRefs.errorPassword.textContent = "";
        if (loginRefs.generalError) loginRefs.generalError.textContent = "";
    }

    function resetRegisterForm() {
        registerRefs.form?.reset();
        clearRegisterErrors();

        if (registerRefs.form) registerRefs.form.hidden = false;
        if (registerRefs.successMessage) registerRefs.successMessage.hidden = true;
    }

    function resetLoginForm() {
        loginRefs.form?.reset();
        clearLoginErrors();
    }

    function showRegisterErrors(errors) {
        clearRegisterErrors();

        if (errors.nombre && registerRefs.errorNombre) registerRefs.errorNombre.textContent = errors.nombre;
        if (errors.apellido && registerRefs.errorApellido) registerRefs.errorApellido.textContent = errors.apellido;
        if (errors.email && registerRefs.errorEmail) registerRefs.errorEmail.textContent = errors.email;
        if (errors.password && registerRefs.errorPassword) registerRefs.errorPassword.textContent = errors.password;
    }

    function showLoginErrors(errors) {
        clearLoginErrors();

        if (errors.email && loginRefs.errorEmail) loginRefs.errorEmail.textContent = errors.email;
        if (errors.password && loginRefs.errorPassword) loginRefs.errorPassword.textContent = errors.password;
    }

    function toggleAvatarMenu(open) {
        if (!uiRefs.authUser || !uiRefs.avatarMenu || !uiRefs.avatarBtn) return;

        uiRefs.authUser.classList.toggle("auth-user--open", open);
        uiRefs.avatarMenu.hidden = !open;
        uiRefs.avatarBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function closeAvatarMenu() {
        toggleAvatarMenu(false);
    }

    function openModal(modal, focusTarget) {
        if (!modal) return;

        closeAllModals();
        closeAvatarMenu();
        modal.removeAttribute("hidden");
        focusTarget?.focus();
    }

    function closeModal(modal, resetCallback) {
        if (!modal) return;

        modal.setAttribute("hidden", "");
        if (typeof resetCallback === "function") {
            resetCallback();
        }
    }

    function closeAllModals() {
        closeModal(registerRefs.modal, resetRegisterForm);
        closeModal(loginRefs.modal, resetLoginForm);
    }

    function validateName(name) {
        const trimmed = name.trim();
        if (!trimmed) return { valid: false, error: "Este campo es requerido" };
        if (trimmed.length < 2) return { valid: false, error: "Minimo 2 caracteres" };
        if (!/^[A-Za-z\u00C0-\u024F\s'-]+$/.test(trimmed)) {
            return { valid: false, error: "Solo se permiten letras, espacios, apostrofes o guiones" };
        }
        return { valid: true };
    }

    function validateEmail(email) {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return { valid: false, error: "El email es requerido" };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            return { valid: false, error: "Email invalido (ej: usuario@dominio.com)" };
        }

        return { valid: true };
    }

    function validatePassword(password) {
        if (!password) return { valid: false, error: "La contrasena es requerida" };
        if (password.length < 6) return { valid: false, error: "Minimo 6 caracteres" };
        return { valid: true };
    }

    function validateRegisterForm() {
        const errors = {};
        let valid = true;

        const validNombre = validateName(registerRefs.inputNombre?.value || "");
        if (!validNombre.valid) {
            errors.nombre = validNombre.error;
            valid = false;
        }

        const validApellido = validateName(registerRefs.inputApellido?.value || "");
        if (!validApellido.valid) {
            errors.apellido = validApellido.error;
            valid = false;
        }

        const validEmail = validateEmail(registerRefs.inputEmail?.value || "");
        if (!validEmail.valid) {
            errors.email = validEmail.error;
            valid = false;
        }

        const validPassword = validatePassword(registerRefs.inputPassword?.value || "");
        if (!validPassword.valid) {
            errors.password = validPassword.error;
            valid = false;
        }

        return { valid, errors };
    }

    function validateLoginForm() {
        const errors = {};
        let valid = true;

        const validEmail = validateEmail(loginRefs.inputEmail?.value || "");
        if (!validEmail.valid) {
            errors.email = validEmail.error;
            valid = false;
        }

        const validPassword = validatePassword(loginRefs.inputPassword?.value || "");
        if (!validPassword.valid) {
            errors.password = validPassword.error;
            valid = false;
        }

        return { valid, errors };
    }

    async function handleRegisterSubmit(event) {
        event.preventDefault();

        const validation = validateRegisterForm();
        if (!validation.valid) {
            showRegisterErrors(validation.errors);
            return;
        }

        clearRegisterErrors();

        const payload = {
            nombre: registerRefs.inputNombre.value.trim(),
            apellido: registerRefs.inputApellido.value.trim(),
            email: registerRefs.inputEmail.value.trim().toLowerCase(),
            password: registerRefs.inputPassword.value,
        };

        registerRefs.submitBtn.disabled = true;
        registerRefs.submitBtn.textContent = "Registrando...";

        try {
            await requestJson(`${API_BASE_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (registerRefs.form) registerRefs.form.hidden = true;
            if (registerRefs.successMessage) registerRefs.successMessage.hidden = false;

            window.setTimeout(() => {
                closeModal(registerRefs.modal, resetRegisterForm);
            }, 1400);
        } catch (error) {
            if (registerRefs.generalError) {
                registerRefs.generalError.textContent = error.message;
            }
        } finally {
            registerRefs.submitBtn.disabled = false;
            registerRefs.submitBtn.textContent = "Registrarse";
        }
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();

        const validation = validateLoginForm();
        if (!validation.valid) {
            showLoginErrors(validation.errors);
            return;
        }

        clearLoginErrors();

        const payload = {
            email: loginRefs.inputEmail.value.trim().toLowerCase(),
            password: loginRefs.inputPassword.value,
        };

        loginRefs.submitBtn.disabled = true;
        loginRefs.submitBtn.textContent = "Ingresando...";

        try {
            const result = await requestJson(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            storeAuthState({
                token: result.token,
                user: result.user,
            });

            syncUi();
            closeModal(loginRefs.modal, resetLoginForm);
        } catch (error) {
            if (loginRefs.generalError) {
                loginRefs.generalError.textContent = error.message;
            }
        } finally {
            loginRefs.submitBtn.disabled = false;
            loginRefs.submitBtn.textContent = "Iniciar sesion";
        }
    }

    function syncUi() {
        const user = getCurrentUser();
        const authenticated = isAuthenticated();
        const admin = authenticated && Boolean(user?.is_admin);
        const canAccessAdmin = authenticated && admin;

        if (getCurrentPage() === ADMIN_PAGE && !canAccessAdminPage()) {
            redirectToStore();
            return;
        }

        setHidden(uiRefs.openRegisterBtn, authenticated);
        setHidden(uiRefs.openLoginBtn, authenticated);
        setHidden(uiRefs.adminLink, !canAccessAdmin);

        if (uiRefs.adminLink) {
            uiRefs.adminLink.classList.remove("btn-admin--locked");
            uiRefs.adminLink.title = "";
        }

        if (uiRefs.authUser) {
            uiRefs.authUser.classList.toggle("auth-user--hidden", !authenticated);
            uiRefs.authUser.hidden = !authenticated;
        }

        if (!authenticated) {
            closeAvatarMenu();
            return;
        }

        const name = displayName(user);

        if (uiRefs.avatarInitials) uiRefs.avatarInitials.textContent = buildInitials(user);
        if (uiRefs.avatarName) uiRefs.avatarName.textContent = name;
        if (uiRefs.menuName) uiRefs.menuName.textContent = name;
        if (uiRefs.menuEmail) uiRefs.menuEmail.textContent = user.email || "";
    }

    function requireAuth() {
        if (isAuthenticated()) return true;

        if (getCurrentPage() === ADMIN_PAGE) {
            redirectToStore();
        }

        return false;
    }

    function requireAdmin() {
        if (isAuthenticated() && isAdmin()) return true;

        if (getCurrentPage() === ADMIN_PAGE) {
            redirectToStore();
        }

        return false;
    }

    async function logout() {
        const token = getToken();

        closeAllModals();
        closeAvatarMenu();

        if (token) {
            try {
                await requestJsonWithAuth(`${API_BASE_URL}/logout`, {
                    method: "POST",
                });
            } catch {
                // Ignore server errors: local cleanup still matters.
            }
        }

        clearAuthState();
        syncUi();
    }

    function handleDocumentClick(event) {
        if (uiRefs.authUser && !uiRefs.authUser.contains(event.target)) {
            closeAvatarMenu();
        }
    }

    function handleEscape(event) {
        if (event.key !== "Escape") return;

        if (registerRefs.modal && !registerRefs.modal.hasAttribute("hidden")) {
            closeModal(registerRefs.modal, resetRegisterForm);
        }

        if (loginRefs.modal && !loginRefs.modal.hasAttribute("hidden")) {
            closeModal(loginRefs.modal, resetLoginForm);
        }

        closeAvatarMenu();
    }

    function handleStorageChange(event) {
        if (event.key !== AUTH_STORAGE_KEY) return;
        syncUi();
        window.dispatchEvent(new CustomEvent("auth:changed", { detail: { state: getAuthState() } }));
    }

    function handleAdminLinkClick(event) {
        if (!uiRefs.adminLink) return;
        if (getCurrentPage() === ADMIN_PAGE) return;
        event?.preventDefault?.();
        window.location.href = "admin.html";
    }

    function cacheSharedElements() {
        uiRefs.openRegisterBtn = document.getElementById("openRegisterBtn");
        uiRefs.openLoginBtn = document.getElementById("openLoginBtn");
        uiRefs.adminLink = document.getElementById("adminLink");
        uiRefs.authUser = document.getElementById("authUserMenu");
        uiRefs.avatarBtn = document.getElementById("avatarBtn");
        uiRefs.avatarMenu = document.getElementById("avatarMenu");
        uiRefs.avatarInitials = document.getElementById("avatarInitials");
        uiRefs.avatarName = document.getElementById("avatarName");
        uiRefs.menuName = document.getElementById("authMenuName");
        uiRefs.menuEmail = document.getElementById("authMenuEmail");
        uiRefs.logoutBtn = document.getElementById("logoutBtn");
    }

    function cacheRegisterElements() {
        registerRefs.modal = document.getElementById("registerModal");
        if (!registerRefs.modal) return;

        registerRefs.cancelBtn = document.getElementById("registerCancelBtn");
        registerRefs.submitBtn = document.getElementById("registerSubmitBtn");
        registerRefs.form = document.getElementById("registerForm");
        registerRefs.successMessage = document.getElementById("registerSuccessMessage");
        registerRefs.inputNombre = document.getElementById("regNombre");
        registerRefs.inputApellido = document.getElementById("regApellido");
        registerRefs.inputEmail = document.getElementById("regEmail");
        registerRefs.inputPassword = document.getElementById("regPassword");
        registerRefs.errorNombre = document.getElementById("errorNombre");
        registerRefs.errorApellido = document.getElementById("errorApellido");
        registerRefs.errorEmail = document.getElementById("errorEmail");
        registerRefs.errorPassword = document.getElementById("errorPassword");
        registerRefs.generalError = document.getElementById("registerGeneralError");
    }

    function cacheLoginElements() {
        loginRefs.modal = document.getElementById("loginModal");
        if (!loginRefs.modal) return;

        loginRefs.cancelBtn = document.getElementById("loginCancelBtn");
        loginRefs.submitBtn = document.getElementById("loginSubmitBtn");
        loginRefs.form = document.getElementById("loginForm");
        loginRefs.inputEmail = document.getElementById("loginEmail");
        loginRefs.inputPassword = document.getElementById("loginPassword");
        loginRefs.errorEmail = document.getElementById("loginErrorEmail");
        loginRefs.errorPassword = document.getElementById("loginErrorPassword");
        loginRefs.generalError = document.getElementById("loginGeneralError");
    }

    function bindRegisterEvents() {
        if (uiRefs.openRegisterBtn) {
            uiRefs.openRegisterBtn.addEventListener("click", () => {
                openModal(registerRefs.modal, registerRefs.inputNombre);
            });
        }

        if (registerRefs.cancelBtn) {
            registerRefs.cancelBtn.addEventListener("click", () => {
                closeModal(registerRefs.modal, resetRegisterForm);
            });
        }

        if (registerRefs.form) {
            registerRefs.form.addEventListener("submit", handleRegisterSubmit);
        }
    }

    function bindLoginEvents() {
        if (uiRefs.openLoginBtn) {
            uiRefs.openLoginBtn.addEventListener("click", () => {
                openModal(loginRefs.modal, loginRefs.inputEmail);
            });
        }

        if (loginRefs.cancelBtn) {
            loginRefs.cancelBtn.addEventListener("click", () => {
                closeModal(loginRefs.modal, resetLoginForm);
            });
        }

        if (loginRefs.form) {
            loginRefs.form.addEventListener("submit", handleLoginSubmit);
        }
    }

    function bindSharedEvents() {
        if (uiRefs.avatarBtn) {
            uiRefs.avatarBtn.addEventListener("click", () => {
                toggleAvatarMenu(uiRefs.avatarMenu?.hidden);
            });
        }

        if (uiRefs.logoutBtn) {
            uiRefs.logoutBtn.addEventListener("click", () => {
                logout();
            });
        }

        if (uiRefs.adminLink) {
            uiRefs.adminLink.addEventListener("click", handleAdminLinkClick);
        }

        document.addEventListener("click", handleDocumentClick);
        document.addEventListener("keydown", handleEscape);
        window.addEventListener("storage", handleStorageChange);
    }

    async function init() {
        if (initPromise) return initPromise;

        if (!initialized) {
            initialized = true;
            cacheSharedElements();
            cacheRegisterElements();
            cacheLoginElements();
            bindSharedEvents();
            bindRegisterEvents();
            bindLoginEvents();
        }

        initPromise = (async () => {
            if (getToken()) {
                await refreshCurrentUser();
            } else {
                syncUi();
            }

            return getCurrentUser();
        })();

        return initPromise;
    }

    return {
        init,
        isAuthenticated,
        isAdmin,
        getCurrentUser,
        getAuthHeaders,
        updateCurrentUser,
        refreshCurrentUser,
        logout,
        requireAuth,
        requireAdmin,
        canAccessAdminPage,
        requestJsonWithAuth,
    };
})();

window.Auth = Auth;
