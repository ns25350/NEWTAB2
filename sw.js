/* Offline app shell. Cache only this NewTab folder; external requests stay untouched. */
"use strict";
const CACHE_PREFIX = `newtab-shell:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}1.0.0`;
const ASSETS = ["./", "./index.html", "./style.css", "./features.css", "./app.js", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isAsset = ASSETS.some(asset => new URL(asset, self.registration.scope).href === url.href);
  if (event.request.method !== "GET" || !isAsset) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { signal: AbortSignal.timeout(4500) });
      if (!response.ok) throw new Error("Offline");
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await caches.match(event.request, { cacheName: CACHE_NAME });
      if (cached) return cached;
      return Response.error();
    }
  })());
});
