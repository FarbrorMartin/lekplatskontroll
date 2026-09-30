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
  confirm: () => true, location: {protocol: 'file:'}, navigator: {},
  window: {location: {}, history, addEventListener: (name, callback) => {listeners[name] = callback;}},
  document: {readyState: 'loading', getElementById: node, querySelector: node,
    querySelectorAll: () => [],
    addEventListener() {}, activeElement: node('opener')},
  localStorage: {getItem: key => stored.get(key) || null,
    setItem(key, value) {if (failStorage) throw Error('quota'); stored.set(key, value);}}
});
vm.runInContext(fs.readFileSync('parks-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('csv-data.js', 'utf8'), context);
context.playgroundCsv = fs.readFileSync('data/lekplatser.csv', 'utf8');
context.checkCsv = fs.readFileSync('data/kontrollpunkter.csv', 'utf8');
vm.runInContext('const config = buildConfiguration(playgroundCsv, checkCsv); FEATURE_TYPES = config.featureTypes; MUNICIPAL_PARKS = config.parks;', context);
let source = fs.readFileSync('app.js', 'utf8');
source = source.replace('  if (document.readyState === "loading")', `
  globalThis.test = {init, appState, saveDraft, saveCurrentFeature, loadStorage,
    generateReportText, calculateParkProgress, startNewSurvey, finishAndClosePark,
    escapeHtml, persistData, getPark, updateGlobalStats, fallbackCopyText, navigateTo,
    answers: value => { currentFormAnswers = value; }};
  if (document.readyState === "loading")`);
vm.runInContext(source, context);
const app = context.test;
app.init();
app.navigateTo('overview', {parkId: 'lekplats-01'});
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
app.appState.selectedParkId = 'lekplats-01';
app.appState.selectedFeatureId = 'Gångbro';
const count = vm.runInContext('FEATURE_TYPES["Gångbro"].points.length', context);
const answers = Object.fromEntries(Array.from({length: count}, (_, i) => [i, {status: 'ok', note: ''}]));
answers[0] = {status: 'issue', note: '</textarea><img src=x>'};
app.answers(answers);
app.saveDraft();
history.back();
history.forward();
assert.equal(app.appState.surveyData['lekplats-01'].features['Gångbro'].points[0].note, answers[0].note);
assert.equal(app.calculateParkProgress('lekplats-01').completed, 0);
app.appState.surveyData = {};
app.loadStorage();
assert.equal(app.appState.surveyData['lekplats-01'].features['Gångbro'].points[0].note, answers[0].note);
app.appState.settings.inspectorName = 'Abdi';
assert.match(app.generateReportText(app.getPark('lekplats-01')), /Besiktningsman: Lasse/);
assert.equal(app.generateReportText(app.getPark('lekplats-01')), app.generateReportText(app.getPark('lekplats-01')));
assert.equal(app.escapeHtml('</textarea>'), '&lt;/textarea&gt;');
answers[0].note = '   ';
app.answers(answers);
app.saveCurrentFeature();
assert.equal(app.calculateParkProgress('lekplats-01').completed, 0);
answers[0].note = 'Trasig bult';
app.saveCurrentFeature();
assert.equal(app.calculateParkProgress('lekplats-01').completed, 1);
assert.equal(app.appState.currentScreen, 'overview');
history.back();
assert.equal(app.appState.currentScreen, 'parks');
app.navigateTo('overview', {parkId: 'lekplats-01'});
app.updateGlobalStats();
assert.equal(node('stat-completed').textContent, 0);
app.appState.selectedParkId = 'lekplats-01';
const oldReport = app.generateReportText(app.getPark('lekplats-01'));
vm.runInContext('FEATURE_TYPES["Gångbro"].points.reverse();', context);
assert.equal(app.generateReportText(app.getPark('lekplats-01')), oldReport);
vm.runInContext('FEATURE_TYPES["Gångbro"].points.reverse();', context);
app.startNewSurvey();
assert.equal(app.calculateParkProgress('lekplats-01').completed, 0);
assert.equal(app.appState.surveyData['lekplats-01'].history[0].report, oldReport);
app.finishAndClosePark();
assert.equal(app.appState.surveyData['lekplats-01'].status, 'not-started');
const survey = app.appState.surveyData['lekplats-01'];
for (const id of app.getPark('lekplats-01').featureIds) {
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
