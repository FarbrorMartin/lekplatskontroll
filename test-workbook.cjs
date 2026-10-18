const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const XLSX = require('./vendor/xlsx.mini.min.js');
const {fixtureWorkbookBytes} = require('./test-fixture.cjs');
const ctx = vm.createContext({XLSX, setTimeout, clearTimeout});
vm.runInContext(fs.readFileSync('parks-data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('workbook-data.js', 'utf8'), ctx);
const bytes = fixtureWorkbookBytes();
const workbook = () => XLSX.read(bytes);
const rows = name => ctx.readWorkbookRows(workbook(), name);
const parks = rows('Lekplatsmatris'), checks = rows('Element');
const config = ctx.configurationFromWorkbook(workbook());
const parkCount = parks.slice(1).filter(row => row[0]).length;
assert.equal(config.parks.length, parkCount);
assert.equal(Object.keys(config.featureTypes).length, checks[0].filter(Boolean).length);
assert.deepEqual([...config.parks[0].featureIds], ['Gångbro', 'Skulptur', 'Lekhus']);
assert.equal(config.featureTypes.Skulptur.points.length, 3);
assert.equal(config.featureTypes['Gångbro'].pointIds[0], 'Gångbro:1');
assert.equal(config.featureTypes['Gångbro'].points.length, 6);
assert.equal(config.featureTypes['Spång'].points.length, 5);
assert.equal(config.featureTypes.Lekhus.points.length, 5);
assert.equal(config.featureTypes.Lekhus.points[0], config.featureTypes['Gångbro'].points[0]);
const reversed = workbook(); reversed.SheetNames.reverse();
assert.equal(ctx.configurationFromWorkbook(reversed).parks.length, parkCount);
const missing = workbook(); delete missing.Sheets.Element;
assert.throws(() => ctx.configurationFromWorkbook(missing), /saknas/);
const decorated = workbook(); decorated.Sheets.Lekplatsmatris['!ref'] = 'A1:J30';
assert.equal(ctx.configurationFromWorkbook(decorated).parks.length, parkCount);
const badMarker = workbook(); badMarker.Sheets.Lekplatsmatris.B2.v = 'Ja';
assert.throws(() => ctx.configurationFromWorkbook(badMarker), /Använd X/);
const edited = workbook(); edited.Sheets.Lekplatsmatris.C2 = {t: 's', v: 'x'};
assert.ok(ctx.configurationFromWorkbook(edited).parks[0].featureIds.includes('Spång'));
const added = workbook();
// Simulate extending the matrix in Excel: a new row is read without code changes.
for (const [index, value] of ['Ny lekplats', 'X', '', '', ''].entries()) {
  added.Sheets.Lekplatsmatris[XLSX.utils.encode_cell({r: parkCount + 1, c: index})] = {t: 's', v: value};
}
added.Sheets.Lekplatsmatris['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: parkCount + 1, c: parks[0].length - 1}});
assert.equal(ctx.configurationFromWorkbook(added).parks.length, parkCount + 1);
const duplicate = parks.map(row => [...row]); duplicate[2][0] = duplicate[1][0];
assert.throws(() => ctx.buildConfiguration(duplicate, checks), /dubbla/);
const unsafe = parks.map(row => [...row]); unsafe[1][0] = '__proto__';
assert.equal(ctx.buildConfiguration(unsafe, checks).parks[0].id, 'lekplats:__proto__');
const swappedParks = [parks[0], ...parks.slice(1).reverse()];
assert.equal(ctx.buildConfiguration(swappedParks, checks).parks.find(park => park.name === config.parks[0].name).id, config.parks[0].id);
assert.equal(ctx.playgroundKey('  Ängens LEKPLATS '), ctx.playgroundKey('Ängens lekplats'));
assert.equal(ctx.playgroundKey('Ängens lekplats'.normalize('NFD')), ctx.playgroundKey('Ängens lekplats'));
const unmatched = checks.map(row => [...row]); unmatched[0][0] = 'Bro';
assert.throws(() => ctx.buildConfiguration(parks, unmatched), /Elementnamnen/);
const noChecks = checks.map((row, r) => row.map(value => r > 0 ? '' : value));
assert.throws(() => ctx.buildConfiguration(parks, noChecks), /saknar kontroller/);
const reordered = checks.map(row => [...row].reverse());
assert.deepEqual([...ctx.buildConfiguration(parks, reordered).featureTypes['Gångbro'].points], [...config.featureTypes['Gångbro'].points]);
const gap = checks.map(row => [...row]); gap.splice(2, 0, ['', '', '', '']);
assert.deepEqual([...ctx.buildConfiguration(parks, gap).featureTypes['Gångbro'].points], [...config.featureTypes['Gångbro'].points]);
const duplicateCheck = checks.map(row => [...row]); duplicateCheck[2][0] = duplicateCheck[1][0];
assert.throws(() => ctx.buildConfiguration(parks, duplicateCheck), /dubbla/);
const missingHeader = checks.map(row => [...row]); missingHeader[0][0] = '';
assert.throws(() => ctx.buildConfiguration(parks, missingHeader), /Elementrubriker/);
const error = workbook(); error.Sheets.Element.A2 = {t: 'e', v: 23};
assert.throws(() => ctx.configurationFromWorkbook(error), /Excel-fel/);
const formula = workbook(); formula.Sheets.Element.B2 = {t: 's', f: 'A2'};
assert.throws(() => ctx.configurationFromWorkbook(formula), /beräknat värde/);
const okResponse = () => ({ok: true, clone: () => ({arrayBuffer: async () => bytes})});
const stored = [];
ctx.fetch = async () => okResponse();
ctx.caches = {open: async () => ({match: async () => stored.at(-1), put: async (_, response) => { stored.push({arrayBuffer: async () => bytes}); }})};
(async () => {
  // Without a saved copy the workbook is fetched and saved for offline use.
  await ctx.loadConfiguration();
  assert.equal(vm.runInContext('MUNICIPAL_PARKS.length', ctx), parkCount);
  assert.equal(stored.length, 1);
  // Starting the app asks the server first and saves the new copy.
  await ctx.loadConfiguration();
  assert.equal(stored.length, 2);
  // Offline, the saved copy is used without a warning.
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.equal((await ctx.loadConfiguration()).warning, '');
  assert.equal(vm.runInContext('MUNICIPAL_PARKS.length', ctx), parkCount);
  // A failed update keeps the previous forms.
  await assert.rejects(ctx.updateConfiguration(), /Ingen kontakt med servern/);
  ctx.fetch = async () => ({ok: false, status: 404});
  await assert.rejects(ctx.updateConfiguration(), /404/);
  const broken = workbook(); broken.Sheets.Lekplatsmatris.B2 = {t: 's', v: 'Ja'};
  const brokenBytes = XLSX.write(broken, {type: 'buffer', bookType: 'xlsx'});
  ctx.fetch = async () => ({ok: true, clone: () => ({arrayBuffer: async () => brokenBytes})});
  await assert.rejects(ctx.updateConfiguration(), /Använd X/);
  // An invalid new file at startup falls back to the saved copy and says why.
  assert.match((await ctx.loadConfiguration()).warning, /Använd X.*Tidigare formulär används/);
  assert.equal(stored.length, 2);
  assert.equal(vm.runInContext('MUNICIPAL_PARKS.length', ctx), parkCount);
  console.log('Passed: XLSX reading, named tabs/columns, element lists of different lengths, shared wording, blank cells, X assignments, added playgrounds, duplicates, missing headers, mismatched elements, empty checklists, Excel errors, missing formula values, server-first loading with offline fallback, and failed updates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
