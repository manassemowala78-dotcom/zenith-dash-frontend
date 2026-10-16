const CACHE_VERSION = "zd-v9.2.0";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon.png", "/css/app.css?v=9.2.0", "/css/icons.css?v=9.2.0", "/css/icons.woff2?v=9.2.0", "/js/vendor/qrcode.min.js?v=9.2.0", "/js/base-1.js?v=9.2.0", "/js/securite-roles.js?v=9.2.0", "/js/hors-ligne.js?v=9.2.0", "/js/facturation.js?v=9.2.0", "/js/stock-caisse.js?v=9.2.0", "/js/rh-paie.js?v=9.2.0", "/js/compta-ohada.js?v=9.2.0", "/js/marketing.js?v=9.2.0", "/js/plateforme.js?v=9.2.0", "/js/accueil-aide.js?v=9.2.0", "/js/import.js?v=9.2.0", "/js/achats.js?v=9.2.0", "/js/relances-auto.js?v=9.2.0", "/js/boutique.js?v=9.2.0", "/js/projets.js?v=9.2.0", "/js/immobilisations-rapports.js?v=9.2.0", "/js/rendez-vous.js?v=9.2.0", "/js/cabinet.js?v=9.2.0", "/js/listes.js?v=9.2.0", "/js/juridique.js?v=9.2.0", "/js/contacts-confidentialite.js?v=9.2.0", "/js/secteurs.js?v=9.2.0", "/js/restaurant.js?v=9.2.0", "/js/bar.js?v=9.2.0", "/js/froid.js?v=9.2.0", "/js/hotel.js?v=9.2.0", "/js/salon.js?v=9.2.0", "/js/commerce.js?v=9.2.0", "/js/commandes.js?v=9.2.0", "/js/abonnements.js?v=9.2.0", "/js/coeur-1.js?v=9.2.0", "/js/coeur-2.js?v=9.2.0", "/js/coeur-3.js?v=9.2.0", "/js/i18n/fr.js?v=9.2.0"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(APP_SHELL.map((url) => cache.add(new Request(url, { cache: url.includes("?v=") ? "default" : "reload" })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("zd-") && k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const path = new URL(request.url).pathname;
  const isApp = path === "/" || path === "/index.html";
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(isApp ? "/index.html" : request, response.clone());
    return response;
  } catch (e) {
    if (!isApp) {
      const page = await cache.match(request, { ignoreSearch: true });
      if (page) return page;
    }
    return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname.startsWith("/js/") || url.pathname.startsWith("/css/"))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin === self.location.origin && APP_SHELL.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "skip-waiting") self.skipWaiting();
  if (event.data && event.data.type === "cache-urls" && Array.isArray(event.data.urls)) {
    const urls = event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/js/"));
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => Promise.all(urls.map(async (u) => { if (!(await cache.match(u))) await cache.add(u).catch(() => null); }))));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Zenith Dash", body: "Nouvelle notification", url: "/", tag: null };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    try { if (event.data) data.body = event.data.text(); } catch (_) {}
  }
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [120, 60, 120],
  };
  if (data.tag) { options.tag = data.tag; options.renotify = true; }
  event.waitUntil(self.registration.showNotification(data.title || "Zenith Dash", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      client.postMessage({ type: "open-url", url: targetUrl });
      if ("focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
