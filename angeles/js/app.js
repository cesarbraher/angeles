/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import {
  apiRequest,
  clearSession,
  closeModal,
  esc,
  getStoredUser,
  getToken,
  setSession,
  showToast,
} from "./api.js";
import { initPWA, triggerAppDownloadOrInstall } from "./pwa.js";
import { canAccess } from "./rbac.js";
import { initGlobalSearch } from "./search.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderLoginView } from "./views/auth-view.js";
import { renderPatientChartView } from "./views/chart-view.js";
import { renderDashboardView } from "./views/dashboard-view.js";
import { renderExpansionView } from "./views/expansion-view.js";
import { renderNewPatientView, renderPatientsListView } from "./views/patients-view.js";
import { renderLandingView, renderNosotrosView, renderServiciosView } from "./views/public-views.js";

const BASE_PATH = "/angeles";

let inactivityTimer = null;
let inactivityMinutes = 20;

function normalizeRoutePath(rawPath) {
  let p = rawPath || "/";
  if (p === BASE_PATH || p === `${BASE_PATH}/`) return "/";
  if (p.startsWith(`${BASE_PATH}/`)) {
    p = p.slice(BASE_PATH.length);
  }
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

function toFullUrl(path) {
  if (!path || path === "/" || path === BASE_PATH || path === `${BASE_PATH}/`) {
    return `${BASE_PATH}/`;
  }
  if (path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

function resetInactivityWatcher() {
  clearTimeout(inactivityTimer);
  if (!getToken()) return;
  inactivityTimer = setTimeout(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignorar si ya expiró
    }
    clearSession();
    showToast("Sesión cerrada automáticamente por inactividad clínica.", "info");
    renderChrome();
    navigate("/angeles/login");
  }, inactivityMinutes * 60 * 1000);
}

function closeMobileSidebar() {
  document.getElementById("app-sidebar")?.classList.remove("open");
  document.getElementById("sidebar-backdrop")?.classList.add("hidden");
  document.getElementById("btn-mobile-menu")?.setAttribute("aria-expanded", "false");
}

export function navigate(path) {
  const fullPath = toFullUrl(path);
  if (window.location.pathname !== fullPath) {
    window.history.pushState({}, "", fullPath);
  }
  closeMobileSidebar();
  renderRoute();
}

function renderChrome() {
  const user = getStoredUser();
  const subPath = normalizeRoutePath(window.location.pathname);
  const topNav = document.getElementById("topbar-nav");
  const topUser = document.getElementById("topbar-user");
  const sidebar = document.getElementById("app-sidebar");

  if (!user) {
    topNav.innerHTML = `
      <a href="/angeles/" class="${subPath === "/" ? "active" : ""}" data-link>Inicio</a>
      <a href="/angeles/servicios" class="${subPath === "/servicios" ? "active" : ""}" data-link>Servicios</a>
      <a href="/angeles/nosotros" class="${subPath === "/nosotros" ? "active" : ""}" data-link>Nosotros</a>
    `;
    topUser.innerHTML = `<a href="/angeles/login" class="btn btn-primary btn-sm" data-link>Acceso Personal</a>`;
    sidebar.classList.add("hidden");
    return;
  }

  topNav.innerHTML = `
    <a href="/angeles/dashboard" class="${subPath === "/dashboard" ? "active" : ""}" data-link>Panel</a>
    <a href="/angeles/expedientes" class="${subPath.startsWith("/expedientes") ? "active" : ""}" data-link>Expedientes</a>
    ${canAccess(user, "expansion", "read") ? `<a href="/angeles/modulos-expansion" class="${subPath === "/modulos-expansion" ? "active" : ""}" data-link>Expansión</a>` : ""}
    ${canAccess(user, "admin", "full") ? `<a href="/angeles/administracion" class="${subPath === "/administracion" ? "active" : ""}" data-link>Admin</a>` : ""}
  `;

  const initials = (user.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  topUser.innerHTML = `
    <div class="user-pill" title="${esc(user.full_name)} — ${esc(user.role_name)}">
      <span class="user-avatar">${esc(initials)}</span>
      <span class="user-name-label" style="font-weight:600;">${esc(user.role_code)}</span>
    </div>
    <button type="button" id="btn-logout" class="btn btn-ghost btn-sm" title="Cerrar sesión">Salir</button>
  `;

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignorar
    }
    clearSession();
    showToast("Sesión cerrada correctamente.", "info");
    renderChrome();
    navigate("/angeles/");
  });

  // Menú lateral clínico
  sidebar.classList.remove("hidden");
  sidebar.innerHTML = `
    <div>
      <div class="sidebar-group-title">Gestión Clínica</div>
      <nav class="sidebar-nav">
        <a href="/angeles/dashboard" class="sidebar-link ${subPath === "/dashboard" ? "active" : ""}" data-link>Panel de Control</a>
        <a href="/angeles/expedientes" class="sidebar-link ${subPath === "/expedientes" || /^\/expedientes\/\d+$/.test(subPath) ? "active" : ""}" data-link>Expedientes Clínicos</a>
        ${canAccess(user, "admission", "write") ? `<a href="/angeles/expedientes/nuevo" class="sidebar-link ${subPath === "/expedientes/nuevo" ? "active" : ""}" data-link>+ Nuevo Ingreso</a>` : ""}
        ${canAccess(user, "expansion", "read") ? `<a href="/angeles/modulos-expansion" class="sidebar-link ${subPath === "/modulos-expansion" ? "active" : ""}" data-link>Módulos de Expansión</a>` : ""}
      </nav>

      ${
        canAccess(user, "admin", "full")
          ? `<div class="sidebar-group-title" style="margin-top:12px;">Gobernanza</div>
             <nav class="sidebar-nav">
               <a href="/angeles/administracion" class="sidebar-link ${subPath === "/administracion" ? "active" : ""}" data-link>Usuarios, RBAC y Auditoría</a>
             </nav>`
          : ""
      }

      <div class="sidebar-group-title" style="margin-top:12px;">Institución</div>
      <nav class="sidebar-nav">
        <a href="/angeles/servicios" class="sidebar-link ${subPath === "/servicios" ? "active" : ""}" data-link>Metodología SOAP</a>
        <a href="/angeles/nosotros" class="sidebar-link ${subPath === "/nosotros" ? "active" : ""}" data-link>Acerca del Sistema</a>
        <a href="/" class="sidebar-link">← Fundación Braher</a>
        <a href="/docs" class="sidebar-link" target="_blank" rel="noopener noreferrer">API Docs (OpenAPI)</a>
      </nav>
    </div>

    <div class="sidebar-install-box">
      <h4>Instalar App en Dispositivo</h4>
      <p>Abre ÁNGELES en pantalla completa en tu celular, tablet o escritorio.</p>
      <button type="button" id="sidebar-btn-install" class="btn btn-download-app btn-sm" style="width:100%;">
        Descargar / Instalar App
      </button>
    </div>
  `;

  document.getElementById("sidebar-btn-install")?.addEventListener("click", () => {
    closeMobileSidebar();
    triggerAppDownloadOrInstall();
  });
}

async function renderRoute() {
  const main = document.getElementById("app-main");
  const subPath = normalizeRoutePath(window.location.pathname);
  const user = getStoredUser();

  renderChrome();

  // Rutas públicas bajo /angeles/
  if (subPath === "/") {
    renderLandingView(main, navigate);
    return;
  }
  if (subPath === "/servicios") {
    renderServiciosView(main);
    return;
  }
  if (subPath === "/nosotros" || subPath === "/acerca") {
    renderNosotrosView(main);
    return;
  }
  if (subPath === "/login") {
    if (user) {
      navigate("/angeles/dashboard");
      return;
    }
    renderLoginView(main, (loginRes) => {
      inactivityMinutes = loginRes.inactivity_timeout_minutes || 20;
      resetInactivityWatcher();
      navigate("/angeles/dashboard");
    });
    return;
  }

  // Rutas protegidas (requieren JWT)
  if (!user || !getToken()) {
    navigate("/angeles/login");
    return;
  }

  if (subPath === "/dashboard") {
    await renderDashboardView(main, navigate);
    return;
  }
  if (subPath === "/expedientes") {
    await renderPatientsListView(main, navigate);
    return;
  }
  if (subPath === "/expedientes/nuevo") {
    renderNewPatientView(main, navigate);
    return;
  }
  const chartMatch = subPath.match(/^\/expedientes\/(\d+)$/);
  if (chartMatch) {
    await renderPatientChartView(main, Number(chartMatch[1]));
    return;
  }
  if (subPath === "/modulos-expansion") {
    await renderExpansionView(main);
    return;
  }
  if (subPath === "/administracion") {
    await renderAdminView(main);
    return;
  }

  renderLandingView(main, navigate);
}

async function bootstrap() {
  initPWA();
  initGlobalSearch(navigate, triggerAppDownloadOrInstall);

  // Enlaces SPA internos bajo /angeles sin recargar página
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = link.getAttribute("href");
    if (href && href.startsWith("/angeles")) {
      e.preventDefault();
      navigate(href);
    }
  });

  window.addEventListener("popstate", renderRoute);
  window.addEventListener("angeles:unauthorized", () => {
    showToast("Tu sesión expiró. Por favor inicia sesión nuevamente.", "info");
    navigate("/angeles/login");
  });

  // Menú móvil
  const menuBtn = document.getElementById("btn-mobile-menu");
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  menuBtn?.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    backdrop.classList.toggle("hidden", !open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  backdrop?.addEventListener("click", closeMobileSidebar);

  // Modal genérico cierre
  document.getElementById("btn-close-generic-modal")?.addEventListener("click", closeModal);
  document.getElementById("generic-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "generic-modal") closeModal();
  });

  // Vigilar actividad del usuario para cierre automático
  ["click", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, resetInactivityWatcher, { passive: true })
  );

  // Revalidar token guardado al abrir la PWA
  if (getToken()) {
    try {
      const freshProfile = await apiRequest("/api/v1/auth/me");
      setSession(getToken(), freshProfile);
      resetInactivityWatcher();
    } catch {
      clearSession();
    }
  }

  await renderRoute();
}

bootstrap();
