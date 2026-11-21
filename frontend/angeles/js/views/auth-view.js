/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, esc, setSession, showToast } from "../api.js";

const BETA_ROLES = [
  { label: "Administrador (César Bravo)", user: "cesarbraher" },
  { label: "Médico (Dra. Mendoza)", user: "dr.mendoza" },
  { label: "Psicología (Mtro. Navarro)", user: "psi.navarro" },
  { label: "Consejería 12 Pasos (Luis R.)", user: "con.ramirez" },
  { label: "Admisión (Lic. Torres)", user: "adm.torres" },
  { label: "Trabajo Social (Lic. Delgado)", user: "ts.delgado" },
];

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="card card-elevated">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="/angeles/assets/icons/icon-192x192.png" alt="ÁNGELES" width="58" height="58" style="border-radius:14px;margin-bottom:10px;" />
          <h1 style="font-size:1.45rem;margin-bottom:4px;color:var(--blue-950);">Acceso al Personal Clínico</h1>
          <p class="muted-sm">Autenticación segura JWT con auditoría de acceso y cierre por inactividad.</p>
        </div>

        <form id="login-form" class="form-grid" style="grid-template-columns:1fr;">
          <div class="form-field">
            <label for="login-identifier">Correo electrónico o usuario</label>
            <input type="text" id="login-identifier" name="identifier" required autocomplete="username" placeholder="Ej. cesarbraher@gmail.com o dr.mendoza" />
          </div>

          <div class="form-field">
            <label for="login-password">Contraseña</label>
            <input type="password" id="login-password" name="password" required autocomplete="current-password" placeholder="••••••••••••" />
          </div>

          <div id="login-error" class="badge badge-red hidden" style="justify-content:center;padding:9px 12px;border-radius:10px;"></div>

          <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width:100%;">
            Iniciar Sesión Segura
          </button>
        </form>

        <details class="demo-accounts">
          <summary style="cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--blue-900);">
            Cuentas piloto Fase Beta (para validar permisos RBAC por rol)
          </summary>
          <p class="muted-sm" style="margin-top:6px;">
            Contraseña inicial beta: <code class="mono">Angeles2026!</code> — Haz clic en un perfil para rellenar:
          </p>
          <div class="demo-role-grid">
            ${BETA_ROLES.map(
              (r) =>
                `<button type="button" class="demo-role-btn" data-fill-user="${esc(r.user)}">${esc(r.label)}</button>`
            ).join("")}
          </div>
        </details>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const idInput = document.getElementById("login-identifier");
  const pwInput = document.getElementById("login-password");
  const errBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("btn-login-submit");

  container.querySelectorAll("[data-fill-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      idInput.value = btn.getAttribute("data-fill-user");
      pwInput.value = "Angeles2026!";
      idInput.focus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando credenciales...";

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
      submitBtn.textContent = "Iniciar Sesión Segura";
    }
  });
}
