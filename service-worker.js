const CACHE_NAME = 'SINET_CACHE_v16.0.0.118.29';
const CORE_ASSETS = [
  './',
  './index.html',
  './index-nosw.html',
  './manifest.json',
  './favicon.ico',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './css/main.css',
  './css/sinet-quickbar.css',
  './style.css',
  './js/app.js',
  './js/db/indexed-db.js',
  './js/catalog-list.js',
  './js/sinet-profiles-core.js',
  './js/sinet-shared-context.js',
  './js/sinet-ui-standards.js',
  './js/sinet-quickbar.js',
  './js/sinet-integrative-engine.js',
  './js/sinet-frequency-canonical.js',
  './js/sinet-item-shell.js',
  './js/sinet-page-nav.js',
  './js/sinet-export-renderer.js',
  './data/SINET_CATALOG.json',
  './data/SINET_STL.json',
  './data/mkb10_sr.json',
  './data/freq_catalog.json',
  './anamneza.html',
  './mobile-qa.html',
  './DS-Generator.html',
  './pages/integrativna_biblioteka.html',
  './pages/integrativni_vodic.html',
  './pages/tai_chi.html',
  './pages/narodne_metode.html',
  './docs/protokoli/27_NARODNE_METODE_v1.0_SR.html',
  './data/narodne_metode/enciklopedija/sinet_paprikas_split.json',
  './data/narodne_metode/enciklopedija/paprikas_hub_candidates.json',
  './data/narodne_metode/enciklopedija/sinet_review_priority.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(async (asset) => {
      try { await cache.add(asset); } catch (_) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isData = url.pathname.endsWith('.json');
  const isCode = /\.(js|css)$/.test(url.pathname);
  const preferNetwork = isDocument || isData || isCode;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (preferNetwork) {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (isDocument) {
          return (await cache.match('./index-nosw.html')) || Response.error();
        }
        return Response.error();
      }
    }

    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      return Response.error();
    }
  })());
});
