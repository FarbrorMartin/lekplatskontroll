const CACHE = 'lekplatskontroll-app';
const WORKBOOK_CACHE = 'lekplatskontroll-workbook';
const ASSETS = ['./', './index.html', './app.js', './parks-data.js', './workbook-data.js', './styles.css', './assets/owl-banner.png', './vendor/xlsx.mini.min.js'];
const SCOPE = new URL('./', self.location).pathname;

// Every file is downloaded before any is replaced, so a page never mixes two releases.
async function refreshAssets() {
  const responses = await Promise.all(ASSETS.map(async url => {
    const response = await fetch(url, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response;
  }));
  const cache = await caches.open(CACHE);
  await Promise.all(responses.map((response, i) => cache.put(ASSETS[i], response)));
}

self.addEventListener('install', event => {
  event.waitUntil(refreshAssets());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lekplatskontroll-') && key !== CACHE && key !== WORKBOOK_CACHE).map(key => caches.delete(key)))));
});
// The saved app opens immediately; a new release is used from the next start.
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // The app validates the workbook before storing its offline copy.
  if (url.pathname.endsWith('/data/lekplatskontroll.xlsx')) return;
  const isApp = request.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`);
  if (isApp) event.waitUntil(refreshAssets().catch(() => {}));
  event.respondWith(caches.match(isApp ? './index.html' : request).then(cached => cached || fetch(request)));
});
