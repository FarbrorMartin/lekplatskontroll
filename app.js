/**
 * Lekplatskontroll - Applikationslogik
 */

(function () {
  "use strict";

  // --- LAGRINGSNYCKLAR ---
  const STORAGE_KEY_DATA = "lekplats_survey_v1_data";
  const STORAGE_KEY_SETTINGS = "lekplats_survey_v1_settings";

  let appState = {
    currentScreen: "parks",
    selectedParkId: null,
    selectedFeatureId: null,
    surveyData: {},
    settings: { ...DEFAULT_SETTINGS }
  };

  // --- DOM-ELEMENT ---
  const elBackButton = document.getElementById("btn-back");
  const elNavigationTitle = document.getElementById("navigation-title");

  const elInspectorName = document.getElementById("input-inspector");
  const elScreenParks = document.getElementById("screen-parks");
  const elScreenParkOverview = document.getElementById("screen-park-overview");
  const elScreenFeatureForm = document.getElementById("screen-feature-form");

  const elParksListContainer = document.getElementById("parks-list-container");

  const elStatTotal = document.getElementById("stat-total");
  const elStatCompleted = document.getElementById("stat-completed");
  const elStatIssues = document.getElementById("stat-issues");

  const elElementProgress = document.getElementById("element-progress");
  const elFeaturesListContainer = document.getElementById("features-list-container");

  const elBarParkOverview = document.getElementById("bar-park-overview");
  const elBtnSendReport = document.getElementById("btn-send-report");

  const elControlPointsContainer = document.getElementById("control-points-container");

  // Rapportmodal
  const elModalReport = document.getElementById("modal-report");
  const elBtnCloseReportModal = document.getElementById("btn-close-report-modal");
  const elModalReportSummary = document.getElementById("modal-report-summary");
  const elReportToDisplay = document.getElementById("report-to-display");
  const elReportSubjectDisplay = document.getElementById("report-subject-display");
  const elReportTextContent = document.getElementById("report-text-content");
  const elBtnTriggerEmail = document.getElementById("btn-trigger-email");
  const elBtnCopyReport = document.getElementById("btn-copy-report");
  const elBtnFinishSurvey = document.getElementById("btn-finish-survey");

  // Inställningsmodal
  const elModalSettings = document.getElementById("modal-settings");
  const elBtnCloseSettingsModal = document.getElementById("btn-close-settings-modal");
  const elSettingEmail = document.getElementById("setting-recipient-email");
  const elBtnSaveSettings = document.getElementById("btn-save-settings");
  const elBtnClearAllData = document.getElementById("btn-clear-all-data");
  const elBtnUpdateForms = document.getElementById("btn-update-forms");
  const elUpdateFormsStatus = document.getElementById("update-forms-status");

  const elToast = document.getElementById("toast");

  let currentFormAnswers = {};
  // Reported parks ask once per session before their answers can be changed again.
  const unlockedParks = new Set();

  // --- INITIALISERING ---
  function init() {
    if (!resetStorageFromUrl()) return;
    loadStorage();
    reconcileInspections();
    setupInspectorInput();
    bindEvents();
    renderParksList();
    updateGlobalStats();
    const route = window.history.state;
    if (route && route.app === 'lekplatskontroll') {
      restoreRoute(route);
    } else {
      window.history.replaceState({app: 'lekplatskontroll', screen: 'parks'}, '');
    }
    window.addEventListener('popstate', event => {
      if (event.state && event.state.app === 'lekplatskontroll') restoreRoute(event.state);
    });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // --- LAGRING ---
  function resetStorageFromUrl() {
    const url = new URL(location.href);
    if (url.searchParams.get('reset') !== '1') return true;
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
    } catch (_) {
      storageWarning('Kunde inte återställa appens data. Försök igen.');
      return false;
    }
    url.searchParams.delete('reset');
    window.history.replaceState({app: 'lekplatskontroll', screen: 'parks'}, '', url.href);
    showToast('Appens kontroller och inställningar har återställts.');
    return true;
  }

  function loadStorage() {
    const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    const isSurveyData = value => isObject(value) &&
      Object.values(value).every(survey => isObject(survey) && isObject(survey.features));
    appState.surveyData = readStored(STORAGE_KEY_DATA, isSurveyData) || {};
    appState.settings = { ...DEFAULT_SETTINGS, ...readStored(STORAGE_KEY_SETTINGS, isObject) };
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (typeof appState.settings[key] !== 'string') appState.settings[key] = DEFAULT_SETTINGS[key];
    });
  }

  // Local storage is the only copy, so unreadable data is discarded and the app starts fresh.
  function readStored(key, isValid) {
    let saved;
    try {
      saved = localStorage.getItem(key);
    } catch (_) {
      storageWarning('Kunde inte läsa sparad data.');
      return null;
    }
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (isValid(parsed)) return parsed;
    } catch (_) { /* Handled below. */ }
    try { localStorage.removeItem(key); } catch (_) { /* The warning below still applies. */ }
    storageWarning('Sparad data kunde inte läsas och har rensats.');
    return null;
  }

  function persistData() {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(appState.surveyData));
      return true;
    } catch (e) {
      storageWarning('Kunde inte spara. Behåll sidan öppen och kopiera rapporten.');
      return false;
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appState.settings));
      return true;
    } catch (e) {
      storageWarning('Kunde inte spara inställningar.');
      return false;
    }
  }

  function setupInspectorInput() {
    if (!elInspectorName) return;

    elInspectorName.value = appState.settings.inspectorName || "";

    elInspectorName.addEventListener("input", (e) => {
      appState.settings.inspectorName = e.target.value.trim();
      elInspectorName.setCustomValidity('');
      if (!persistSettings()) return;
    });
  }

  // --- NOTIFIKATION (TOAST) ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    elToast.textContent = message;
    elToast.classList.add("show");
    toastTimer = setTimeout(() => {
      elToast.classList.remove("show");
    }, 2500);
  }

  // --- HJÄLPFUNKTIONER ---
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  }

  function storageWarning(message) {
    const warning = document.getElementById('storage-warning');
    warning.hidden = false;
    warning.textContent = message;
  }

  function saveDraft() {
    const park = getPark(appState.selectedParkId);
    const type = getFeatureType(park && park.id, appState.selectedFeatureId);
    if (!park || !type) return;
    if (!getParkSurvey(park.id).inspectorName && !appState.settings.inspectorName.trim()) return;
    const survey = startParkSurvey(park.id);
    snapshotSurvey(park, survey);
    survey.inspectorName ||= appState.settings.inspectorName;
    survey.startedAt ||= new Date().toISOString();
    survey.lastUpdated = new Date().toISOString();
    survey.status = 'in-progress';
    survey.reportedAt = null;
    survey.features[type.id] = {
      points: type.points.map((text, idx) => ({id: type.pointIds[idx], text, ...currentFormAnswers[idx]}))};
    persistData();
    updateElementProgress();
  }

  function updateElementProgress() {
    const progress = getFeatureStatus(appState.selectedParkId, appState.selectedFeatureId);
    elElementProgress.textContent = `${progress.answered}/${progress.total}`;
    elElementProgress.setAttribute('aria-label', `${progress.answered} av ${progress.total} kontroller klara`);
  }

  function reportDate(survey) {
    return new Date(survey.lastUpdated || survey.startedAt || Date.now());
  }

  function getPark(parkId) {
    return appState.surveyData[parkId]?.catalog?.park || MUNICIPAL_PARKS.find(p => p.id === parkId);
  }

  function getFeatureType(parkId, featureId) {
    return appState.surveyData[parkId]?.catalog?.featureTypes[featureId] || FEATURE_TYPES[featureId];
  }

  function snapshotSurvey(park, survey) {
    if (survey.catalog) return;
    survey.catalog = {park: JSON.parse(JSON.stringify(park)), featureTypes: Object.create(null)};
    park.featureIds.forEach(id => { survey.catalog.featureTypes[id] = JSON.parse(JSON.stringify(FEATURE_TYPES[id])); });
  }

  function reconcileInspections() {
    const previous = appState.surveyData;
    const next = JSON.parse(JSON.stringify(previous));
    const key = text => text.trim().normalize('NFC');
    Object.entries(next).forEach(([parkId, survey]) => {
      // Without a checklist copy no answer has been saved.
      if (!survey.catalog) { delete next[parkId]; return; }
      if (survey.status === 'reported') return;
      const park = MUNICIPAL_PARKS.find(item => item.id === parkId);
      // Parks missing from Excel keep their answers hidden, in case the removal was a mistake.
      if (!park) return;
      const features = Object.create(null);
      park.featureIds.forEach(id => {
        const type = FEATURE_TYPES[id];
        const oldPoints = new Map((survey.features[id]?.points || []).map(point => [key(point.text), point]));
        features[id] = {points: type.points.map((text, idx) => {
          const answer = oldPoints.get(key(text));
          return {id: type.pointIds[idx], text, status: answer?.status || null, note: answer?.note || ''};
        })};
      });
      survey.features = features;
      delete survey.catalog;
      snapshotSurvey(park, survey);
    });
    if (JSON.stringify(previous) === JSON.stringify(next)) return true;
    appState.surveyData = next;
    if (!persistData()) { appState.surveyData = previous; return false; }
    return true;
  }

  const EMPTY_SURVEY = Object.freeze({status: "not-started", features: Object.freeze({}), lastUpdated: null});

  function getParkSurvey(parkId) {
    return appState.surveyData[parkId] || EMPTY_SURVEY;
  }

  function startParkSurvey(parkId) {
    appState.surveyData[parkId] ||= {status: "not-started", features: {}, lastUpdated: null};
    return appState.surveyData[parkId];
  }

  function getFeatureStatus(parkId, featureId) {
    const parkSurvey = getParkSurvey(parkId);
    const featureData = parkSurvey.features[featureId];
    const type = getFeatureType(parkId, featureId);
    const points = type ? type.points.map((_, idx) => featureData?.points?.[idx]) : [];
    const answered = points.filter(pt => pt && (pt.status === 'ok' ||
      (pt.status === 'issue' && typeof pt.note === 'string' && pt.note.trim()))).length;
    const started = points.some(pt => pt && (pt.status || pt.note));
    const issuesCount = points.filter(pt => pt?.status === 'issue').length;
    const complete = points.length > 0 && answered === points.length;
    return {
      status: complete ? (issuesCount > 0 ? "issue" : "ok") : (started ? "in-progress" : "pending"),
      issuesCount, answered, total: points.length, started, complete
    };
  }

  function calculateParkProgress(parkId) {
    const park = getPark(parkId);
    if (!park) return { total: 0, completed: 0, issues: 0, percent: 0 };

    let completed = 0;
    let issues = 0;
    let answered = 0;
    let checks = 0;
    let started = Boolean(getParkSurvey(parkId).startedAt);

    park.featureIds.forEach(fId => {
      const featStat = getFeatureStatus(parkId, fId);
      if (featStat.complete) {
        completed++;
      }
      issues += featStat.issuesCount;
      answered += featStat.answered;
      checks += featStat.total;
      started ||= featStat.started;
    });

    const percent = checks > 0 ? Math.round((answered / checks) * 100) : 0;
    return {
      total: park.featureIds.length,
      completed,
      issues,
      percent, answered, checks, started
    };
  }

  function updateGlobalStats() {
    let completedParks = 0;
    let totalIssues = 0;

    MUNICIPAL_PARKS.forEach(park => {
      const prog = calculateParkProgress(park.id);
      const survey = getParkSurvey(park.id);
      if (survey.status === "reported") {
        completedParks++;
      }
      totalIssues += prog.issues;
    });

    elStatTotal.textContent = MUNICIPAL_PARKS.length;
    elStatCompleted.textContent = completedParks;
    elStatIssues.textContent = totalIssues;
  }

  // --- NAVIGERING MELLAN SKÄRMAR ---
  function restoreRoute(route) {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
    document.querySelector('.app-container').inert = false;
    navigateTo(route.screen, {parkId: route.parkId, featureId: route.featureId}, false);
  }

  function navigateTo(screen, params = {}, recordHistory = true) {
    const parkId = screen === 'parks' ? null : (params.parkId || appState.selectedParkId);
    if (screen !== 'parks' && !appState.surveyData[parkId]?.inspectorName &&
        !appState.settings.inspectorName.trim()) {
      navigateTo('parks', {}, false);
      window.history.replaceState({app: 'lekplatskontroll', screen: 'parks'}, '');
      elInspectorName.setCustomValidity('Ange besiktningsmannens namn innan du börjar.');
      elInspectorName.focus();
      elInspectorName.reportValidity();
      return;
    }
    const featureId = screen === 'form' ? (params.featureId || appState.selectedFeatureId) : null;
    const previous = window.history.state;
    const sameRoute = route => route && route.screen === screen &&
      (route.parkId || null) === parkId && (route.featureId || null) === featureId;
    // Returning to the parent consumes the existing entry, preventing back loops.
    if (recordHistory && previous && sameRoute(previous.parent)) {
      window.history.back();
      return;
    }
    appState.currentScreen = screen;
    document.getElementById('btn-settings').hidden = screen !== 'parks';
    elElementProgress.hidden = screen !== 'form';
    const navigationBar = document.getElementById("navigation-bar");
    if (screen === "parks") navigationBar.classList.add("main-page");
    else navigationBar.classList.remove("main-page");
    elBackButton.hidden = screen === "parks";
    elNavigationTitle.textContent = screen === "parks" ? "" : (getPark(parkId)?.name || "");

    elScreenParks.classList.remove("active");
    elScreenParkOverview.classList.remove("active");
    elScreenFeatureForm.classList.remove("active");

    elBarParkOverview.style.display = "none";

    document.querySelector(".app-content").scrollTop = 0;

    if (screen === "parks") {
      appState.selectedParkId = null;
      appState.selectedFeatureId = null;


      elScreenParks.classList.add("active");
      renderParksList();
      updateGlobalStats();

    } else if (screen === "overview") {
      const park = getPark(params.parkId || appState.selectedParkId);
      if (!park) return navigateTo("parks");

      appState.selectedParkId = park.id;
      appState.selectedFeatureId = null;

      elScreenParkOverview.classList.add("active");
      elBarParkOverview.style.display = "flex";

      renderParkOverview(park);

    } else if (screen === "form") {
      const park = getPark(params.parkId || appState.selectedParkId);
      const featureType = getFeatureType(park && park.id, params.featureId || appState.selectedFeatureId);
      if (!park || !featureType) return navigateTo("overview", { parkId: appState.selectedParkId });
      if (!confirmEditReported(park.id)) {
        if (!recordHistory) {
          window.history.replaceState({app: 'lekplatskontroll', screen: 'overview', parkId: park.id, parent: {screen: 'parks'}}, '');
        }
        return navigateTo("overview", { parkId: park.id }, false);
      }

      appState.selectedParkId = park.id;
      appState.selectedFeatureId = featureType.id;


      elScreenFeatureForm.classList.add("active");

      elNavigationTitle.textContent = `${park.name} – ${featureType.name}`;
      renderFeatureForm(park, featureType);
      updateElementProgress();
    }
    if (recordHistory && !sameRoute(previous)) {
      window.history.pushState({app: 'lekplatskontroll', screen: appState.currentScreen,
        parkId: appState.selectedParkId, featureId: appState.selectedFeatureId,
        parent: previous && {screen: previous.screen, parkId: previous.parkId, featureId: previous.featureId}}, '');
    }
  }

  // --- SKÄRM 1: LEKPLATSLISTA ---
  function renderParksList() {
    const sortedParks = [...MUNICIPAL_PARKS].sort((a, b) => a.name.localeCompare(b.name, "sv"));
    elParksListContainer.innerHTML = sortedParks.map(park => {
      park = getPark(park.id);
      const prog = calculateParkProgress(park.id);
      const survey = getParkSurvey(park.id);

      let badgeHtml = "";
      if (prog.completed === prog.total) {
        badgeHtml = `<span class="badge badge-ok">${survey.status === 'reported' ? 'Rapport skickad' : `Klar ${prog.answered}/${prog.checks}`}</span>`;
      } else if (prog.started) {
        badgeHtml = `<span class="badge badge-progress">Påbörjad ${prog.answered}/${prog.checks}</span>`;
      } else {
        badgeHtml = `<span class="badge badge-pending">Ej påbörjad</span>`;
      }

      return `
        <div class="park-card" role="button" tabindex="0" data-park-id="${escapeHtml(park.id)}">
          <div class="park-card-info">
            <div class="park-name">${escapeHtml(park.name)}</div>
            <div class="park-meta">
              ${park.district ? `<span>📍 ${escapeHtml(park.district)}</span><span>•</span>` : ''}
              <span>${park.featureIds.length} element</span>
              ${prog.issues ? `<span>· ${prog.issues} anmärkning${prog.issues > 1 ? 'ar' : ''}</span>` : ''}
            </div>
          </div>
          ${badgeHtml}
        </div>
      `;
    }).join("");

    elParksListContainer.querySelectorAll(".park-card").forEach(card => {
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
      card.addEventListener("click", () => {
        const parkId = card.getAttribute("data-park-id");
        navigateTo("overview", { parkId });
      });
    });
  }

  // --- SKÄRM 2: LEKPLATSÖVERSIKT ---
  function renderParkOverview(park) {

    const prog = calculateParkProgress(park.id);
    document.getElementById('btn-new-survey').hidden = !prog.started;

    if (prog.completed === prog.total && prog.total > 0) {
      elBtnSendReport.disabled = false;
    } else {
      elBtnSendReport.disabled = true;
    }
    elBtnSendReport.textContent = 'Skicka rapport';
    document.getElementById('park-footer-progress').textContent = `${prog.answered}/${prog.checks} kontroller klara`;

    elFeaturesListContainer.innerHTML = park.featureIds.map(fId => {
      const featType = getFeatureType(park.id, fId);
      if (!featType) return "";

      const featStat = getFeatureStatus(park.id, fId);
      let cardClass = "";
      let statusBadge = "";

      if (featStat.status === "ok") {
        cardClass = "done-ok";
        statusBadge = `<span class="badge badge-ok">Klar ${featStat.answered}/${featStat.total}</span>`;
      } else if (featStat.status === "issue") {
        cardClass = "done-issue";
        statusBadge = `<span class="badge badge-ok">Klar ${featStat.answered}/${featStat.total}</span>`;
      } else if (featStat.started) {
        statusBadge = `<span class="badge badge-progress">Påbörjad ${featStat.answered}/${featStat.total}</span>`;
      } else {
        statusBadge = `<span class="badge badge-pending">Ej påbörjad</span>`;
      }

      return `
        <div class="feature-card ${cardClass}" role="button" tabindex="0" data-feature-id="${escapeHtml(featType.id)}">
          <div class="feature-card-header">
            <div class="feature-card-title">
              <span>${escapeHtml(featType.name)}</span>
            </div>
            ${statusBadge}
          </div>
          <div class="feature-card-footer">
            <span>${featType.points.length} ${featType.points.length === 1 ? 'kontroll' : 'kontroller'}</span>
            ${featStat.issuesCount ? `<span class="issue-count">⚠ ${featStat.issuesCount} anmärkning${featStat.issuesCount > 1 ? 'ar' : ''}</span>` : ''}
            <span aria-hidden="true">→</span>
          </div>
        </div>
      `;
    }).join("");

    elFeaturesListContainer.querySelectorAll(".feature-card").forEach(card => {
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
      card.addEventListener("click", () => {
        const featureId = card.getAttribute("data-feature-id");
        navigateTo("form", { parkId: park.id, featureId });
      });
    });
  }

  // --- SKÄRM 3: KONTROLLPUNKTSFORMULÄR ---
  function renderFeatureForm(park, featureType) {

    const parkSurvey = getParkSurvey(park.id);
    const existingData = parkSurvey.features[featureType.id];

    currentFormAnswers = {};
    featureType.points.forEach((pt, idx) => {
      if (existingData && existingData.points && existingData.points[idx]) {
        currentFormAnswers[idx] = {
          status: existingData.points[idx].status || null,
          note: existingData.points[idx].note || ""
        };
      } else {
        currentFormAnswers[idx] = {
          status: null,
          note: ""
        };
      }
    });

    elControlPointsContainer.innerHTML = featureType.points.map((pointText, idx) => {
      const ans = currentFormAnswers[idx];
      const isOk = ans.status === "ok";
      const isIssue = ans.status === "issue";
      const cardStateClass = isOk ? "state-ok" : (isIssue ? "state-issue" : "");

      return `
        <div class="control-point-card ${cardStateClass}" id="card-point-${idx}">
          <div class="point-text">${escapeHtml(pointText)}</div>
          <div class="toggle-group">
            <button type="button" class="toggle-btn btn-ok ${isOk ? 'selected' : ''}" data-idx="${idx}" data-val="ok" aria-pressed="${isOk}">
              <span>✓</span> OK
            </button>
            <button type="button" class="toggle-btn btn-issue ${isIssue ? 'selected' : ''}" data-idx="${idx}" data-val="issue" aria-pressed="${isIssue}">
              <span>⚠</span> Anmärkning
            </button>
          </div>
          <div class="defect-box ${isIssue ? 'visible' : ''}" id="defect-box-${idx}">
            <div id="defect-editor-${idx}" class="defect-editor" data-idx="${idx}">
              <textarea id="defect-text-${idx}" class="defect-textarea" data-idx="${idx}" aria-label="Beskriv anmärkningen för kontroll ${idx + 1}" aria-required="true" aria-invalid="${!ans.note.trim()}" aria-describedby="defect-help-${idx}" ${ans.note.trim() ? 'readonly' : ''} placeholder="Beskriv anmärkningen…">${escapeHtml(ans.note)}</textarea>
              <p id="defect-help-${idx}" class="defect-help" ${ans.note.trim() ? 'hidden' : ''}>Beskriv anmärkningen för att bli klar.</p>
              <div class="defect-actions"><button type="button" id="defect-action-${idx}" class="secondary-btn defect-action" data-idx="${idx}">${ans.note.trim() ? 'Ändra' : 'Klar'}</button></div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    elControlPointsContainer.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const val = btn.getAttribute("data-val");
        if (currentFormAnswers[idx].status === val) return;
        const card = document.getElementById(`card-point-${idx}`);
        const defectBox = document.getElementById(`defect-box-${idx}`);
        const okBtn = card.querySelector(".btn-ok");
        const issueBtn = card.querySelector(".btn-issue");

        currentFormAnswers[idx].status = val;
        okBtn.setAttribute('aria-pressed', String(val === 'ok'));
        issueBtn.setAttribute('aria-pressed', String(val === 'issue'));
        saveDraft();

        if (val === "ok") {
          okBtn.classList.add("selected");
          issueBtn.classList.remove("selected");
          defectBox.classList.remove("visible");
          card.classList.remove("state-issue");
          card.classList.add("state-ok");
        } else {
          issueBtn.classList.add("selected");
          okBtn.classList.remove("selected");
          defectBox.classList.add("visible");
          card.classList.remove("state-ok");
          card.classList.add("state-issue");
          setDefectEditing(idx, true, true);
        }
      });
    });

    elControlPointsContainer.querySelectorAll(".defect-textarea").forEach(tx => {
      tx.addEventListener("input", (e) => {
        const idx = parseInt(tx.getAttribute("data-idx"), 10);
        currentFormAnswers[idx].note = e.target.value;
        updateDefectValidity(idx);
        saveDraft();
      });
    });
    elControlPointsContainer.querySelectorAll('.defect-action').forEach(button => {
      button.addEventListener('click', () => {
        const idx = Number(button.dataset.idx);
        const textarea = document.getElementById(`defect-text-${idx}`);
        if (textarea.readOnly) {
          setDefectEditing(idx, true, true);
        } else if (!currentFormAnswers[idx].note.trim()) {
          updateDefectValidity(idx);
          textarea.focus();
        } else {
          setDefectEditing(idx, false, true);
        }
      });
    });
    elControlPointsContainer.querySelectorAll('.defect-editor').forEach(editor => {
      editor.addEventListener('focusout', event => {
        if (editor.contains(event.relatedTarget)) return;
        const idx = Number(editor.dataset.idx);
        if (currentFormAnswers[idx].note.trim()) setDefectEditing(idx, false);
      });
    });
  }

  function updateDefectValidity(idx) {
    const invalid = !currentFormAnswers[idx].note.trim();
    document.getElementById(`defect-help-${idx}`).hidden = !invalid;
    document.getElementById(`defect-text-${idx}`).setAttribute('aria-invalid', String(invalid));
  }

  function setDefectEditing(idx, editing, focus = false) {
    const textarea = document.getElementById(`defect-text-${idx}`);
    const button = document.getElementById(`defect-action-${idx}`);
    textarea.readOnly = !editing;
    button.textContent = editing ? 'Klar' : 'Ändra';
    updateDefectValidity(idx);
    if (focus) (editing ? textarea : button).focus();
  }

  // --- RAPPORTGENERERING & E-POST ---
  function generateReportText(park) {
    const now = reportDate(getParkSurvey(park.id));
    const formattedDate = now.toLocaleDateString("sv-SE") + " " + now.toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit' });
    const prog = calculateParkProgress(park.id);
    const parkSurvey = getParkSurvey(park.id);

    let lines = [];
    lines.push("LEKPLATSKONTROLL - BESIKTNINGSRAPPORT");
    lines.push(`Lekplats: ${park.name}`);
    if (park.district) lines.push(`Område: ${park.district}`);
    if (park.address) lines.push(`Adress: ${park.address}`);
    lines.push(`Datum: ${formattedDate}`);
    lines.push(`Besiktningsman: ${parkSurvey.inspectorName || appState.settings.inspectorName}`);
    lines.push(`Status: ${prog.issues === 0 ? "Allt OK" : `${prog.issues} ${prog.issues === 1 ? 'anmärkning upptäckt' : 'anmärkningar upptäckta'}`}`);
    lines.push("");

    let problemsFound = [];

    park.featureIds.forEach((fId) => {
      const featType = getFeatureType(park.id, fId);
      const featData = parkSurvey.features[fId];

      lines.push(featType.name.toUpperCase());
      lines.push("");

      if (featData && featData.points) {
        const issues = featData.points.filter(pt => pt.status === 'issue');
        const approved = featData.points.filter(pt => pt.status === 'ok');
        const unchecked = featData.points.filter(pt => pt.status !== 'ok' && pt.status !== 'issue');
        if (issues.length) {
          lines.push('Anmärkningar:');
          issues.forEach(pt => {
            const desc = pt.note && pt.note.trim() ? pt.note.trim() : "Anmärkning noterad (ingen beskrivning angiven)";
            lines.push(`- ${pt.text}`, `Beskrivning: ${desc}`, '');
            problemsFound.push(`${featType.name} - ${pt.text}\nBeskrivning: ${desc}`);
          });
        } else {
          lines.push('Inga anmärkningar.', '');
        }
        if (approved.length) {
          lines.push('Godkända kontrollpunkter:');
          approved.forEach(pt => lines.push(`- ${pt.text}`));
        }
        if (unchecked.length) {
          if (approved.length) lines.push('');
          lines.push('Ej kontrollerade kontrollpunkter:');
          unchecked.forEach(pt => lines.push(`- ${pt.text}`));
        }
      } else {
        lines.push("Området ej kontrollerat");
      }
      lines.push("");
    });

    lines.push(problemsFound.length ? "SAMMANFATTNING AV ANMÄRKNINGAR" : "SAMMANFATTNING");
    lines.push('');
    if (prog.completed !== prog.total) {
      lines.push('Kontrollen är ofullständig.');
    }
    if (problemsFound.length === 0 && prog.completed === prog.total) {
      lines.push("Alla kontrollpunkter är godkända.", "Inga anmärkningar upptäckta.");
    } else {
      problemsFound.forEach((prob, idx) => {
        lines.push(`${idx + 1}. ${prob}`);
        if (idx < problemsFound.length - 1) lines.push('');
      });
    }

    return lines.join("\n");
  }

  function renderReportPreview(park) {
    const survey = getParkSurvey(park.id);
    const date = reportDate(survey);
    const progress = calculateParkProgress(park.id);
    const metadata = [
      ['Lekplats', park.name],
      ...(park.district ? [['Område', park.district]] : []),
      ...(park.address ? [['Adress', park.address]] : []),
      ['Datum', date.toLocaleDateString('sv-SE') + ' ' + date.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'})],
      ['Besiktningsman', survey.inspectorName || appState.settings.inspectorName]
    ];
    const issues = [];
    const sections = park.featureIds.map(id => {
      const feature = getFeatureType(park.id, id);
      const points = survey.features[id]?.points;
      const rows = points ? points.map(point => {
        const status = point.status === 'ok' ? 'ok' : point.status === 'issue' ? 'issue' : 'unchecked';
        const label = {ok: 'OK', issue: 'Anmärkning', unchecked: 'Ej kontrollerad'}[status];
        const note = status === 'issue' ? (point.note?.trim() || 'Anmärkning noterad (ingen beskrivning angiven)') : '';
        if (note) issues.push(`${feature.name} – ${point.text}: ${note}`);
        return `<li class="report-point"><span class="report-status report-status-${status}">${label}</span><div class="report-point-content"><div>${escapeHtml(point.text)}</div>${note ? `<div class="report-note"><strong>Beskrivning:</strong> ${escapeHtml(note)}</div>` : ''}</div></li>`;
      }).join('') : '<li class="report-point">Området ej kontrollerat</li>';
      return `<section class="report-section"><h4>${escapeHtml(feature.name)}</h4><ul class="report-points">${rows}</ul></section>`;
    }).join('');
    elReportTextContent.innerHTML = `
      <h4 class="report-heading">Lekplatskontroll – besiktningsrapport</h4>
      <dl class="report-metadata">${metadata.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      ${sections}
      <section class="report-section"><h4>Sammanfattning av anmärkningar</h4>
        ${progress.completed !== progress.total ? '<p>Kontrollen är ofullständig.</p>' : ''}
        ${issues.length ? `<ol class="report-issues">${issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ol>` : progress.completed === progress.total ? '<p>Inga anmärkningar upptäckta. All utrustning i gott skick.</p>' : ''}
      </section>`;
  }

  function reportSubject(park) {
    const issues = calculateParkProgress(park.id).issues;
    const date = reportDate(getParkSurvey(park.id)).toLocaleDateString("sv-SE");
    const summary = issues === 0 ? 'Allt OK' : `${issues} ${issues === 1 ? 'anmärkning' : 'anmärkningar'}`;
    return `[Lekplatskontroll] ${park.name} (${summary}) - ${date}`;
  }

  function openReportModal() {
    const park = getPark(appState.selectedParkId);
    if (!park) return;

    const prog = calculateParkProgress(park.id);
    if (!prog.total || prog.completed !== prog.total) return;

    elReportToDisplay.textContent = appState.settings.recipientEmail;
    elReportSubjectDisplay.textContent = reportSubject(park);
    renderReportPreview(park);

    elModalReportSummary.className = prog.issues > 0 ? "report-summary-box has-issues" : "report-summary-box";
    elModalReportSummary.innerHTML = `
      <div style="font-weight: 700; color: ${prog.issues > 0 ? '#991b1b' : '#166534'}; margin-bottom: 4px;">
        ${prog.issues > 0 ? `⚠ ${prog.issues} anmärkning${prog.issues > 1 ? 'ar' : ''}` : `✓ Allt OK`}
      </div>
    `;

    openModal(elModalReport);
  }

  function triggerEmailDispatch() {
    const park = getPark(appState.selectedParkId);
    if (!park) return;

    // The @ stays unencoded; some mail apps do not decode %40 in the address.
    const recipient = appState.settings.recipientEmail.split('@').map(encodeURIComponent).join('@');
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(reportSubject(park))}&body=${encodeURIComponent(generateReportText(park))}`;

    window.location.href = mailtoUrl;
    showToast("Öppnar e-postklient...");
  }

  function copyReportToClipboard() {
    const park = getPark(appState.selectedParkId);
    if (!park) return;

    const reportText = generateReportText(park);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).then(() => {
        showToast("Rapporten har kopierats till urklipp!");
      }).catch(() => {
        fallbackCopyText(reportText);
      });
    } else {
      fallbackCopyText(reportText);
    }
  }

  function fallbackCopyText(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      if (!document.execCommand("copy")) throw new Error("Copy failed");
      showToast("Rapporten har kopierats!");
    } catch (err) {
      showToast("Kunde inte kopiera automatiskt.");
    }
    document.body.removeChild(ta);
  }

  function finishAndClosePark() {
    const progress = calculateParkProgress(appState.selectedParkId);
    if (!progress.total || progress.completed !== progress.total) return;
    if (!confirm('Kom ihåg att du behöver klicka Skicka i mejlappen för att rapporten ska skickas. Annars skickas den inte.')) return;
    const park = getPark(appState.selectedParkId);
    if (park) {
      const parkSurvey = appState.surveyData[park.id];
      parkSurvey.status = "reported";
      parkSurvey.reportedAt = new Date().toISOString();
      if (!persistData()) return;
      unlockedParks.delete(park.id);
    }
    closeModal(elModalReport);
    showToast("Rapporten har markerats som skickad!");
    navigateTo("parks");
  }

  // --- INSTÄLLNINGAR ---
  function openSettingsModal() {
    elUpdateFormsStatus.textContent = 'Hämtar lekplatser och kontroller från Excel-filen. Kräver internet.';
    elSettingEmail.value = appState.settings.recipientEmail;
    openModal(elModalSettings);
  }

  function saveSettings() {
    const email = elSettingEmail.value.trim();
    if (!email || !elSettingEmail.checkValidity()) {
      elSettingEmail.reportValidity();
      showToast('Ange en giltig e-postadress.');
      return;
    }
    appState.settings.recipientEmail = email;

    if (!persistSettings()) return;
    closeModal(elModalSettings);
    showToast("Inställningar sparade");
  }

  function clearAllData() {
    if (!confirm('Rensar pågående och slutförda inspektioner i appen inklusive namn på besiktningsman. Rapporter som skickats med epost påverkas inte.\n\nVill du rensa inspektionsdata?')) return;
    const settings = {...appState.settings, inspectorName: ''};
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      localStorage.removeItem(STORAGE_KEY_DATA);
    } catch (_) {
      storageWarning('Kunde inte rensa inspektionsdata. Försök igen.');
      return;
    }
    appState.surveyData = {};
    appState.settings = settings;
    currentFormAnswers = {};
    elInspectorName.value = '';
    elInspectorName.setCustomValidity('');
    document.getElementById('storage-warning').hidden = true;
    closeModal(elModalSettings);
    navigateTo('parks');
    showToast('Inspektionsdata har rensats.');
  }

  async function updateForms() {
    elBtnUpdateForms.disabled = true;
    elUpdateFormsStatus.textContent = 'Hämtar formulär…';
    try {
      await updateConfiguration();
      reconcileInspections();
      renderParksList();
      updateGlobalStats();
      elUpdateFormsStatus.textContent = 'Formulären är uppdaterade.';
    } catch (error) {
      elUpdateFormsStatus.textContent = `Kunde inte läsa in formulären. ${error.message} Tidigare formulär används.`;
    } finally {
      elBtnUpdateForms.disabled = false;
    }
  }

  function confirmEditReported(parkId) {
    if (getParkSurvey(parkId).status !== 'reported' || unlockedParks.has(parkId)) return true;
    if (!confirm('Den här lekplatsen är redan markerad som skickad. Vill du öppna den för redigering igen?')) return false;
    unlockedParks.add(parkId);
    return true;
  }

  // --- HÄNDELSEKOPPLINGAR ---
  let modalOpener = null;
  function openModal(modal) {
    modalOpener = document.activeElement;
    modal.classList.add('active');
    document.querySelector('.app-container').inert = true;
    modal.querySelector('button, input').focus();
  }
  function closeModal(modal) {
    modal.classList.remove('active');
    document.querySelector('.app-container').inert = false;
    if (modalOpener) modalOpener.focus();
  }

  function startNewSurvey(confirmed = false) {
    const park = MUNICIPAL_PARKS.find(item => item.id === appState.selectedParkId);
    if (!park) { showToast('Lekplatsen finns inte längre i underlaget.'); return; }
    if (confirmed !== true && !confirm(`Rensa ${park.name} och börja om? Alla sparade svar och tidigare kontroller för lekplatsen tas bort. Redan skickade mejl påverkas inte.`)) return;
    const previous = appState.surveyData[park.id];
    delete appState.surveyData[park.id];
    if (!persistData()) { if (previous) appState.surveyData[park.id] = previous; return; }
    currentFormAnswers = {};
    navigateTo('overview', {parkId: park.id});
  }

  function bindEvents() {
    document.getElementById('btn-close-park').addEventListener('click', () => navigateTo('parks'));
    document.getElementById('btn-close-feature').addEventListener('click', () => {
      navigateTo('overview', {parkId: appState.selectedParkId});
    });
    document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
    const resetModal = document.getElementById('modal-reset-park');
    document.getElementById('btn-new-survey').addEventListener('click', () => {
      const park = getPark(appState.selectedParkId);
      if (!park) return;
      document.getElementById('reset-park-title').textContent = `Rensa ${park.name} och börja om?`;
      openModal(resetModal);
    });
    document.getElementById('btn-cancel-reset-park').addEventListener('click', () => closeModal(resetModal));
    document.getElementById('btn-confirm-reset-park').addEventListener('click', () => {
      closeModal(resetModal);
      startNewSurvey(true);
    });
    document.addEventListener('keydown', e => {
      const modal = document.querySelector('.modal-overlay.active');
      if (!modal) return;
      if (e.key === 'Escape') { closeModal(modal); return; }
      if (e.key === 'Tab') {
        const items = [...modal.querySelectorAll('button, input, [tabindex="0"]')].filter(el => !el.disabled);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    elBackButton.addEventListener("click", () => {
      if (appState.currentScreen === "form") {
        navigateTo("overview", {parkId: appState.selectedParkId});
      } else if (appState.currentScreen === "overview") {
        navigateTo("parks");
      }
    });

    elBtnSendReport.addEventListener("click", openReportModal);

    elBtnCloseReportModal.addEventListener("click", () => {
      closeModal(elModalReport);
    });
    elBtnTriggerEmail.addEventListener("click", triggerEmailDispatch);
    elBtnCopyReport.addEventListener("click", copyReportToClipboard);
    elBtnFinishSurvey.addEventListener("click", finishAndClosePark);

    elBtnCloseSettingsModal.addEventListener("click", () => {
      closeModal(elModalSettings);
    });
    elBtnSaveSettings.addEventListener("click", saveSettings);
    elBtnClearAllData.addEventListener("click", clearAllData);
    elBtnUpdateForms.addEventListener("click", updateForms);

    [elModalReport, elModalSettings, resetModal].forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });
  }

  async function start() {
    const status = document.getElementById('loading-status');
    try {
      await loadConfiguration();
    } catch (error) {
      status.textContent = `Kunde inte läsa formulären: ${error.message} Kontrollera internetanslutningen och ladda om sidan.`;
      document.querySelectorAll('.inspector-bar, .stats-banner, #btn-settings').forEach(el => { el.style.display = 'none'; });
      return;
    }
    status.hidden = true;
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
