const CACHE = 'lekplatskontroll-v3';
const ASSETS = ['./', './index.html', './app.js', './parks-data.js', './csv-data.js', './styles.css', './data/lekplatser.csv', './data/kontrollpunkter.csv'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lekplatskontroll-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Matrices are fetched as a pair below; never cache only half an updated configuration.
  if (new URL(event.request.url).pathname.endsWith('/data/lekplatser.csv') || new URL(event.request.url).pathname.endsWith('/data/kontrollpunkter.csv')) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      try {
        const [parks, checks] = await Promise.all(['./data/lekplatser.csv', './data/kontrollpunkter.csv'].map(url => fetch(url, {cache: 'no-cache'})));
        if (!parks.ok || !checks.ok) return fetch(event.request);
        await Promise.all([cache.put('./data/lekplatser.csv', parks), cache.put('./data/kontrollpunkter.csv', checks)]);
      } catch (_) { /* Use the last cached pair while offline. */ }
      return (await cache.match(event.request, {ignoreSearch: true})) || Response.error();
    }));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
