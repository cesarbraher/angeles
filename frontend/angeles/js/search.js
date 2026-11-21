/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, esc, getStoredUser } from "./api.js";

const PUBLIC_INDEX = [
  { title: "Portal Institucional ÁNGELES", subtitle: "Inicio y presentación del sistema EHR", route: "/angeles/", keywords: "inicio home portada angeles esperanza" },
  { title: "Alcance y Metodología Clínica", subtitle: "6 módulos EHR, SOAP, 12 Pasos, CIE-11 / DSM-5", route: "/angeles/servicios", keywords: "servicios metodologia soap 12 pasos cie dsm modulos" },
  { title: "Acerca del Sistema e Institución", subtitle: "Ángeles de Esperanza A.C. y autoría técnica", route: "/angeles/nosotros", keywords: "nosotros institucion irapuato cesar bravo devrel google" },
  { title: "Acceso al Personal Clínico", subtitle: "Iniciar sesión con JWT y control RBAC", route: "/angeles/login", keywords: "login acceso iniciar sesion personal medico psicologo" },
  { title: "Descargar / Instalar App (PWA)", subtitle: "Instalar en Android, iOS, Windows, macOS o Linux", route: "#install", keywords: "descargar instalar app pwa android ios movil" },
];

let debounceTimer = null;

export function initGlobalSearch(navigateFn, openInstallFn) {
  const input = document.getElementById("global-search-input");
  const dropdown = document.getElementById("global-search-results");
  const wrapper = document.getElementById("global-search-wrapper");
  if (!input || !dropdown || !wrapper) return;

  // Atajo de teclado '/' o Ctrl+K
  window.addEventListener("keydown", (e) => {
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    const editing = tag === "input" || tag === "textarea" || tag === "select";
    if ((e.key === "/" && !editing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === "Escape") {
      dropdown.classList.add("hidden");
      input.blur();
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  input.addEventListener("input", () => {
    const query = input.value.trim();
    clearTimeout(debounceTimer);
    if (!query) {
      dropdown.classList.add("hidden");
      return;
    }
    debounceTimer = setTimeout(() => runSearch(query, dropdown, input, navigateFn, openInstallFn), 180);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      runSearch(input.value.trim(), dropdown, input, navigateFn, openInstallFn);
    }
  });
}

async function runSearch(query, dropdown, input, navigateFn, openInstallFn) {
  const user = getStoredUser();

  if (!user) {
    const low = query.toLowerCase();
    const matches = PUBLIC_INDEX.filter(
      (item) =>
        item.title.toLowerCase().includes(low) ||
        item.subtitle.toLowerCase().includes(low) ||
        item.keywords.includes(low)
    );
    renderDropdown(dropdown, { patients: [], sections: matches }, input, navigateFn, openInstallFn);
    return;
  }

  dropdown.innerHTML = `<div class="search-group-label">Buscando en expedientes...</div>`;
  dropdown.classList.remove("hidden");

  try {
    const data = await apiRequest(`/api/v1/search?q=${encodeURIComponent(query)}`);
    renderDropdown(dropdown, data, input, navigateFn, openInstallFn);
  } catch (err) {
    dropdown.innerHTML = `<div class="search-group-label" style="color:var(--danger-600);">${esc(err.message)}</div>`;
  }
}

function renderDropdown(dropdown, data, input, navigateFn, openInstallFn) {
  const patients = data.patients || [];
  const sections = data.sections || [];

  if (!patients.length && !sections.length) {
    dropdown.innerHTML = `<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:0.86rem;">Sin coincidencias para "${esc(input.value.trim())}".</div>`;
    dropdown.classList.remove("hidden");
    return;
  }

  let html = "";
  if (patients.length) {
    html += `<div class="search-group-label">Expedientes Clínicos</div>`;
    html += patients
      .map(
        (p) => `
      <button type="button" class="search-item" data-route="${esc(p.route)}">
        <div>
          <span class="search-item-title">${esc(p.full_name)}</span>
          <span class="search-item-sub"><span class="mono">${esc(p.folio)}</span>${p.curp ? ` · ${esc(p.curp)}` : ""}</span>
        </div>
        <span class="badge ${p.status === "ADMITTED" ? "badge-green" : "badge-blue"}">${p.status === "ADMITTED" ? "Activo" : "Egresado"}</span>
      </button>`
      )
      .join("");
  }

  if (sections.length) {
    html += `<div class="search-group-label">Módulos y Secciones</div>`;
    html += sections
      .map(
        (s) => `
      <button type="button" class="search-item" data-route="${esc(s.route)}">
        <div>
          <span class="search-item-title">${esc(s.title)}</span>
          <span class="search-item-sub">${esc(s.subtitle)}</span>
        </div>
        <span class="muted-sm">Ir →</span>
      </button>`
      )
      .join("");
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove("hidden");

  dropdown.querySelectorAll(".search-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      dropdown.classList.add("hidden");
      input.value = "";
      if (route === "#install") {
        openInstallFn();
      } else if (route) {
        navigateFn(route);
      }
    });
  });
}
