/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

const CACHE_STATIC = "angeles-static-v1.3.0";
const SHELL_URL = "/angeles/";
const OFFLINE_URL = "/angeles/offline.html";

const STATIC_ASSETS = [
  "/angeles/",
  "/angeles/offline.html",
  "/angeles/manifest.json",
  "/angeles/css/styles.css",
  "/angeles/js/app.js",
  "/angeles/js/api.js",
  "/angeles/js/local-engine.js",
  "/angeles/js/pwa.js",
  "/angeles/js/rbac.js",
  "/angeles/js/search.js",
  "/angeles/js/signature-pad.js",
  "/angeles/js/signature-block.js",
  "/angeles/js/views/public-views.js",
  "/angeles/js/views/auth-view.js",
  "/angeles/js/views/register-view.js",
  "/angeles/js/views/dashboard-view.js",
  "/angeles/js/views/patients-view.js",
  "/angeles/js/views/chart-view.js",
  "/angeles/js/views/expansion-view.js",
  "/angeles/js/views/admin-view.js",
  "/angeles/assets/hero-courtyard.jpg",
  "/angeles/assets/icons/icon-72x72.png",
  "/angeles/assets/icons/icon-96x96.png",
  "/angeles/assets/icons/icon-128x128.png",
  "/angeles/assets/icons/icon-144x144.png",
  "/angeles/assets/icons/icon-152x152.png",
  "/angeles/assets/icons/icon-192x192.png",
  "/angeles/assets/icons/icon-384x384.png",
  "/angeles/assets/icons/icon-512x512.png",
  "/angeles/assets/icons/apple-touch-icon.png",
  "/angeles/assets/icons/favicon-32x32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Estrategia Network-First para datos clínicos dinámicos (/api/*)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({
            detail: "Sin conexión a internet. Sus borradores locales se mantienen resguardados en este dispositivo.",
            offline: true
          }),
          { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } }
        )
      )
    );
    return;
  }

  // 2. Navegación HTML dentro de /angeles/: Network-First con respaldo en shell o offline.html
  if (request.mode === "navigate" && url.pathname.startsWith("/angeles")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match(SHELL_URL);
          if (cachedShell) return cachedShell;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 3. Estrategia Cache-First para activos estáticos bajo /angeles/
  if (url.pathname.startsWith("/angeles/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && url.origin === self.location.origin) {
              const copy = response.clone();
              caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
    );
  }
});
