/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { showToast } from "./api.js";

let deferredPrompt = null;
let swReady = false;

export function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function initPWA() {
  // Registro de Service Worker bajo el directorio /angeles/
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("/angeles/sw.js", { scope: "/angeles/" });
        swReady = Boolean(reg);
      } catch (err) {
        console.warn("Service Worker no disponible en este origen:", err);
      }
    });
  }

  // Captura del evento nativo beforeinstallprompt (Android, Chrome, Edge, Desktop)
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallButtons();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updateInstallButtons();
    showToast("¡ÁNGELES se instaló correctamente en tu dispositivo!", "success");
    closeInstallModal();
  });

  // Monitor de conectividad en tiempo real
  const banner = document.getElementById("offline-banner");
  const syncNetwork = () => {
    if (!banner) return;
    banner.classList.toggle("hidden", navigator.onLine);
  };
  window.addEventListener("online", () => {
    syncNetwork();
    showToast("Conexión restablecida.", "success");
  });
  window.addEventListener("offline", () => {
    syncNetwork();
    showToast("Sin conexión: tus borradores locales siguen guardados.", "info");
  });
  syncNetwork();

  // Botón superior "Descargar App" + cierre modal
  const topBtn = document.getElementById("btn-install-app");
  if (topBtn) {
    topBtn.addEventListener("click", () => triggerAppDownloadOrInstall());
  }
  const closeBtn = document.getElementById("btn-close-install-modal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeInstallModal);
  }
  const modal = document.getElementById("install-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeInstallModal();
    });
  }

  updateInstallButtons();
}

export function updateInstallButtons() {
  const topBtn = document.getElementById("btn-install-app");
  const label = document.getElementById("btn-install-app-label");
  if (!topBtn || !label) return;

  if (isStandaloneMode()) {
    topBtn.classList.add("installed");
    label.textContent = "App Instalada";
  } else if (deferredPrompt) {
    topBtn.classList.remove("installed");
    label.textContent = "Instalar App";
  } else {
    topBtn.classList.remove("installed");
    label.textContent = "Descargar App";
  }
}

export async function triggerAppDownloadOrInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      showToast("Instalando ÁNGELES en tu dispositivo...", "success");
      deferredPrompt = null;
      updateInstallButtons();
      return;
    }
  }
  openInstallModal();
}

export function openInstallModal() {
  const modal = document.getElementById("install-modal");
  const body = document.getElementById("install-modal-body");
  if (!modal || !body) return;

  const standalone = isStandaloneMode();
  const ios = isIOSDevice();

  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
      <span class="badge ${standalone ? "badge-green" : "badge-blue"}">
        ${standalone ? "Ejecutando como App Instalada" : "PWA Lista para Instalar"}
      </span>
      <span class="badge ${swReady ? "badge-green" : "badge-gray"}">
        Service Worker: ${swReady ? "Activo (Caché Rápida)" : "Preparado"}
      </span>
    </div>

    <p style="margin-top:0;color:var(--text-secondary);font-size:0.93rem;">
      Instala <strong>ÁNGELES</strong> directamente desde la web para abrirlo en pantalla completa sin barra del navegador, con acceso rápido desde tu pantalla de inicio o escritorio.
    </p>

    <div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;">
      ${
        deferredPrompt
          ? `<button type="button" id="btn-modal-native-install" class="btn btn-primary">Instalar Ahora en este Dispositivo</button>`
          : ""
      }
      <button type="button" id="btn-download-launcher" class="btn btn-download-app">
        Descargar Acceso Directo (.html)
      </button>
    </div>

    <div class="install-steps-list">
      <div class="install-step" style="${ios ? "border-color:var(--blue-700);background:var(--blue-50);" : ""}">
        <h4>iPhone / iPad (iOS Safari)</h4>
        <p>1. Toca el botón <strong>Compartir</strong> (ícono de cuadrado con flecha hacia arriba) en la barra inferior.<br/>
        2. Selecciona <strong>"Agregar a pantalla de inicio"</strong>.<br/>
        3. Confirma en <strong>Agregar</strong> para crear el ícono nativo de <strong>ÁNGELES</strong>.</p>
      </div>
      <div class="install-step">
        <h4>Android (Chrome / Edge / Samsung Internet)</h4>
        <p>Toca el menú <strong>⋮</strong> del navegador y elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</p>
      </div>
      <div class="install-step">
        <h4>Escritorio (Windows, macOS y Linux)</h4>
        <p>En Chrome o Edge, haz clic en el ícono de <strong>Instalar</strong> ubicado a la derecha de la barra de direcciones, o descarga el <strong>Acceso Directo (.html)</strong> con el botón verde superior.</p>
      </div>
    </div>
  `;

  document.getElementById("btn-download-launcher")?.addEventListener("click", () => {
    const targetUrl = `${window.location.origin}/angeles/dashboard`;
    const html = `<!DOCTYPE html><html lang="es-MX"><head><meta charset="UTF-8"/><meta http-equiv="refresh" content="0; url=${targetUrl}"/><title>Abrir ÁNGELES</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px;"><h1>ÁNGELES — Ángeles de Esperanza A.C.</h1><p>Abriendo aplicación en <a href="${targetUrl}">${targetUrl}</a>...</p></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Angeles-App-AccesoDirecto.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Acceso directo descargado correctamente.", "success");
  });

  const nativeBtn = document.getElementById("btn-modal-native-install");
  if (nativeBtn && deferredPrompt) {
    nativeBtn.addEventListener("click", async () => {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateInstallButtons();
      closeInstallModal();
    });
  }

  modal.classList.remove("hidden");
}

export function closeInstallModal() {
  const modal = document.getElementById("install-modal");
  if (modal) modal.classList.add("hidden");
}
