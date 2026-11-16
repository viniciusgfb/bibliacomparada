// Bíblia Comparada — cache offline progressivo para todas as 24 traduções do catálogo.
const CACHE = 'biblia-comparada-v23-offline-24';
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const BIBLES = ['ARC', 'AA', 'RC69', 'BPT09', 'NVI2011', 'AVM', 'MATOS', 'PASTORAL'].map(code => `./data/${code}.json`);
const PRECACHE = [...SHELL, ...BIBLES];
self.addEventListener('install', event => {
  // Mantém os oito JSONs incluídos e o aplicativo disponíveis na instalação; os demais são baixados progressivamente pelo app.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('biblia-comparada-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const isBible = /\/data\/[^/]+\.json$/i.test(url.pathname);
  if (isBible) {
    event.respondWith((async () => {
      const cached = await caches.match(request, {ignoreSearch: true});
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })());
    return;
  }
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request, {ignoreSearch: true});
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
