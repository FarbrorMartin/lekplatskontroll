const CACHE = 'lekplatskontroll-files';
const WORKBOOK_CACHE = 'lekplatskontroll-workbook';
const ASSETS = ['./', './index.html', './app.js', './parks-data.js', './workbook-data.js', './styles.css', './assets/owl-banner.png', './vendor/xlsx.mini.min.js'];
const SCOPE = new URL('./', self.location).pathname;
const CHECK_TIMEOUT_MS = 3000;
const DOWNLOAD_TIMEOUT_MS = 15000;

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms); })])
    .finally(() => clearTimeout(timer));
}

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

// GitHub Pages gives every file a new Last-Modified on each publish, so the page's date identifies the release.
const releaseOf = response => response && (response.headers.get('last-modified') || response.headers.get('etag'));

// Resolves true when a newly published release has been saved. Rejects when the server cannot be reached.
async function checkForUpdate() {
  const latest = releaseOf(await withTimeout(fetch('./index.html', {method: 'HEAD', cache: 'no-store'}), CHECK_TIMEOUT_MS));
  if (!latest || latest === releaseOf(await caches.match('./index.html'))) return false;
  await withTimeout(refreshAssets(), DOWNLOAD_TIMEOUT_MS);
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(refreshAssets().then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacy = (await caches.keys()).filter(key => key.startsWith('lekplatskontroll-') && key !== CACHE && key !== WORKBOOK_CACHE);
    await Promise.all(legacy.map(key => caches.delete(key)));
    await self.clients.claim();
    // Pages opened under an older service worker may run old code; reload them once.
    if (legacy.length) {
      const pages = await self.clients.matchAll({type: 'window'});
      await Promise.all(pages.map(page => page.navigate(page.url).catch(() => {})));
    }
  })());
});
// The app asks when it returns to the foreground; a page left open in Safari is never reloaded otherwise.
self.addEventListener('message', event => {
  if (event.data !== 'check-update') return;
  event.waitUntil(checkForUpdate().then(updated => { if (updated) event.source.postMessage('updated'); }).catch(() => {}));
});
// Opening the app checks the server's release first; offline the saved copy opens silently.
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // The app validates the workbook before storing its offline copy.
  if (url.pathname.endsWith('/data/lekplatskontroll.xlsx')) return;
  const isApp = request.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`);
  if (isApp) {
    event.respondWith(checkForUpdate().catch(() => false)
      .then(() => caches.match('./index.html'))
      .then(cached => cached || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
