// Service Worker — Voem. Wedding Platform
// Strategy: stale-while-revalidate for pages, cache-first for static assets

// v3: endurecido contra erros de rede (item 60). Nunca entregamos `undefined`
// ao respondWith (causava "Failed to convert value to 'Response'") e só
// cacheamos respostas ok/não-redirect (não cacheia erro nem redirect).
const CACHE_VERSION = "casamento-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMG_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_STATIC = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Só vale a pena guardar no cache uma resposta completa, de sucesso e não
// redirecionada. Respostas opacas (cross-origin), de erro ou redirect ficam de
// fora — guardá-las quebrava o respondWith depois.
function isCacheable(res) {
  return (
    res &&
    res.ok &&
    !res.redirected &&
    (res.type === "basic" || res.type === "default")
  );
}

// Página offline mínima, pra navegação sem rede e sem cache (em vez de devolver
// undefined ou um erro cru). Sem cor como único canal: texto puro.
function offlinePage() {
  return new Response(
    "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<title>Sem conexão</title></head><body style=\"font-family:system-ui;" +
      "margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;" +
      "text-align:center;padding:24px;color:#3a2a1a;background:#f7eccf\">" +
      "<div><h1 style=\"font-size:18px\">Sem conexão</h1>" +
      "<p style=\"font-size:14px;color:#6b4a2a\">Você está offline. " +
      "Verifique a internet e tente novamente.</p></div></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

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
      (async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (isCacheable(res)) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        } catch {
          // Sem cache e sem rede: deixa o erro de rede propagar (Response.error),
          // nunca undefined.
          return Response.error();
        }
      })()
    );
    return;
  }

  // Images: cache-first, store up to 50 images
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico)$/) ||
    url.pathname.startsWith("/_next/image")
  ) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE);
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (isCacheable(res)) {
            cache.put(e.request, res.clone());
            // Trim image cache to 50 entries
            const keys = await cache.keys();
            if (keys.length > 50) await cache.delete(keys[0]);
          }
          return res;
        } catch {
          return Response.error();
        }
      })()
    );
    return;
  }

  // HTML pages (event landing): stale-while-revalidate
  if (url.pathname.match(/^\/[^_][^/]*\/?$/) || url.pathname === "/") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        const cached = await cache.match(e.request);

        // Revalida em segundo plano; só cacheia respostas ok/não-redirect.
        const network = fetch(e.request)
          .then((res) => {
            if (isCacheable(res)) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => null);

        // Tem cache → entrega na hora e revalida em background.
        if (cached) {
          e.waitUntil(network);
          return cached;
        }

        // Sem cache → espera a rede; se falhar, página offline (nunca undefined).
        const res = await network;
        return res ?? offlinePage();
      })()
    );
    return;
  }
});
