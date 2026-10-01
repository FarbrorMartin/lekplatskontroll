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

  const elToast = document.getElementById("toast");

  let currentFormAnswers = {};
  let storageReadFailed = false;

  // --- INITIALISERING ---
  function init() {
    if (!resetStorageFromUrl()) return;
    loadStorage();
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
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid survey data');
        Object.values(parsed).forEach(survey => {
          if (!survey || typeof survey.features !== 'object' || !survey.features) throw new Error('Invalid survey');
        });
        appState.surveyData = parsed;
      }
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        appState.settings = { ...DEFAULT_SETTINGS, ...parsed };
        if (typeof appState.settings.inspectorName !== "string") appState.settings.inspectorName = DEFAULT_SETTINGS.inspectorName;
      }
    } catch (e) {
      storageReadFailed = true;
      storageWarning('Kunde inte läsa sparad data. Lagringen skrivs inte över. Kontrollera lagringen innan du fortsätter.');
    }
  }

  function persistData() {
    if (storageReadFailed) return false;
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
    const survey = getParkSurvey(park.id);
    if (!survey.inspectorName && !appState.settings.inspectorName.trim()) return;
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

  function getParkSurvey(parkId) {
    if (!appState.surveyData[parkId]) {
      appState.surveyData[parkId] = {
        status: "not-started",
        features: {},
        lastUpdated: null
      };
    }
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
    let started = false;

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


      const prog = calculateParkProgress(park.id);

      elScreenParkOverview.classList.add("active");
      elBarParkOverview.style.display = "flex";

      renderParkOverview(park);

    } else if (screen === "form") {
      const park = getPark(params.parkId || appState.selectedParkId);
      const featureType = getFeatureType(park && park.id, params.featureId || appState.selectedFeatureId);
      if (!park || !featureType) return navigateTo("overview", { parkId: appState.selectedParkId });

      appState.selectedParkId = park.id;
      appState.selectedFeatureId = featureType.id;


      elScreenFeatureForm.classList.add("active");

      elNavigationTitle.textContent = featureType.name;
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
    const survey = getParkSurvey(park.id);
    document.getElementById('btn-new-survey').hidden = survey.status !== 'reported';
    document.getElementById('btn-history').hidden = !(survey.history?.length);

    if (prog.completed === prog.total && prog.total > 0) {
      elBtnSendReport.disabled = false;
      elBtnSendReport.textContent = 'Granska och skicka';
    } else {
      elBtnSendReport.disabled = true;
      elBtnSendReport.textContent = `${prog.answered}/${prog.checks} kontroller klara`;
    }

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
          <span class="point-number" aria-label="Kontroll ${idx + 1}">${idx + 1}</span>
          <div class="point-text">${escapeHtml(pointText)}</div>
          <div class="toggle-group">
            <button type="button" class="toggle-btn btn-ok ${isOk ? 'selected' : ''}" data-idx="${idx}" data-val="ok" aria-pressed="${isOk}">
              <span>✓</span> OK
            </button>
            <button type="button" class="toggle-btn btn-issue ${isIssue ? 'selected' : ''}" data-idx="${idx}" data-val="issue" aria-pressed="${isIssue}">
              <span>⚠</span> ANMÄRKNING
            </button>
          </div>
          <div class="defect-box ${isIssue ? 'visible' : ''}" id="defect-box-${idx}">
            <label class="defect-label" for="defect-text-${idx}">Beskriv anmärkningen:</label>
            <textarea id="defect-text-${idx}" class="defect-textarea" data-idx="${idx}" placeholder="t.ex. Lös bult, 3 cm för hög kant, trasig bräda...">${escapeHtml(ans.note)}</textarea>
          </div>
        </div>
      `;
    }).join("");

    elControlPointsContainer.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const val = btn.getAttribute("data-val");
        const card = document.getElementById(`card-point-${idx}`);
        const defectBox = document.getElementById(`defect-box-${idx}`);
        const okBtn = card.querySelector(".btn-ok");
        const issueBtn = card.querySelector(".btn-issue");
        const textarea = defectBox.querySelector("textarea");

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
          setTimeout(() => textarea.focus(), 100);
        }
      });
    });

    elControlPointsContainer.querySelectorAll(".defect-textarea").forEach(tx => {
      tx.addEventListener("input", (e) => {
        const idx = parseInt(tx.getAttribute("data-idx"), 10);
        currentFormAnswers[idx].note = e.target.value;
        saveDraft();
      });
    });
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
    lines.push(`Status: ${prog.issues === 0 ? "Allt OK" : `${prog.issues} anmärkning(ar) upptäckta`}`);
    lines.push("");

    let problemsFound = [];

    park.featureIds.forEach((fId) => {
      const featType = getFeatureType(park.id, fId);
      const featData = parkSurvey.features[fId];

      lines.push(featType.name.toUpperCase());

      if (featData && featData.points) {
        featData.points.forEach((pt) => {
          if (pt.status === "ok") {
            lines.push(`OK             •  ${pt.text}`);
          } else if (pt.status === 'issue') {
            const desc = pt.note && pt.note.trim() ? pt.note.trim() : "Anmärkning noterad (ingen beskrivning angiven)";
            lines.push(`ANMÄRKNING      •  ${pt.text}: ${desc}`);
            problemsFound.push(`${featType.name} - ${pt.text}: ${desc}`);
          } else {
            lines.push(`EJ KONTROLLERAD     •  ${pt.text}`);
          }
        });
      } else {
        lines.push("Området ej kontrollerat");
      }
      lines.push("");
    });

    lines.push("SAMMANFATTNING AV ANMÄRKNINGAR");
    if (prog.completed !== prog.total) {
      lines.push('Kontrollen är ofullständig.');
    }
    if (problemsFound.length === 0 && prog.completed === prog.total) {
      lines.push("Inga anmärkningar upptäckta. All utrustning i gott skick.");
    } else {
      problemsFound.forEach((prob, idx) => {
        lines.push(`${idx + 1}. ${prob}`);
      });
    }

    return lines.join("\n");
  }

  function openReportModal() {
    const park = getPark(appState.selectedParkId);
    if (!park) return;

    const prog = calculateParkProgress(park.id);
    if (!prog.total || prog.completed !== prog.total) return;
    const reportText = generateReportText(park);
    const formattedDate = reportDate(getParkSurvey(park.id)).toLocaleDateString("sv-SE");
    const subject = `[Lekplatskontroll] ${park.name} (${prog.issues === 0 ? 'Allt OK' : prog.issues + ' anmärkningar'}) - ${formattedDate}`;
    const recipient = appState.settings.recipientEmail;

    elReportToDisplay.textContent = recipient;
    elReportSubjectDisplay.textContent = subject;
    elReportTextContent.textContent = reportText;

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

    const prog = calculateParkProgress(park.id);
    const reportText = generateReportText(park);
    const formattedDate = reportDate(getParkSurvey(park.id)).toLocaleDateString("sv-SE");
    const subject = `[Lekplatskontroll] ${park.name} (${prog.issues === 0 ? 'Allt OK' : prog.issues + ' anmärkningar'}) - ${formattedDate}`;
    const recipient = appState.settings.recipientEmail;

    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;

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
    if (!confirm('Har du skickat rapporten i e-postklienten? Bekräfta endast om den är skickad.')) return;
    const park = getPark(appState.selectedParkId);
    if (park) {
      const parkSurvey = getParkSurvey(park.id);
      parkSurvey.status = "reported";
      parkSurvey.reportedAt = new Date().toISOString();
      if (!persistData()) return;
    }
    closeModal(elModalReport);
    showToast("Rapporten har markerats som skickad!");
    navigateTo("parks");
  }

  // --- INSTÄLLNINGAR ---
  function openSettingsModal() {
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
    storageReadFailed = false;
    elInspectorName.value = '';
    elInspectorName.setCustomValidity('');
    document.getElementById('storage-warning').hidden = true;
    closeModal(elModalSettings);
    navigateTo('parks');
    showToast('Inspektionsdata har rensats.');
  }

  // --- HÄNDELSEKOPPLINGAR ---
  let modalOpener = null;
  function openModal(modal) {
    showModal(modal);
  }
  function showModal(modal) {
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

  function startNewSurvey() {
    const park = getPark(appState.selectedParkId);
    if (!park || !confirm('Starta en ny kontroll? Den nuvarande kontrollen sparas i historiken.')) return;
    const previous = getParkSurvey(park.id);
    appState.surveyData[park.id] = {status: 'not-started', features: {}, lastUpdated: null,
      history: [...(previous.history || []), {report: generateReportText(park),
        status: previous.status, reportedAt: previous.reportedAt || null,
        archivedAt: new Date().toISOString()}]};
    if (!persistData()) { appState.surveyData[park.id] = previous; return; }
    navigateTo('overview', {parkId: park.id});
  }

  function bindEvents() {
    document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
    document.getElementById('btn-new-survey').addEventListener('click', startNewSurvey);
    document.getElementById('btn-history').addEventListener('click', () => {
      const history = getParkSurvey(appState.selectedParkId).history || [];
      document.getElementById('history-content').textContent = history.length
        ? history.map(item => `Arkiverad: ${new Date(item.archivedAt).toLocaleString('sv-SE')}\n${item.report}`).join('\n\n')
        : 'Inga tidigare kontroller.';
      openModal(document.getElementById('modal-history'));
    });
    document.getElementById('btn-close-history').addEventListener('click', () => closeModal(document.getElementById('modal-history')));
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

    [elModalReport, elModalSettings, document.getElementById('modal-history')].forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });
  }

  async function start() {
    try {
      await loadConfiguration();
      init();
    } catch (error) {
      document.getElementById('loading-status').textContent = `Kunde inte läsa konfigurationen: ${error.message} Kontrollera Excel-filen och ladda om sidan.`;
      return;
    }
    document.getElementById('loading-status').hidden = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
