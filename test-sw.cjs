// Runs sw.js against a simulated browser: caches, clients and a server whose files can be republished.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const base = 'http://localhost/app/';
const server = {offline: false, published: 'Sun, 18 Oct 2026 10:00:00 GMT', version: 'old', gets: 0};
async function fakeFetch(url, options = {}) {
  if (server.offline) throw new TypeError('Failed to fetch');
  const headers = {'last-modified': server.published};
  if (options.method === 'HEAD') return new Response(null, {headers});
  server.gets++;
  return new Response(`${new URL(url, base).pathname} ${server.version}`, {headers});
}

const stores = new Map();
const key = request => new URL(typeof request === 'string' ? request : request.url, base).href;
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async put(request, response) { entries.set(key(request), response); },
      async match(request) { return entries.get(key(request))?.clone(); }
    };
  },
  async match(request) {
    for (const entries of stores.values()) if (entries.has(key(request))) return entries.get(key(request)).clone();
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};

const handlers = {};
const pages = [];
const self = {location: new URL('sw.js', base), skipWaiting() {},
  addEventListener: (name, handler) => { handlers[name] = handler; },
  clients: {async claim() {}, async matchAll() { return pages; }}};
vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {self, caches, fetch: fakeFetch, URL, Response, Promise, Error, setTimeout, clearTimeout});

async function dispatch(name, extra = {}) {
  let response, work = Promise.resolve();
  handlers[name]({...extra, respondWith(p) { response = p; }, waitUntil(p) { work = p; }});
  await work;
  return response && (await response).text();
}
const open = () => dispatch('fetch', {request: {method: 'GET', mode: 'navigate', url: base}});
const page = () => { const p = {url: base, reloads: 0, messages: [], async navigate() { p.reloads++; }, postMessage(m) { p.messages.push(m); }}; return p; };

(async () => {
  // A phone with an older service worker: the new one installs, clears the old copies and reloads open pages.
  stores.set('lekplatskontroll-v16', new Map());
  const oldPage = page(); pages.push(oldPage);
  await dispatch('install');
  await dispatch('activate');
  assert.deepEqual([...stores.keys()], ['lekplatskontroll-files']);
  assert.equal(oldPage.reloads, 1);

  // Unchanged release: the saved copy opens without downloading anything.
  server.gets = 0;
  assert.equal(await open(), '/app/index.html old');
  assert.equal(server.gets, 0);

  // A new publish is picked up on the next open.
  Object.assign(server, {published: 'Sun, 18 Oct 2026 12:00:00 GMT', version: 'new'});
  assert.equal(await open(), '/app/index.html new');
  assert.equal(await dispatch('fetch', {request: {method: 'GET', mode: 'no-cors', url: `${base}app.js`}}), '/app/app.js new');

  // Offline, the saved copy opens silently.
  server.offline = true;
  assert.equal(await open(), '/app/index.html new');
  server.offline = false;

  // A page returning to the foreground is told about a new publish, and only then.
  const openPage = page();
  await dispatch('message', {data: 'check-update', source: openPage});
  assert.deepEqual(openPage.messages, []);
  Object.assign(server, {published: 'Sun, 18 Oct 2026 14:00:00 GMT', version: 'newer'});
  await dispatch('message', {data: 'check-update', source: openPage});
  assert.deepEqual(openPage.messages, ['updated']);

  // Updates without older copies do not reload pages.
  await dispatch('activate');
  assert.equal(oldPage.reloads, 1);
  console.log('Passed: service worker replaces old versions, opens saved copy when unchanged, picks up new publishes, works offline, reports updates to open pages.');
})().catch(error => { console.error(error); process.exitCode = 1; });
