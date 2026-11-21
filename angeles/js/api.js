/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { handleLocalApi } from "./local-engine.js";

const TOKEN_KEY = "angeles_jwt_token";
const USER_KEY = "angeles_user_profile";
let useLocalEngine = false;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  // Si ya se detectó alojamiento estático (ej. Hostinger public_html sin daemon Python) o token local
  if (useLocalEngine || (token && token.startsWith("local-jwt-"))) {
    return handleLocalApi(path, options, token);
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("Sin conexión con el servidor. Tus borradores locales permanecen a salvo.");
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  // Si /api/v1/* devuelve 404/405 o HTML (servidor estático sin backend FastAPI), activar motor local PWA
  if (path.startsWith("/api/v1/") && !isJson && (response.status === 404 || response.status === 405 || response.status === 403)) {
    useLocalEngine = true;
    return handleLocalApi(path, options, token);
  }

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && path !== "/api/v1/auth/login") {
      clearSession();
      window.dispatchEvent(new CustomEvent("angeles:unauthorized"));
    }
    const detail = typeof data === "object" && data?.detail ? data.detail : `Error HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso) {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(y, m - 1, d));
  } catch {
    return iso;
  }
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, 3800);
}

export function openModal(title, htmlContent) {
  const overlay = document.getElementById("generic-modal");
  const titleEl = document.getElementById("generic-modal-title");
  const bodyEl = document.getElementById("generic-modal-body");
  if (!overlay || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = htmlContent;
  overlay.classList.remove("hidden");
}

export function closeModal() {
  const overlay = document.getElementById("generic-modal");
  if (overlay) overlay.classList.add("hidden");
}
