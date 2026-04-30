// Módulo compartido de Login Form
// Se inyecta en index.html y admin.html

const LoginForm = (() => {
    const HTML = `
        <div id="loginModal" class="login-page" hidden>
            <div class="login-card">
                <h2 class="login-title">Iniciar sesi&oacute;n</h2>
                <form id="loginForm" class="register-form">
                    <div class="form-group">
                        <label for="loginEmail" class="form-label">Correo electr&oacute;nico</label>
                        <input type="email" id="loginEmail" name="email" class="form-input" placeholder="tu@correo.com" required autocomplete="email" />
                        <span class="form-error" id="loginErrorEmail"></span>
                    </div>

                    <div class="form-group">
                        <label for="loginPassword" class="form-label">Contrase&ntilde;a</label>
                        <input type="password" id="loginPassword" name="password" class="form-input" placeholder="Tu contrase&ntilde;a" required autocomplete="current-password" />
                        <span class="form-error" id="loginErrorPassword"></span>
                    </div>

                    <div id="loginGeneralError" class="form-error form-error--general"></div>

                    <div class="form-actions">
                        <button type="submit" class="btn-submit" id="loginSubmitBtn">Iniciar sesi&oacute;n</button>
                        <button type="button" class="btn-cancel" id="loginCancelBtn">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    function inject() {
        // Solo inyectar si no existe ya
        if (document.getElementById("loginModal")) {
            return;
        }

        // Crear contenedor temporal
        const temp = document.createElement("div");
        temp.innerHTML = HTML;

        // Insertar después de body o al final
        const loginModal = temp.firstElementChild;
        document.body.appendChild(loginModal);
    }

    return {
        inject: inject,
        getHTML: () => HTML,
    };
})();

// Auto-inyectar cuando el script se carga
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", LoginForm.inject);
} else {
    LoginForm.inject();
}
