const CACHE_VERSION = "zd-v9.6.2";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon.png", "/css/app.css?v=9.6.2", "/css/icons.css?v=9.6.2", "/css/icons.woff2?v=9.6.2", "/js/vendor/qrcode.min.js?v=9.6.2", "/js/base-1.js?v=9.6.2", "/js/securite-roles.js?v=9.6.2", "/js/hors-ligne.js?v=9.6.2", "/js/facturation.js?v=9.6.2", "/js/stock-caisse.js?v=9.6.2", "/js/rh-paie.js?v=9.6.2", "/js/compta-ohada.js?v=9.6.2", "/js/marketing.js?v=9.6.2", "/js/plateforme.js?v=9.6.2", "/js/accueil-aide.js?v=9.6.2", "/js/import.js?v=9.6.2", "/js/achats.js?v=9.6.2", "/js/relances-auto.js?v=9.6.2", "/js/boutique.js?v=9.6.2", "/js/projets.js?v=9.6.2", "/js/immobilisations-rapports.js?v=9.6.2", "/js/rendez-vous.js?v=9.6.2", "/js/cabinet.js?v=9.6.2", "/js/listes.js?v=9.6.2", "/js/juridique.js?v=9.6.2", "/js/contacts-confidentialite.js?v=9.6.2", "/js/secteurs.js?v=9.6.2", "/js/restaurant.js?v=9.6.2", "/js/bar.js?v=9.6.2", "/js/froid.js?v=9.6.2", "/js/hotel.js?v=9.6.2", "/js/salon.js?v=9.6.2", "/js/commerce.js?v=9.6.2", "/js/commandes.js?v=9.6.2", "/js/abonnements.js?v=9.6.2", "/js/coeur-1.js?v=9.6.2", "/js/coeur-2.js?v=9.6.2", "/js/coeur-3.js?v=9.6.2", "/js/v93.js?v=9.6.2", "/js/bar-fiche.js?v=9.6.2", "/js/ecole.js?v=9.6.2", "/js/ambassade.js?v=9.6.2", "/js/pointage.js?v=9.6.2", "/js/espaces.js?v=9.6.2", "/js/reductions.js?v=9.6.2", "/js/premiers-reglages.js?v=9.6.2", "/js/annuaire.js?v=9.6.2", "/js/notifs.js?v=9.6.2", "/reponse.html", "/js/reponse.js?v=9.6.2", "/js/i18n/fr.js?v=9.6.2"];
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

const ZD_API = (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") ? "http://localhost:8000/v1"
  : (self.location.hostname.includes("staging") ? "https://zenith-dash-staging.up.railway.app/v1" : "https://zenith-dash-production.up.railway.app/v1");
const ZD_PUSH_TXT = {
  fr: { reply: "Répondre", react: "Réagir", ph: "Ta réponse…", sent: "Réponse envoyée", reacted: "Réaction envoyée", fail: "Envoi impossible : ouvre Zenith Dash" },
  en: { reply: "Reply", react: "React", ph: "Your reply…", sent: "Reply sent", reacted: "Reaction sent", fail: "Could not send: open Zenith Dash" },
  es: { reply: "Responder", react: "Reaccionar", ph: "Tu respuesta…", sent: "Respuesta enviada", reacted: "Reacción enviada", fail: "No se pudo enviar: abre Zenith Dash" },
  ar: { reply: "رد", react: "تفاعل", ph: "ردك…", sent: "تم إرسال الرد", reacted: "تم إرسال التفاعل", fail: "تعذر الإرسال: افتح Zenith Dash" },
  sw: { reply: "Jibu", react: "Itikia", ph: "Jibu lako…", sent: "Jibu limetumwa", reacted: "Itikio limetumwa", fail: "Imeshindikana: fungua Zenith Dash" },
  ln: { reply: "Yanola", react: "Pesa likanisi", ph: "Eyano na yo…", sent: "Eyano etindami", reacted: "Likanisi etindami", fail: "Ekoki te: fungola Zenith Dash" },
};
function zdPushTxt() {
  const l = String((self.navigator && self.navigator.language) || "fr").slice(0, 2);
  return ZD_PUSH_TXT[l] || ZD_PUSH_TXT.fr;
}

self.addEventListener("push", (event) => {
  let data = { title: "Zenith Dash", body: "Nouvelle notification", url: "/", tag: null };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    try { if (event.data) data.body = event.data.text(); } catch (_) {}
  }
  const tx = zdPushTxt();
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/", reply: data.reply || null, msg_id: data.msg_id || null, conv_id: data.conv_id || null, react: data.react || "👍" },
    silent: !!data.silent,
  };
  if (data.vibrate !== false && !data.silent) options.vibrate = [120, 60, 120];
  if (data.tag) { options.tag = data.tag; options.renotify = !data.silent; }
  if (data.reply && data.msg_id) {
    options.actions = [
      { action: "reply", type: "text", title: tx.reply, placeholder: tx.ph },
      { action: "react", title: `${tx.react} ${data.react || "👍"}` },
    ];
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(data.title || "Zenith Dash", options);
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    list.forEach((c) => { try { c.postMessage({ type: "zd-push", cat: data.cat || null }); } catch (_) {} });
  })());
});

async function zdQuick(path, body) {
  const r = await fetch(`${ZD_API}/quick/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(String(r.status));
  return r;
}
async function zdOpen(url) {
  const targetUrl = new URL(url || "/", self.location.origin).href;
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) {
    if (new URL(client.url).origin !== self.location.origin) continue;
    if (new URL(client.url).pathname.startsWith("/reponse")) continue;
    client.postMessage({ type: "open-url", url: targetUrl });
    if ("focus" in client) return client.focus();
  }
  if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
}
async function zdOpenQuick(url) {
  const targetUrl = new URL(url, self.location.origin).href;
  if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
}
async function zdToast(title, body, tag) {
  try { await self.registration.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: tag || "zd-quick", silent: true }); } catch (_) {}
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  const tx = zdPushTxt();
  event.waitUntil((async () => {
    if (event.action === "react" && d.reply && d.msg_id) {
      try { await zdQuick(`${encodeURIComponent(d.reply)}/react`, { message_id: d.msg_id, emoji: d.react || "👍" }); await zdToast(tx.reacted, d.react || "👍", n.tag); }
      catch (_) { await zdOpen(d.url); }
      return;
    }
    if (event.action === "reply" && d.reply) {
      if (event.reply && String(event.reply).trim()) {
        try { await zdQuick(`${encodeURIComponent(d.reply)}/reply`, { content: String(event.reply).trim() }); await zdToast(tx.sent, String(event.reply).trim(), n.tag); return; }
        catch (_) { await zdToast(tx.fail, "", n.tag); }
      }
      return zdOpenQuick(`/reponse.html?t=${encodeURIComponent(d.reply)}&m=${encodeURIComponent(d.msg_id || "")}`);
    }
    const noButtons = !(self.Notification && self.Notification.maxActions > 0);
    if (noButtons && d.reply && d.msg_id) return zdOpenQuick(`/reponse.html?t=${encodeURIComponent(d.reply)}&m=${encodeURIComponent(d.msg_id)}`);
    return zdOpen(d.url);
  })());
});
