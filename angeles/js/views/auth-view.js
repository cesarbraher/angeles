/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, setSession, showToast } from "../api.js";

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="card card-elevated">
        <div style="text-align:center;margin-bottom:22px;">
          <img src="/angeles/assets/icons/icon-192x192.png" alt="ÁNGELES" width="60" height="60" style="border-radius:14px;margin-bottom:10px;" />
          <h1 style="font-size:1.45rem;margin-bottom:4px;color:var(--blue-950);">Acceso al Sistema ÁNGELES</h1>
          <p class="muted-sm">Ingreso para Dirección Master y profesionales clínicos autorizados.</p>
        </div>

        <form id="login-form" class="form-grid" style="grid-template-columns:1fr;">
          <div class="form-field">
            <label for="login-identifier">Usuario o correo electrónico</label>
            <input type="text" id="login-identifier" name="identifier" required autocomplete="username" placeholder="Ingresa tu usuario o correo" />
          </div>

          <div class="form-field">
            <label for="login-password">Contraseña</label>
            <input type="password" id="login-password" name="password" required autocomplete="current-password" placeholder="••••••••" />
          </div>

          <div id="login-error" class="badge badge-red hidden" style="justify-content:center;padding:10px 12px;border-radius:10px;text-align:center;"></div>

          <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width:100%;">
            Iniciar Sesión
          </button>
        </form>

        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border-light);text-align:center;">
          <p class="muted-sm" style="margin-bottom:10px;">
            ¿Eres Consejero en Adicciones, Psicólogo, Médico, Psiquiatra o Nutriólogo?
          </p>
          <a href="/angeles/registro" class="btn btn-secondary" style="width:100%;" data-link>
            Registrarme como Profesional Clínico
          </a>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const idInput = document.getElementById("login-identifier");
  const pwInput = document.getElementById("login-password");
  const errBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("btn-login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando acceso...";

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: idInput.value.trim(),
          password: pwInput.value,
        }),
      });
      setSession(data.access_token, data.user);
      showToast(`Bienvenido(a), ${data.user.full_name}`, "success");
      onLoginSuccess(data);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Iniciar Sesión";
    }
  });
}
