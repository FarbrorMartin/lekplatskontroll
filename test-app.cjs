const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {textContent: '', value: '', style: {}, hidden: true,
    classList: {add() {}, remove() {}}, addEventListener() {}, focus() {},
    querySelectorAll: () => [], querySelector: () => node('child'),
    checkValidity: () => true, reportValidity() {}});
  return nodes.get(id);
}
let stored = new Map();
let failStorage = false;
const listeners = {};
const entries = [null];
let entryIndex = 0;
const history = {
  get state() { return entries[entryIndex]; },
  replaceState(state) { entries[entryIndex] = state; },
  pushState(state) { entries.splice(++entryIndex); entries[entryIndex] = state; },
  back() { if (entryIndex > 0) { entryIndex--; listeners.popstate({state: this.state}); } },
  forward() { if (entryIndex + 1 < entries.length) { entryIndex++; listeners.popstate({state: this.state}); } }
};
const context = vm.createContext({console, Date, setTimeout: () => 0, clearTimeout() {},
  confirm: () => true, location: {protocol: 'file:'}, navigator: {}, XLSX: require('./vendor/xlsx.mini.min.js'),
  window: {location: {}, history, addEventListener: (name, callback) => {listeners[name] = callback;}},
  document: {readyState: 'loading', getElementById: node, querySelector: node,
    querySelectorAll: () => [],
    addEventListener() {}, activeElement: node('opener')},
  localStorage: {getItem: key => stored.get(key) || null,
    setItem(key, value) {if (failStorage) throw Error('quota'); stored.set(key, value);}}
});
vm.runInContext(fs.readFileSync('parks-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('workbook-data.js', 'utf8'), context);
context.workbookBytes = fs.readFileSync('data/lekplatskontroll.xlsx');
vm.runInContext('const config = configurationFromWorkbook(XLSX.read(workbookBytes)); FEATURE_TYPES = config.featureTypes; MUNICIPAL_PARKS = config.parks;', context);
let source = fs.readFileSync('app.js', 'utf8');
source = source.replace('  if (document.readyState === "loading")', `
  globalThis.test = {init, appState, saveDraft, saveCurrentFeature, loadStorage,
    generateReportText, calculateParkProgress, startNewSurvey, finishAndClosePark,
    escapeHtml, persistData, getPark, updateGlobalStats, fallbackCopyText, navigateTo,
    answers: value => { currentFormAnswers = value; }};
  if (document.readyState === "loading")`);
vm.runInContext(source, context);
const app = context.test;
const parkId = vm.runInContext('MUNICIPAL_PARKS[0].id', context);
app.init();
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
assert.equal(app.calculateParkProgress(parkId).completed, 0);
app.appState.surveyData = {};
app.loadStorage();
assert.equal(app.appState.surveyData[parkId].features['Gångbro'].points[0].note, answers[0].note);
app.appState.settings.inspectorName = 'Abdi';
assert.match(app.generateReportText(app.getPark(parkId)), /Besiktningsman: Lasse/);
assert.equal(app.generateReportText(app.getPark(parkId)), app.generateReportText(app.getPark(parkId)));
assert.equal(app.escapeHtml('</textarea>'), '&lt;/textarea&gt;');
answers[0].note = '   ';
app.answers(answers);
app.saveCurrentFeature();
assert.equal(app.calculateParkProgress(parkId).completed, 0);
answers[0].note = 'Trasig bult';
app.saveCurrentFeature();
assert.equal(app.calculateParkProgress(parkId).completed, 1);
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
console.log('Passed: browser back/forward, reload screen restoration, save-return history, draft recovery, inspector attribution, report stability, required notes, HTML escaping, submission confirmation/count, archived report, clipboard/storage failure, corrupt-data protection.');
