const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {textContent: '', value: '', style: {}, hidden: true,
    classList: {add() {}, remove() {}}, addEventListener() {}, focus() {},
    querySelectorAll: () => [], querySelector: () => node('child'),
    checkValidity: () => true, reportValidity() {}, setAttribute() {}, setCustomValidity(message) {this.validationMessage = message;}});
  return nodes.get(id);
}
let stored = new Map();
let failStorage = false;
const listeners = {};
const entries = [null];
let entryIndex = 0;
const history = {
  get state() { return entries[entryIndex]; },
  replaceState(state, _, url) { entries[entryIndex] = state; if (url) context.location.href = url; },
  pushState(state) { entries.splice(++entryIndex); entries[entryIndex] = state; },
  back() { if (entryIndex > 0) { entryIndex--; listeners.popstate({state: this.state}); } },
  forward() { if (entryIndex + 1 < entries.length) { entryIndex++; listeners.popstate({state: this.state}); } }
};
const context = vm.createContext({console, Date, URL, setTimeout: () => 0, clearTimeout() {},
  confirm: () => true, location: {protocol: 'file:', href: 'http://localhost:8080/'}, navigator: {}, XLSX: require('./vendor/xlsx.mini.min.js'),
  window: {location: {}, history, addEventListener: (name, callback) => {listeners[name] = callback;}},
  document: {readyState: 'loading', getElementById: node, querySelector: node,
    querySelectorAll: () => [],
    addEventListener() {}, activeElement: node('opener')},
  localStorage: {getItem: key => stored.get(key) || null,
    removeItem(key) {if (failStorage) throw Error('blocked'); stored.delete(key);},
    setItem(key, value) {if (failStorage) throw Error('quota'); stored.set(key, value);}}
});
vm.runInContext(fs.readFileSync('parks-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('workbook-data.js', 'utf8'), context);
context.workbookBytes = fs.readFileSync('data/lekplatskontroll.xlsx');
vm.runInContext('const config = configurationFromWorkbook(XLSX.read(workbookBytes)); FEATURE_TYPES = config.featureTypes; MUNICIPAL_PARKS = config.parks;', context);
let source = fs.readFileSync('app.js', 'utf8');
source = source.replace('  if (document.readyState === "loading")', `
  globalThis.test = {init, appState, saveDraft, getFeatureStatus, loadStorage, resetStorageFromUrl, clearAllData, reconcileInspections,
    generateReportText, calculateParkProgress, startNewSurvey, finishAndClosePark,
    escapeHtml, persistData, getPark, updateGlobalStats, fallbackCopyText, navigateTo,
    answers: value => { currentFormAnswers = value; }};
  if (document.readyState === "loading")`);
vm.runInContext(source, context);
const app = context.test;
const parkId = vm.runInContext('MUNICIPAL_PARKS[0].id', context);
app.init();
app.appState.settings.inspectorName = '   ';
app.navigateTo('overview', {parkId});
assert.equal(app.appState.currentScreen, 'parks');
assert.match(node('input-inspector').validationMessage, /Ange besiktningsmannens namn/);
app.appState.selectedParkId = parkId;
app.appState.selectedFeatureId = 'Gångbro';
app.saveDraft();
assert.equal(app.appState.surveyData[parkId].startedAt, undefined);
app.appState.settings.inspectorName = "Lasse";
app.navigateTo('overview', {parkId: parkId});
app.navigateTo('form', {featureId: 'Gångbro'});
history.back();
assert.equal(app.appState.currentScreen, 'overview');
history.back();
assert.equal(app.appState.currentScreen, 'parks');
history.forward();
history.forward();
assert.equal(app.appState.currentScreen, 'form');
app.init();
assert.equal(app.appState.currentScreen, 'form');
app.appState.selectedParkId = parkId;
app.appState.selectedFeatureId = 'Gångbro';
const count = vm.runInContext('FEATURE_TYPES["Gångbro"].points.length', context);
const answers = Object.fromEntries(Array.from({length: count}, (_, i) => [i, {status: 'ok', note: ''}]));
answers[0] = {status: 'issue', note: '</textarea><img src=x>'};
app.answers(answers);
app.saveDraft();
history.back();
history.forward();
assert.equal(app.appState.surveyData[parkId].features['Gångbro'].points[0].note, answers[0].note);
assert.equal(app.calculateParkProgress(parkId).completed, 1);
assert.equal(app.getFeatureStatus(parkId, "Gångbro").answered, count);
app.appState.surveyData = {};
app.loadStorage();
assert.equal(app.appState.surveyData[parkId].features['Gångbro'].points[0].note, answers[0].note);
app.appState.settings.inspectorName = 'Abdi';
assert.match(app.generateReportText(app.getPark(parkId)), /Besiktningsman: Lasse/);
assert.equal(app.generateReportText(app.getPark(parkId)), app.generateReportText(app.getPark(parkId)));
assert.equal(app.escapeHtml('</textarea>'), '&lt;/textarea&gt;');
answers[0].note = '   ';
app.answers(answers);
app.saveDraft();
assert.equal(app.calculateParkProgress(parkId).completed, 0);
assert.equal(app.getFeatureStatus(parkId, 'Gångbro').answered, count - 1);
assert.equal(app.getFeatureStatus(parkId, 'Gångbro').status, 'in-progress');
app.navigateTo('overview', {parkId});
assert.match(node('btn-send-report').textContent, /^\d+\/\d+ kontroller klara$/);
assert.match(node('features-list-container').innerHTML, /Påbörjad/);
app.navigateTo('form', {featureId: 'Gångbro'});
assert.equal(node('element-progress').textContent, `${count - 1}/${count}`);
answers[0].note = 'Trasig bult';
app.answers(answers);
app.saveDraft();
assert.equal(app.calculateParkProgress(parkId).completed, 1);
assert.equal(node('element-progress').textContent, `${count}/${count}`);
assert.equal(app.appState.currentScreen, 'form');
history.back();
assert.equal(app.appState.currentScreen, 'overview');
history.back();
assert.equal(app.appState.currentScreen, 'parks');
app.navigateTo('overview', {parkId: parkId});
app.updateGlobalStats();
assert.equal(node('stat-completed').textContent, 0);
app.appState.selectedParkId = parkId;
const oldReport = app.generateReportText(app.getPark(parkId));
vm.runInContext('FEATURE_TYPES["Gångbro"].points.reverse();', context);
assert.equal(app.generateReportText(app.getPark(parkId)), oldReport);
vm.runInContext('FEATURE_TYPES["Gångbro"].points.reverse();', context);
app.startNewSurvey();
assert.equal(app.calculateParkProgress(parkId).completed, 0);
assert.equal(app.appState.surveyData[parkId].history[0].report, oldReport);
app.finishAndClosePark();
assert.equal(app.appState.surveyData[parkId].status, 'not-started');
const survey = app.appState.surveyData[parkId];
for (const id of app.getPark(parkId).featureIds) {
  context.typeId = id;
  const size = vm.runInContext('FEATURE_TYPES[typeId].points.length', context);
  survey.features[id] = {completed: true, points: Array.from({length: size}, () => ({status: 'ok', note: ''}))};
}
app.finishAndClosePark();
assert.equal(survey.status, 'reported');
assert.equal(node('stat-completed').textContent, 1);
context.document.createElement = () => ({style: {}, focus() {}, select() {}});
context.document.body = {appendChild() {}, removeChild() {}};
context.document.execCommand = () => false;
app.fallbackCopyText('report');
assert.match(node('toast').textContent, /Kunde inte kopiera/);
failStorage = true;
assert.equal(app.persistData(), false);
assert.equal(node('storage-warning').hidden, false);
failStorage = false;
stored.set('lekplats_survey_v1_data', 'invalid JSON');
app.loadStorage();
assert.equal(app.persistData(), false);
assert.equal(stored.get('lekplats_survey_v1_data'), 'invalid JSON');
stored.set('another_app', 'keep me');
stored.set('lekplats_survey_v1_settings', '{"inspectorName":"Zelda"}');
context.location.href = 'http://localhost:8080/?reset=0';
assert.equal(app.resetStorageFromUrl(), true);
assert.equal(stored.get('lekplats_survey_v1_data'), 'invalid JSON');
context.location.href = 'http://localhost:8080/?reset=1&test=layout#section';
failStorage = true;
assert.equal(app.resetStorageFromUrl(), false);
assert.match(context.location.href, /reset=1/);
failStorage = false;
assert.equal(app.resetStorageFromUrl(), true);
assert.equal(stored.has('lekplats_survey_v1_data'), false);
assert.equal(stored.has('lekplats_survey_v1_settings'), false);
assert.equal(stored.get('another_app'), 'keep me');
assert.equal(context.location.href, 'http://localhost:8080/?test=layout#section');
assert.equal(history.state.screen, 'parks');
stored.set('lekplats_survey_v1_data', '{"test":{}}');
app.appState.settings.inspectorName = 'Zelda';
app.appState.settings.recipientEmail = 'test@example.com';
context.confirm = message => { assert.match(message, /Rapporter som skickats med epost påverkas inte/); return false; };
app.clearAllData();
assert.equal(stored.has('lekplats_survey_v1_data'), true);
assert.equal(app.appState.settings.inspectorName, 'Zelda');
context.confirm = () => true;
app.clearAllData();
assert.equal(stored.has('lekplats_survey_v1_data'), false);
assert.equal(app.appState.settings.inspectorName, '');
assert.equal(node('input-inspector').value, '');
assert.equal(app.appState.settings.recipientEmail, 'test@example.com');
assert.equal(stored.get('another_app'), 'keep me');
// Reconciliation matches text, not position, and never changes a reported survey.
app.appState.settings.inspectorName = 'Zelda';
app.navigateTo('overview', {parkId});
app.navigateTo('form', {featureId: 'Gångbro'});
app.answers(answers);
app.saveDraft();
const beforeUpdate = JSON.parse(JSON.stringify(app.appState.surveyData[parkId]));
context.reconcileParkId = parkId;
vm.runInContext(`
  const originalTypes = JSON.parse(JSON.stringify(FEATURE_TYPES));
  const originalParks = JSON.parse(JSON.stringify(MUNICIPAL_PARKS));
  FEATURE_TYPES['Gångbro'].points = [...FEATURE_TYPES['Gångbro'].points.slice(0, -1).reverse(), 'Ny kontroll'];
  FEATURE_TYPES['Gångbro'].pointIds = FEATURE_TYPES['Gångbro'].points.map((_, i) => 'Gångbro:' + (i + 1));
  FEATURE_TYPES['Nytt element'] = {id: 'Nytt element', name: 'Nytt element', icon: '📋', points: ['Ny punkt'], pointIds: ['Nytt element:1']};
  MUNICIPAL_PARKS.find(p => p.id === reconcileParkId).featureIds.push('Nytt element');
`, context);
assert.equal(app.reconcileInspections(), true);
const reconciled = app.appState.surveyData[parkId];
assert.equal(reconciled.features['Gångbro'].points.at(-1).status, null);
assert.equal(reconciled.features['Gångbro'].points[0].text, beforeUpdate.features['Gångbro'].points.at(-2).text);
assert.equal(reconciled.features['Gångbro'].points[0].status, 'ok');
assert.equal(reconciled.features['Gångbro'].points.find(p => p.text === beforeUpdate.features['Gångbro'].points[0].text).note, 'Trasig bult');
assert.equal(reconciled.features['Nytt element'].points[0].status, null);
assert.equal(app.getFeatureStatus(parkId, 'Gångbro').answered, count - 1);
// Completed but unreported work still updates; reported work remains frozen.
reconciled.status = 'reported';
const reportedCopy = JSON.stringify(reconciled);
vm.runInContext("FEATURE_TYPES['Gångbro'].points[0] = 'Ändrad kontroll';", context);
assert.equal(app.reconcileInspections(), true);
assert.equal(JSON.stringify(app.appState.surveyData[parkId]), reportedCopy);
app.startNewSurvey();
assert.ok(app.getPark(parkId).featureIds.includes('Nytt element'));
assert.equal(app.appState.surveyData[parkId].history.at(-1).report.includes('Ändrad kontroll'), false);
assert.equal(app.getFeatureStatus(parkId, 'Gångbro').answered, 0);
app.navigateTo('form', {featureId: 'Gångbro'});
app.answers({0: {status: 'ok', note: ''}});
app.saveDraft();
const priorFailedUpdate = JSON.stringify(app.appState.surveyData);
vm.runInContext("FEATURE_TYPES['Gångbro'].points[0] = 'Ytterligare ändring';", context);
failStorage = true;
assert.equal(app.reconcileInspections(), false);
assert.equal(JSON.stringify(app.appState.surveyData), priorFailedUpdate);
failStorage = false;
assert.equal(app.reconcileInspections(), true);
assert.equal(app.getFeatureStatus(parkId, 'Gångbro').answered, 0);
assert.equal(app.calculateParkProgress(parkId).started, true);
vm.runInContext('FEATURE_TYPES = originalTypes; MUNICIPAL_PARKS = originalParks;', context);
console.log('Passed: browser back/forward, reload screen restoration, automatic completion, partial progress, draft recovery, inspector attribution, report stability, required notes, HTML escaping, submission confirmation/count, archived report, clipboard/storage failure, corrupt-data protection.');
