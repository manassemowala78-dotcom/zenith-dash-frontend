const CACHE_VERSION = "zd-v10.1.0";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon.png", "/css/app.css?v=10.1.0", "/css/icons.css?v=10.1.0", "/css/icons.woff2?v=10.1.0", "/js/vendor/qrcode.min.js?v=10.1.0", "/js/base-1.js?v=10.1.0", "/js/securite-roles.js?v=10.1.0", "/js/hors-ligne.js?v=10.1.0", "/js/facturation.js?v=10.1.0", "/js/stock-caisse.js?v=10.1.0", "/js/rh-paie.js?v=10.1.0", "/js/compta-ohada.js?v=10.1.0", "/js/marketing.js?v=10.1.0", "/js/plateforme.js?v=10.1.0", "/js/accueil-aide.js?v=10.1.0", "/js/import.js?v=10.1.0", "/js/achats.js?v=10.1.0", "/js/relances-auto.js?v=10.1.0", "/js/boutique.js?v=10.1.0", "/js/projets.js?v=10.1.0", "/js/immobilisations-rapports.js?v=10.1.0", "/js/rendez-vous.js?v=10.1.0", "/js/cabinet.js?v=10.1.0", "/js/listes.js?v=10.1.0", "/js/juridique.js?v=10.1.0", "/js/contacts-confidentialite.js?v=10.1.0", "/js/secteurs.js?v=10.1.0", "/js/restaurant.js?v=10.1.0", "/js/bar.js?v=10.1.0", "/js/froid.js?v=10.1.0", "/js/hotel.js?v=10.1.0", "/js/salon.js?v=10.1.0", "/js/commerce.js?v=10.1.0", "/js/commandes.js?v=10.1.0", "/js/abonnements.js?v=10.1.0", "/js/coeur-1.js?v=10.1.0", "/js/coeur-2.js?v=10.1.0", "/js/coeur-3.js?v=10.1.0", "/js/v93.js?v=10.1.0", "/js/bar-fiche.js?v=10.1.0", "/js/ecole.js?v=10.1.0", "/js/ambassade.js?v=10.1.0", "/js/pointage.js?v=10.1.0", "/js/espaces.js?v=10.1.0", "/js/reductions.js?v=10.1.0", "/js/premiers-reglages.js?v=10.1.0", "/js/annuaire.js?v=10.1.0", "/js/notifs.js?v=10.1.0", "/js/appels.js?v=10.1.0", "/js/comptes.js?v=10.1.0", "/js/messagerie.js?v=10.1.0", "/js/paiement.js?v=10.1.0", "/js/securite-v99.js?v=10.1.0", "/js/verrou-v100.js?v=10.1.0", "/js/apparence-v100.js?v=10.1.0", "/js/reset-v101.js?v=10.1.0", "/reponse.html", "/js/reponse.js?v=10.1.0", "/js/i18n/fr.js?v=10.1.0"];
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

function zdBadge(n) {
  try {
    const nav = self.navigator;
    if (!nav || !("setAppBadge" in nav)) return;
    if (n > 0) nav.setAppBadge(n).catch(() => {}); else nav.clearAppBadge().catch(() => {});
  } catch (_) {}
}
async function zdClear(m) {
  const list = await self.registration.getNotifications();
  const keepN = Array.isArray(m.keep_nids) ? new Set(m.keep_nids) : null;
  const keepC = Array.isArray(m.keep_convs) ? new Set(m.keep_convs) : null;
  for (const n of list) {
    const d = n.data || {};
    if (Array.isArray(m.tags) && m.tags.includes(n.tag)) { n.close(); continue; }
    if (d.type === "call" && d.call_id) continue;
    if (m.conv_id && d.conv_id === m.conv_id && !d.nid) { n.close(); continue; }
    if (m.nid && d.nid === m.nid) { n.close(); continue; }
    if (keepN && d.nid && !keepN.has(d.nid)) { n.close(); continue; }
    if (keepC && !d.nid && d.conv_id && !keepC.has(d.conv_id)) { n.close(); continue; }
  }
  if (typeof m.badge === "number") zdBadge(m.badge);
}
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "zd-clear") { event.waitUntil(zdClear(event.data).catch(() => null)); return; }
  if (event.data && event.data.type === "skip-waiting") self.skipWaiting();
  if (event.data && event.data.type === "cache-urls" && Array.isArray(event.data.urls)) {
    const urls = event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/js/"));
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => Promise.all(urls.map(async (u) => { if (!(await cache.match(u))) await cache.add(u).catch(() => null); }))));
  }
});

const ZD_API = (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") ? "http://localhost:8000/v1"
  : (self.location.hostname.includes("staging") ? "https://zenith-dash-staging.up.railway.app/v1" : "https://zenith-dash-production.up.railway.app/v1");
const ZD_PUSH_TXT = {
  fr: { answer: "Répondre", decline: "Refuser", callback: "Rappeler", reply: "Répondre", react: "Réagir", ph: "Ta réponse…", sent: "Réponse envoyée", reacted: "Réaction envoyée", fail: "Envoi impossible : ouvre Zenith Dash" },
  en: { answer: "Answer", decline: "Decline", callback: "Call back", reply: "Reply", react: "React", ph: "Your reply…", sent: "Reply sent", reacted: "Reaction sent", fail: "Could not send: open Zenith Dash" },
  es: { answer: "Contestar", decline: "Rechazar", callback: "Devolver la llamada", reply: "Responder", react: "Reaccionar", ph: "Tu respuesta…", sent: "Respuesta enviada", reacted: "Reacción enviada", fail: "No se pudo enviar: abre Zenith Dash" },
  ar: { answer: "رد على المكالمة", decline: "رفض", callback: "معاودة الاتصال", reply: "رد", react: "تفاعل", ph: "ردك…", sent: "تم إرسال الرد", reacted: "تم إرسال التفاعل", fail: "تعذر الإرسال: افتح Zenith Dash" },
  sw: { answer: "Pokea", decline: "Kataa", callback: "Piga tena", reply: "Jibu", react: "Itikia", ph: "Jibu lako…", sent: "Jibu limetumwa", reacted: "Itikio limetumwa", fail: "Imeshindikana: fungua Zenith Dash" },
  ln: { answer: "Kozongisa", decline: "Koboya", callback: "Kobenga lisusu", reply: "Yanola", react: "Pesa likanisi", ph: "Eyano na yo…", sent: "Eyano etindami", reacted: "Likanisi etindami", fail: "Ekoki te: fungola Zenith Dash" },
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
  if (data.type === "call_close") {
    event.waitUntil((async () => {
      try { (await self.registration.getNotifications({ tag: data.close_tag || `call-${data.call_id}` })).forEach((n) => n.close()); } catch (_) {}
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      list.forEach((c) => { try { c.postMessage({ type: "zd-call-closed", call_id: data.call_id }); } catch (_) {} });
    })());
    return;
  }
  const tx = zdPushTxt();
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/", reply: data.reply || null, msg_id: data.msg_id || null, conv_id: data.conv_id || null, react: data.react || "👍",
      nid: data.nid || null, type: data.type || null, call_id: data.call_id || null, call_kind: data.call_kind || null, callback: data.callback || null },
    silent: !!data.silent,
  };
  const ringing = data.type === "call" && data.ring;
  if (data.vibrate !== false && !data.silent) options.vibrate = ringing ? [800, 400, 800, 400, 800, 400, 800, 400, 800] : [120, 60, 120];
  if (data.tag) { options.tag = data.tag; options.renotify = !data.silent; }
  if (ringing) {
    options.requireInteraction = true;
    options.actions = [{ action: "call-answer", title: tx.answer }, { action: "call-decline", title: tx.decline }];
  } else if (data.callback && data.reply) {
    options.actions = [{ action: "call-back", title: tx.callback }, { action: "reply", type: "text", title: tx.reply, placeholder: tx.ph }];
  } else if (data.reply && data.msg_id) {
    options.actions = [
      { action: "reply", type: "text", title: tx.reply, placeholder: tx.ph },
      { action: "react", title: `${tx.react} ${data.react || "👍"}` },
    ];
  }
  event.waitUntil((async () => {
    if (data.close_tag) { try { (await self.registration.getNotifications({ tag: data.close_tag })).forEach((n) => n.close()); } catch (_) {} }
    if (typeof data.badge === "number") zdBadge(data.badge);
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
    if (d.type === "call" && d.call_id) {
      const base = `/?p=messaging&c=${encodeURIComponent(d.conv_id || "")}&call=${encodeURIComponent(d.call_id)}`;
      if (event.action === "call-decline") {
        try { if (d.reply) await zdQuick(`${encodeURIComponent(d.reply)}/call/${encodeURIComponent(d.call_id)}/decline`, {}); } catch (_) {}
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        list.forEach((c) => { try { c.postMessage({ type: "zd-call-declined", call_id: d.call_id }); } catch (_) {} });
        return;
      }
      if (event.action === "call-answer") return zdOpen(`${base}&answer=1&kind=${d.call_kind === "video" ? "video" : "audio"}`);
      return zdOpen(base);
    }
    if (event.action === "call-back" && d.conv_id) return zdOpen(`/?p=messaging&c=${encodeURIComponent(d.conv_id)}&callback=${d.callback === "video" ? "video" : "audio"}`);
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
