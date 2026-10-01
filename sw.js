const CACHE = 'lekplatskontroll-v21';
const ASSETS = ['./', './index.html', './app.js?v=21', './parks-data.js', './workbook-data.js', './styles.css?v=21', './assets/owl-banner.png', './vendor/xlsx.mini.min.js', './data/lekplatskontroll.xlsx'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lekplatskontroll-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // One workbook keeps assignments and element checklists together during updates.
  if (new URL(event.request.url).pathname.endsWith('/data/lekplatskontroll.xlsx')) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(event.request, {ignoreSearch: true})) || Response.error();
      }
    }));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
