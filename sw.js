const CACHE = 'lekplatskontroll-v25';
const ASSETS = ['./', './index.html', './app.js?v=25', './parks-data.js', './workbook-data.js', './styles.css?v=25', './assets/owl-banner.png', './vendor/xlsx.mini.min.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lekplatskontroll-') && key !== CACHE && key !== 'lekplatskontroll-workbook').map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // The app validates the workbook before storing its offline copy.
  if (new URL(event.request.url).pathname.endsWith('/data/lekplatskontroll.xlsx')) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
