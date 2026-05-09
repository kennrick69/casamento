// Service Worker — Voem. Wedding Platform
// Strategy: stale-while-revalidate for pages, cache-first for static assets

const CACHE_VERSION = "casamento-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMG_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_STATIC = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Install: precache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_STATIC))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Skip: API calls, Next.js internal, auth routes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/verify-email") ||
    url.pathname.startsWith("/aceitar-termos")
  ) return;

  // Static assets (JS/CSS bundles): cache-first, long TTL
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached ?? fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Images: cache-first, store up to 50 images
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico)$/) ||
    url.pathname.startsWith("/_next/image")
  ) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request);
        cache.put(e.request, res.clone());
        // Trim image cache to 50 entries
        const keys = await cache.keys();
        if (keys.length > 50) await cache.delete(keys[0]);
        return res;
      })
    );
    return;
  }

  // HTML pages (event landing): stale-while-revalidate
  if (url.pathname.match(/^\/[^_][^/]*\/?$/) || url.pathname === "/") {
    e.respondWith(
      caches.open(PAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request)
          .then((res) => { cache.put(e.request, res.clone()); return res; })
          .catch(() => cached);
        return cached ?? fetchPromise;
      })
    );
    return;
  }
});
