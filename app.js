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
    settings: { ...DEFAULT_SETTINGS },
    searchQuery: ""
  };

  // --- DOM-ELEMENT ---
  const elHeaderBack = document.getElementById("btn-header-back");
  const elHeaderMainTitle = document.getElementById("header-main-title");
  const elHeaderSubTitle = document.getElementById("header-sub-title");
  const elHeaderProgress = document.getElementById("header-progress");
  const elProgressText = document.getElementById("progress-text");
  const elProgressPercent = document.getElementById("progress-percent");
  const elProgressFill = document.getElementById("progress-fill");

  const elSelectInspector = document.getElementById("select-inspector");
  const elScreenParks = document.getElementById("screen-parks");
  const elScreenParkOverview = document.getElementById("screen-park-overview");
  const elScreenFeatureForm = document.getElementById("screen-feature-form");

  const elParkSearchInput = document.getElementById("input-park-search");
  const elSearchClearBtn = document.getElementById("btn-search-clear");
  const elParksListContainer = document.getElementById("parks-list-container");

  const elStatTotal = document.getElementById("stat-total");
  const elStatCompleted = document.getElementById("stat-completed");
  const elStatIssues = document.getElementById("stat-issues");

  const elOverviewParkName = document.getElementById("overview-park-name");
  const elOverviewParkMeta = document.getElementById("overview-park-meta");
  const elOverviewBadge = document.getElementById("overview-badge");
  const elFeaturesListContainer = document.getElementById("features-list-container");

  const elBarParkOverview = document.getElementById("bar-park-overview");
  const elBtnSendReport = document.getElementById("btn-send-report");
  const elBtnClosePark = document.getElementById("btn-close-park");

  const elFormFeatureName = document.getElementById("form-feature-name");
  const elFormFeatureDesc = document.getElementById("form-feature-desc");
  const elControlPointsContainer = document.getElementById("control-points-container");
  const elBarFeatureForm = document.getElementById("bar-feature-form");
  const elBtnSaveFeature = document.getElementById("btn-save-feature");

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
  const elBtnSettingsOpen = document.getElementById("btn-settings-open");
  const elModalSettings = document.getElementById("modal-settings");
  const elBtnCloseSettingsModal = document.getElementById("btn-close-settings-modal");
  const elSettingEmail = document.getElementById("setting-recipient-email");
  const elBtnSaveSettings = document.getElementById("btn-save-settings");
  const elBtnClearAllData = document.getElementById("btn-clear-all-data");

  const elToast = document.getElementById("toast");

  let currentFormAnswers = {};

  // --- INITIALISERING ---
  function init() {
    loadStorage();
    setupInspectorDropdown();
    bindEvents();
    renderParksList();
    updateGlobalStats();
  }

  // --- LAGRING ---
  function loadStorage() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (savedData) {
        appState.surveyData = JSON.parse(savedData);
      }
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        appState.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.error("Kunde inte läsa från localStorage", e);
    }
  }

  function persistData() {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(appState.surveyData));
    } catch (e) {
      console.error("Kunde inte spara data", e);
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appState.settings));
    } catch (e) {
      console.error("Kunde inte spara inställningar", e);
    }
  }

  function setupInspectorDropdown() {
    if (!elSelectInspector) return;
    elSelectInspector.innerHTML = PRESET_INSPECTORS.map(name => {
      const selected = name === appState.settings.inspectorName ? "selected" : "";
      return `<option value="${name}" ${selected}>${name}</option>`;
    }).join("");

    elSelectInspector.value = appState.settings.inspectorName || PRESET_INSPECTORS[0];

    elSelectInspector.addEventListener("change", (e) => {
      appState.settings.inspectorName = e.target.value;
      persistSettings();
      showToast(`Besiktningsman: ${appState.settings.inspectorName}`);
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
  function getPark(parkId) {
    return MUNICIPAL_PARKS.find(p => p.id === parkId);
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
    if (!featureData || !featureData.completed) {
      return { status: "pending", issuesCount: 0 };
    }
    const issuesCount = (featureData.points || []).filter(pt => pt.status === "issue").length;
    return {
      status: issuesCount > 0 ? "issue" : "ok",
      issuesCount
    };
  }

  function calculateParkProgress(parkId) {
    const park = getPark(parkId);
    if (!park) return { total: 0, completed: 0, issues: 0, percent: 0 };

    let completed = 0;
    let issues = 0;

    park.featureIds.forEach(fId => {
      const featStat = getFeatureStatus(parkId, fId);
      if (featStat.status !== "pending") {
        completed++;
        issues += featStat.issuesCount;
      }
    });

    const percent = park.featureIds.length > 0 ? Math.round((completed / park.featureIds.length) * 100) : 0;
    return {
      total: park.featureIds.length,
      completed,
      issues,
      percent
    };
  }

  function updateGlobalStats() {
    let completedParks = 0;
    let totalIssues = 0;

    MUNICIPAL_PARKS.forEach(park => {
      const prog = calculateParkProgress(park.id);
      const survey = getParkSurvey(park.id);
      if (survey.status === "completed" || prog.completed === prog.total) {
        completedParks++;
      }
      totalIssues += prog.issues;
    });

    elStatTotal.textContent = MUNICIPAL_PARKS.length;
    elStatCompleted.textContent = completedParks;
    elStatIssues.textContent = totalIssues;
  }

  // --- NAVIGERING MELLAN SKÄRMAR ---
  function navigateTo(screen, params = {}) {
    appState.currentScreen = screen;

    elScreenParks.classList.remove("active");
    elScreenParkOverview.classList.remove("active");
    elScreenFeatureForm.classList.remove("active");

    elBarParkOverview.style.display = "none";
    elBarFeatureForm.style.display = "none";

    document.querySelector(".app-content").scrollTop = 0;

    if (screen === "parks") {
      appState.selectedParkId = null;
      appState.selectedFeatureId = null;

      elHeaderBack.style.visibility = "hidden";
      elHeaderMainTitle.textContent = "Lekplatskontroll";
      elHeaderSubTitle.textContent = `${MUNICIPAL_PARKS.length} kommunala lekplatser`;
      elHeaderProgress.style.display = "none";

      elScreenParks.classList.add("active");
      renderParksList();
      updateGlobalStats();

    } else if (screen === "overview") {
      const park = getPark(params.parkId || appState.selectedParkId);
      if (!park) return navigateTo("parks");

      appState.selectedParkId = park.id;
      appState.selectedFeatureId = null;

      elHeaderBack.style.visibility = "visible";
      elHeaderMainTitle.textContent = park.name;
      elHeaderSubTitle.textContent = `${park.district} • ${park.address}`;

      const prog = calculateParkProgress(park.id);
      elHeaderProgress.style.display = "block";
      elProgressText.textContent = `${prog.completed} av ${prog.total} delar kontrollerade`;
      elProgressPercent.textContent = `${prog.percent}%`;
      elProgressFill.style.width = `${prog.percent}%`;

      elScreenParkOverview.classList.add("active");
      elBarParkOverview.style.display = "flex";

      renderParkOverview(park);

    } else if (screen === "form") {
      const park = getPark(params.parkId || appState.selectedParkId);
      const featureType = FEATURE_TYPES[params.featureId || appState.selectedFeatureId];
      if (!park || !featureType) return navigateTo("overview", { parkId: appState.selectedParkId });

      appState.selectedParkId = park.id;
      appState.selectedFeatureId = featureType.id;

      elHeaderBack.style.visibility = "visible";
      elHeaderMainTitle.textContent = `${featureType.icon} ${featureType.name}`;
      elHeaderSubTitle.textContent = park.name;
      elHeaderProgress.style.display = "none";

      elScreenFeatureForm.classList.add("active");
      elBarFeatureForm.style.display = "flex";

      renderFeatureForm(park, featureType);
    }
  }

  // --- SKÄRM 1: LEKPLATSLISTA ---
  function renderParksList() {
    const query = appState.searchQuery.toLowerCase().trim();
    const filteredParks = MUNICIPAL_PARKS.filter(p => {
      return p.name.toLowerCase().includes(query) ||
             p.district.toLowerCase().includes(query) ||
             p.address.toLowerCase().includes(query);
    });

    if (filteredParks.length === 0) {
      elParksListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">Inga lekplatser matchar "${appState.searchQuery}"</div>
        </div>
      `;
      return;
    }

    elParksListContainer.innerHTML = filteredParks.map(park => {
      const prog = calculateParkProgress(park.id);
      const survey = getParkSurvey(park.id);

      let badgeHtml = "";
      if (survey.status === "completed" || prog.completed === prog.total) {
        if (prog.issues > 0) {
          badgeHtml = `<span class="badge badge-issues">⚠ ${prog.issues} defekt${prog.issues > 1 ? 'er' : ''}</span>`;
        } else {
          badgeHtml = `<span class="badge badge-ok">✓ Klar (OK)</span>`;
        }
      } else if (prog.completed > 0) {
        badgeHtml = `<span class="badge badge-progress">${prog.completed}/${prog.total} Klara</span>`;
      } else {
        badgeHtml = `<span class="badge badge-pending">Ej påbörjad</span>`;
      }

      return `
        <div class="park-card" data-park-id="${park.id}">
          <div class="park-card-info">
            <div class="park-name">${park.name}</div>
            <div class="park-meta">
              <span>📍 ${park.district}</span>
              <span>•</span>
              <span>${park.featureIds.length} områden</span>
            </div>
          </div>
          ${badgeHtml}
        </div>
      `;
    }).join("");

    elParksListContainer.querySelectorAll(".park-card").forEach(card => {
      card.addEventListener("click", () => {
        const parkId = card.getAttribute("data-park-id");
        navigateTo("overview", { parkId });
      });
    });
  }

  // --- SKÄRM 2: LEKPLATSÖVERSIKT ---
  function renderParkOverview(park) {
    elOverviewParkName.textContent = park.name;
    elOverviewParkMeta.textContent = `${park.district} • ${park.address}`;

    const prog = calculateParkProgress(park.id);
    const survey = getParkSurvey(park.id);

    if (survey.status === "completed" || prog.completed === prog.total) {
      if (prog.issues > 0) {
        elOverviewBadge.className = "badge badge-issues";
        elOverviewBadge.textContent = `Klar (${prog.issues} defekter)`;
      } else {
        elOverviewBadge.className = "badge badge-ok";
        elOverviewBadge.textContent = "Klar (Allt OK)";
      }
    } else if (prog.completed > 0) {
      elOverviewBadge.className = "badge badge-progress";
      elOverviewBadge.textContent = `Pågående (${prog.completed}/${prog.total})`;
    } else {
      elOverviewBadge.className = "badge badge-pending";
      elOverviewBadge.textContent = "Ej påbörjad";
    }

    if (prog.completed === prog.total && prog.total > 0) {
      elBtnSendReport.disabled = false;
      elBtnSendReport.innerHTML = `✉️ Skicka besiktningsrapport (${prog.issues > 0 ? prog.issues + ' defekter' : 'Allt OK'})`;
    } else {
      elBtnSendReport.disabled = true;
      elBtnSendReport.innerHTML = `✉️ Kontrollera alla områden (${prog.completed}/${prog.total})`;
    }

    elFeaturesListContainer.innerHTML = park.featureIds.map(fId => {
      const featType = FEATURE_TYPES[fId];
      if (!featType) return "";

      const featStat = getFeatureStatus(park.id, fId);
      let cardClass = "";
      let statusBadge = "";

      if (featStat.status === "ok") {
        cardClass = "done-ok";
        statusBadge = `<span class="badge badge-ok">✓ Allt OK</span>`;
      } else if (featStat.status === "issue") {
        cardClass = "done-issue";
        statusBadge = `<span class="badge badge-issues">⚠ ${featStat.issuesCount} defekt${featStat.issuesCount > 1 ? 'er' : ''}</span>`;
      } else {
        statusBadge = `<span class="badge badge-pending">Tryck för att kontrollera</span>`;
      }

      return `
        <div class="feature-card ${cardClass}" data-feature-id="${featType.id}">
          <div class="feature-card-header">
            <div class="feature-card-title">
              <span>${featType.icon}</span>
              <span>${featType.name}</span>
            </div>
            ${statusBadge}
          </div>
          <div class="feature-card-desc">${featType.description}</div>
          <div class="feature-card-footer">
            <span>${featType.points.length} kontrollpunkter att gå igenom</span>
            <span>Öppna formulär →</span>
          </div>
        </div>
      `;
    }).join("");

    elFeaturesListContainer.querySelectorAll(".feature-card").forEach(card => {
      card.addEventListener("click", () => {
        const featureId = card.getAttribute("data-feature-id");
        navigateTo("form", { parkId: park.id, featureId });
      });
    });
  }

  // --- SKÄRM 3: KONTROLLPUNKTSFORMULÄR ---
  function renderFeatureForm(park, featureType) {
    elFormFeatureName.innerHTML = `<span>${featureType.icon}</span><span>${featureType.name}</span>`;
    elFormFeatureDesc.textContent = featureType.description;

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
          <div class="point-number">Kontrollpunkt ${idx + 1} av ${featureType.points.length}</div>
          <div class="point-text">${pointText}</div>
          <div class="toggle-group">
            <button type="button" class="toggle-btn btn-ok ${isOk ? 'selected' : ''}" data-idx="${idx}" data-val="ok">
              <span>✓</span> OK
            </button>
            <button type="button" class="toggle-btn btn-issue ${isIssue ? 'selected' : ''}" data-idx="${idx}" data-val="issue">
              <span>⚠</span> DEFEKT
            </button>
          </div>
          <div class="defect-box ${isIssue ? 'visible' : ''}" id="defect-box-${idx}">
            <label class="defect-label" for="defect-text-${idx}">Beskriv upptäckt defekt / problem:</label>
            <textarea id="defect-text-${idx}" class="defect-textarea" data-idx="${idx}" placeholder="t.ex. Lös bult, 3 cm för hög kant, trasig bräda...">${ans.note}</textarea>
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
      });
    });
  }

  function saveCurrentFeature() {
    const park = getPark(appState.selectedParkId);
    const featureType = FEATURE_TYPES[appState.selectedFeatureId];
    if (!park || !featureType) return;

    let unansweredCount = 0;
    let missingNotesCount = 0;

    featureType.points.forEach((pt, idx) => {
      const ans = currentFormAnswers[idx];
      if (!ans || !ans.status) {
        unansweredCount++;
      } else if (ans.status === "issue" && (!ans.note || !ans.note.trim())) {
        missingNotesCount++;
      }
    });

    if (unansweredCount > 0) {
      showToast(`Vänligen besvara alla punkter (${unansweredCount} kvar)`);
      for (let i = 0; i < featureType.points.length; i++) {
        if (!currentFormAnswers[i] || !currentFormAnswers[i].status) {
          const card = document.getElementById(`card-point-${i}`);
          if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        }
      }
      return;
    }

    if (missingNotesCount > 0) {
      if (!confirm(`Du har markerat ${missingNotesCount} punkt(er) som DEFEKT utan att skriva en förklaring. Vill du spara ändå?`)) {
        return;
      }
    }

    const parkSurvey = getParkSurvey(park.id);
    parkSurvey.features[featureType.id] = {
      completed: true,
      points: featureType.points.map((pt, idx) => ({
        text: pt,
        status: currentFormAnswers[idx].status,
        note: currentFormAnswers[idx].note ? currentFormAnswers[idx].note.trim() : ""
      }))
    };
    parkSurvey.status = "in-progress";
    parkSurvey.lastUpdated = new Date().toISOString();

    persistData();
    showToast(`${featureType.name} har sparats!`);
    navigateTo("overview", { parkId: park.id });
  }

  // --- RAPPORTGENERERING & E-POST ---
  function generateReportText(park) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("sv-SE") + " " + now.toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit' });
    const prog = calculateParkProgress(park.id);
    const parkSurvey = getParkSurvey(park.id);

    let lines = [];
    lines.push("LEKPLATSKONTROLL - BESIKTNINGSRAPPORT");
    lines.push(`Lekplats: ${park.name}`);
    lines.push(`Område: ${park.district}`);
    lines.push(`Adress: ${park.address}`);
    lines.push(`Datum: ${formattedDate}`);
    lines.push(`Besiktningsman: ${appState.settings.inspectorName}`);
    lines.push(`Status: ${prog.issues === 0 ? "Allt OK" : `${prog.issues} defekt(er) upptäckta`}`);
    lines.push("");

    let problemsFound = [];

    park.featureIds.forEach((fId) => {
      const featType = FEATURE_TYPES[fId];
      const featData = parkSurvey.features[fId];

      lines.push(featType.name.toUpperCase());

      if (featData && featData.points) {
        featData.points.forEach((pt) => {
          if (pt.status === "ok") {
            lines.push(`OK         •  ${pt.text}`);
          } else {
            const desc = pt.note && pt.note.trim() ? pt.note.trim() : "Defekt noterad (ingen beskrivning angiven)";
            lines.push(`DEFEKT     •  ${pt.text}: ${desc}`);
            problemsFound.push(`${featType.name} - ${pt.text}: ${desc}`);
          }
        });
      } else {
        lines.push("Området ej kontrollerat");
      }
      lines.push("");
    });

    lines.push("SAMMANFATTNING AV DEFEKTER");
    if (problemsFound.length === 0) {
      lines.push("Inga defekter upptäckta. All utrustning i gott skick.");
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
    const reportText = generateReportText(park);
    const formattedDate = new Date().toLocaleDateString("sv-SE");
    const subject = `[Lekplatskontroll] ${park.name} (${prog.issues === 0 ? 'Allt OK' : prog.issues + ' defekter'}) - ${formattedDate}`;
    const recipient = appState.settings.recipientEmail;

    elReportToDisplay.textContent = recipient;
    elReportSubjectDisplay.textContent = subject;
    elReportTextContent.textContent = reportText;

    elModalReportSummary.className = prog.issues > 0 ? "report-summary-box has-issues" : "report-summary-box";
    elModalReportSummary.innerHTML = `
      <div style="font-weight: 700; color: ${prog.issues > 0 ? '#991b1b' : '#166534'}; margin-bottom: 4px;">
        ${prog.issues > 0 ? `⚠ ${prog.issues} defekt${prog.issues > 1 ? 'er' : ''} upptäckta` : `✓ Alla ${prog.total} delar godkända utan anmärkning`}
      </div>
      <div style="font-size: 0.85rem; color: #475569;">
        Klar att skickas till drift- och underhållsavdelningen.
      </div>
    `;

    elModalReport.classList.add("active");
  }

  function triggerEmailDispatch() {
    const park = getPark(appState.selectedParkId);
    if (!park) return;

    const prog = calculateParkProgress(park.id);
    const reportText = generateReportText(park);
    const formattedDate = new Date().toLocaleDateString("sv-SE");
    const subject = `[Lekplatskontroll] ${park.name} (${prog.issues === 0 ? 'Allt OK' : prog.issues + ' defekter'}) - ${formattedDate}`;
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
      document.execCommand("copy");
      showToast("Rapporten har kopierats!");
    } catch (err) {
      showToast("Kunde inte kopiera automatiskt.");
    }
    document.body.removeChild(ta);
  }

  function finishAndClosePark() {
    const park = getPark(appState.selectedParkId);
    if (park) {
      const parkSurvey = getParkSurvey(park.id);
      parkSurvey.status = "completed";
      persistData();
    }
    elModalReport.classList.remove("active");
    showToast("Lekplatsen har markerats som klar!");
    navigateTo("parks");
  }

  // --- INSTÄLLNINGAR ---
  function openSettingsModal() {
    elSettingEmail.value = appState.settings.recipientEmail;
    elModalSettings.classList.add("active");
  }

  function saveSettings() {
    const email = elSettingEmail.value.trim();
    if (email) appState.settings.recipientEmail = email;

    persistSettings();
    elModalSettings.classList.remove("active");
    showToast("Inställningar sparade");
  }

  function clearAllData() {
    if (confirm("Är du säker på att du vill nollställa alla besiktningar? Detta går inte att ångra.")) {
      appState.surveyData = {};
      persistData();
      elModalSettings.classList.remove("active");
      showToast("Alla protokoll har nollställts");
      navigateTo("parks");
    }
  }

  // --- HÄNDELSEKOPPLINGAR ---
  function bindEvents() {
    elHeaderBack.addEventListener("click", () => {
      if (appState.currentScreen === "form") {
        navigateTo("overview", { parkId: appState.selectedParkId });
      } else if (appState.currentScreen === "overview") {
        navigateTo("parks");
      }
    });

    elParkSearchInput.addEventListener("input", (e) => {
      appState.searchQuery = e.target.value;
      elSearchClearBtn.style.display = appState.searchQuery ? "block" : "none";
      renderParksList();
    });

    elSearchClearBtn.addEventListener("click", () => {
      appState.searchQuery = "";
      elParkSearchInput.value = "";
      elSearchClearBtn.style.display = "none";
      renderParksList();
      elParkSearchInput.focus();
    });

    elBtnSaveFeature.addEventListener("click", saveCurrentFeature);

    elBtnSendReport.addEventListener("click", openReportModal);
    elBtnClosePark.addEventListener("click", () => {
      navigateTo("parks");
    });

    elBtnCloseReportModal.addEventListener("click", () => {
      elModalReport.classList.remove("active");
    });
    elBtnTriggerEmail.addEventListener("click", triggerEmailDispatch);
    elBtnCopyReport.addEventListener("click", copyReportToClipboard);
    elBtnFinishSurvey.addEventListener("click", finishAndClosePark);

    elBtnSettingsOpen.addEventListener("click", openSettingsModal);
    elBtnCloseSettingsModal.addEventListener("click", () => {
      elModalSettings.classList.remove("active");
    });
    elBtnSaveSettings.addEventListener("click", saveSettings);
    elBtnClearAllData.addEventListener("click", clearAllData);

    [elModalReport, elModalSettings].forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
