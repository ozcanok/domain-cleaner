/**
 * Domain Cleaner - Popup Script
 * Main UI logic for the extension popup
 * 
 * Dependencies: config.js, i18n.js, utils.js
 */

// UI-specific state (not in config.js)
const optionMetricMap = new Map();
const descMarqueeAnimationMap = new WeakMap();
let previewRequestId = 0;

const state = {
  tabId: null,
  origin: null,
  hostname: null,
  baseDomain: null,
  tabUrl: null,
  language: "en",
  languageSetting: "auto"
};


const ui = {
  siteInfo: document.getElementById("siteInfo"),
  status: document.getElementById("status"),
  counter: document.getElementById("counter"),
  preview: document.getElementById("preview"),
  clearAndReloadBtn: document.getElementById("clearAndReloadBtn"),
  presetCacheCookies: document.getElementById("presetCacheCookies"),
  presetDeep: document.getElementById("presetDeep"),
  presetCacheCookiesLabel: document.getElementById("presetCacheCookiesLabel"),
  presetDeepLabel: document.getElementById("presetDeepLabel"),
  shortcutsBtn: document.getElementById("shortcutsBtn"),
  siteDataBtn: document.getElementById("siteDataBtn"),
  incognitoBtn: document.getElementById("incognitoBtn"),
  appTitle: document.getElementById("appTitle"),
  clearAndReloadLabel: document.getElementById("clearAndReloadLabel"),
  languageLabel: document.getElementById("languageLabel"),
  languageSelect: document.getElementById("languageSelect"),
  shortcutsBtnLabel: document.getElementById("shortcutsBtnLabel"),
  siteDataBtnLabel: document.getElementById("siteDataBtnLabel"),
  hstsHint: document.getElementById("hstsHint"),
  logoutLegend: document.getElementById("logoutLegend"),
  optionsSection: document.getElementById("optionsSection"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  settingsClose: document.getElementById("settingsClose"),
  settingsTitle: document.getElementById("settingsTitle"),
  deepCleanModal: document.getElementById("deepCleanModal"),
  deepCleanConfirm: document.getElementById("deepCleanConfirm"),
  deepCleanCancel: document.getElementById("deepCleanCancel"),
  deepCleanWarning: document.getElementById("deepCleanWarning")
};

init();


function t(key, vars = {}) {
  const langPack = I18N[state.language] || I18N.en;
  const fallback = I18N.en[key] ?? key;
  const template = langPack[key] ?? fallback;
  return interpolate(template, vars);
}

async function getSavedLanguageSetting() {
  try {
    const result = await chrome.storage.local.get(UI_LANGUAGE_KEY);
    const setting = result?.[UI_LANGUAGE_KEY];
    if (setting === "auto" || SUPPORTED_LANGUAGES.includes(setting)) {
      return setting;
    }
  } catch (_) {
    // ignore storage errors
  }

  return "auto";
}

async function persistLanguageSetting(setting) {
  try {
    await chrome.storage.local.set({ [UI_LANGUAGE_KEY]: setting });
  } catch (_) {
    // ignore storage errors
  }
}

function resolveSystemLanguage() {
  const uiLanguage = typeof chrome.i18n?.getUILanguage === "function"
    ? chrome.i18n.getUILanguage()
    : navigator.language;
  return normalizeLanguageCode(uiLanguage);
}

function getEffectiveLanguage(setting) {
  return setting === "auto" ? resolveSystemLanguage() : normalizeLanguageCode(setting);
}

function applyLocalization() {
  document.documentElement.lang = state.language;
  document.title = t("appTitle");
  const appTitleText = document.getElementById("appTitleText");
  if (appTitleText) appTitleText.textContent = t("appTitle");
  ui.presetCacheCookiesLabel.textContent = t("presetCacheCookies");
  ui.presetDeepLabel.textContent = t("presetDeep");
  ui.clearAndReloadLabel.textContent = t("clearAndReload");
  ui.settingsBtn.setAttribute("title", t("settings"));
  ui.settingsBtn.setAttribute("aria-label", t("settings"));
  ui.settingsTitle.textContent = t("settings");
  ui.languageLabel.textContent = t("language");
  ui.shortcutsBtnLabel.textContent = t("shortcuts");
  ui.siteDataBtnLabel.textContent = t("hsts");
  ui.hstsHint.textContent = t("hstsHint");
  ui.optionsSection.setAttribute("aria-label", t("optionsAria"));
  ui.incognitoBtn.setAttribute("title", t("incognitoTitle"));
  ui.incognitoBtn.setAttribute("aria-label", t("incognitoTitle"));
  const logoutHint = ui.logoutLegend.querySelector("[data-i18n-logout-hint]");
  if (logoutHint) {
    logoutHint.textContent = t("logoutLegend");
  }
  document.querySelectorAll(".option-warn").forEach((el) => {
    el.setAttribute("title", t("logoutLegend"));
  });

  // Deep clean modal
  ui.deepCleanWarning.textContent = t("deepCleanWarning");
  ui.deepCleanConfirm.textContent = t("deepCleanConfirm");
  ui.deepCleanCancel.textContent = t("deepCleanCancel");
  const deepItems = {
    cache: "deepCleanCache",
    cookies: "deepCleanCookies",
    storage: "deepCleanStorage",
    history: "deepCleanHistory",
    technical: "deepCleanTechnical"
  };
  for (const [attr, key] of Object.entries(deepItems)) {
    const li = document.querySelector(`[data-i18n-deep="${attr}"]`);
    if (li) li.textContent = t(key);
  }

  for (const key of UI_OPTION_KEYS) {
    const labelNode = document.querySelector(`[data-i18n-option-label="${key}"] .option-label-text`);
    const descNode = document.querySelector(`[data-i18n-option-desc="${key}"]`);
    if (labelNode) {
      labelNode.textContent = t(`option_${key}_label`);
    }
    if (descNode) {
      descNode.textContent = t(`option_${key}_desc`);
      const existingTrack = descNode.querySelector(".option-desc-track");
      if (existingTrack) {
        existingTrack.textContent = descNode.textContent;
      }
    }
  }

  if (ui.languageSelect) {
    buildLanguageMenu();
    syncLanguageToggleText();
  }

  const idleCandidates = new Set(
    SUPPORTED_LANGUAGES.map((code) => I18N[code]?.counterIdle).filter(Boolean).concat("")
  );
  if (idleCandidates.has(ui.counter.textContent.trim())) {
    ui.counter.textContent = t("counterIdle");
  }

  const previewCandidates = new Set(
    SUPPORTED_LANGUAGES.flatMap((code) => [
      I18N[code]?.previewLoading,
      I18N[code]?.previewFailed
    ]).filter(Boolean)
  );
  if (previewCandidates.has(ui.preview.textContent.trim())) {
    ui.preview.textContent = t("previewLoading");
  }

}

async function init() {
  state.languageSetting = await getSavedLanguageSetting();
  state.language = getEffectiveLanguage(state.languageSetting);
  applyLocalization();

  if (ui.languageSelect) {
    ui.languageSelect.dataset.value = state.languageSetting;
    syncLanguageToggleText();
  }

  await restoreSelectedOptions();
  bindEvents();
  initOptionMetrics();
  initOptionDescriptionMarquee();
  updateActivePreset();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      throw new Error(t("activeTabMissing"));
    }

    const parsed = parseTabUrl(tab.url);
    state.tabId = tab.id;
    state.origin = parsed.origin;
    state.hostname = parsed.hostname;
    state.baseDomain = getBaseDomain(parsed.hostname);
    state.tabUrl = tab.url;

    ui.siteInfo.textContent = parsed.hostname;
    await restoreLastResetResult();
    await refreshPreview();
  } catch (error) {
    setStatus(error.message, true);
    ui.siteInfo.textContent = t("pageNotSupported");
    ui.clearAndReloadBtn.disabled = true;
    ui.preview.textContent = t("statusUnsupported");
  }
}

function initOptionDescriptionMarquee() {
  const descriptions = document.querySelectorAll(".option-desc");

  descriptions.forEach((desc) => {
    let track = desc.querySelector(".option-desc-track");

    if (!track) {
      track = document.createElement("span");
      track.className = "option-desc-track";
      track.textContent = (desc.textContent || "").trim();
      desc.textContent = "";
      desc.appendChild(track);
    }

    updateOptionDescriptionMarquee(desc, track);
    bindOptionDescriptionMarqueeInteraction(desc, track);
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll(".option-desc").forEach((desc) => {
      const track = desc.querySelector(".option-desc-track");
      if (track) {
        updateOptionDescriptionMarquee(desc, track);
      }
    });
  });
}

function updateOptionDescriptionMarquee(desc, track) {
  stopOptionDescriptionMarquee(track);
  desc.classList.remove("is-overflow");
  desc.style.removeProperty("--desc-shift");
  desc.style.removeProperty("--desc-duration");
  delete desc.dataset.descShift;
  delete desc.dataset.descDuration;

  const overflow = Math.ceil(track.scrollWidth - desc.clientWidth);

  if (overflow <= 2) {
    return;
  }

  // Text scroll speed tuned for short extension cards.
  const duration = Math.max(1.6, Math.min(4.2, overflow / 58 + 1.1));
  desc.classList.add("is-overflow");
  desc.style.setProperty("--desc-shift", `${overflow}px`);
  desc.style.setProperty("--desc-duration", `${duration}s`);
  desc.dataset.descShift = String(overflow);
  desc.dataset.descDuration = String(duration);
}

function bindOptionDescriptionMarqueeInteraction(desc, track) {
  if (desc.dataset.marqueeBound === "1") {
    return;
  }

  const item = desc.closest(".option-item");

  if (!item) {
    return;
  }

  item.addEventListener("mouseenter", () => {
    startOptionDescriptionMarquee(desc, track);
  });

  item.addEventListener("mouseleave", () => {
    stopOptionDescriptionMarquee(track);
  });

  desc.dataset.marqueeBound = "1";
}

function startOptionDescriptionMarquee(desc, track) {
  if (!desc.classList.contains("is-overflow")) {
    return;
  }

  const shift = Number(desc.dataset.descShift || "0");
  const moveDuration = Number(desc.dataset.descDuration || "0");

  if (shift <= 0 || moveDuration <= 0) {
    return;
  }

  stopOptionDescriptionMarquee(track);

  const totalDuration = moveDuration + DESC_END_PAUSE_SECONDS;
  const holdOffset = moveDuration / totalDuration;

  const animation = track.animate(
    [
      { transform: "translateX(0)", offset: 0 },
      { transform: `translateX(-${shift}px)`, offset: holdOffset },
      { transform: `translateX(-${shift}px)`, offset: 1 }
    ],
    {
      duration: Math.round(totalDuration * 1000),
      iterations: Infinity,
      easing: "linear"
    }
  );

  descMarqueeAnimationMap.set(track, animation);
}

function stopOptionDescriptionMarquee(track) {
  const animation = descMarqueeAnimationMap.get(track);

  if (animation) {
    animation.cancel();
    descMarqueeAnimationMap.delete(track);
  }

  track.style.transform = "translateX(0)";
}

function bindEvents() {
  // Preset buttons
  ui.presetCacheCookies.addEventListener("click", () => applyPreset(presets.cacheCookies));
  ui.presetDeep.addEventListener("click", () => {
    ui.deepCleanModal.hidden = false;
  });
  ui.deepCleanConfirm.addEventListener("click", async () => {
    ui.deepCleanModal.hidden = true;
    await runDeepClean();
  });
  ui.deepCleanCancel.addEventListener("click", () => {
    ui.deepCleanModal.hidden = true;
  });
  ui.deepCleanModal.addEventListener("click", (e) => {
    if (e.target === ui.deepCleanModal) {
      ui.deepCleanModal.hidden = true;
    }
  });

  // Checkbox change events
  document.querySelectorAll(checkboxSelector).forEach((checkbox) => {
    checkbox.addEventListener("change", () => {

      void persistSelectedOptions();
      void refreshPreview();
      updateActivePreset();
    });
  });
  ui.clearAndReloadBtn.addEventListener("click", async () => {
    await runReset({ reloadAfter: true });
  });

  ui.siteDataBtn.addEventListener("click", async () => {
    await openHstsDeletePage();
  });

  ui.shortcutsBtn.addEventListener("click", async () => {
    await openExtensionShortcutsPage();
  });

  ui.incognitoBtn.addEventListener("click", async () => {
    await openCurrentUrlInIncognito();
  });

  ui.settingsBtn.addEventListener("click", () => {
    ui.settingsModal.hidden = false;
  });
  ui.settingsClose.addEventListener("click", () => {
    ui.settingsModal.hidden = true;
  });
  ui.settingsModal.addEventListener("click", (e) => {
    if (e.target === ui.settingsModal) {
      ui.settingsModal.hidden = true;
    }
  });

  if (ui.languageSelect) {
    const toggle = ui.languageSelect.querySelector(".custom-select-toggle");
    const menu = ui.languageSelect.querySelector(".custom-select-menu");

    toggle.addEventListener("click", () => {
      const isOpen = !menu.hidden;
      menu.hidden = !menu.hidden;
      ui.languageSelect.classList.toggle("open", !isOpen);
    });

    menu.addEventListener("click", async (e) => {
      const item = e.target.closest(".custom-select-item");
      if (!item) return;
      const selected = item.dataset.value;
      ui.languageSelect.dataset.value = selected;
      menu.hidden = true;
      ui.languageSelect.classList.remove("open");
      state.languageSetting = selected === "auto" || SUPPORTED_LANGUAGES.includes(selected) ? selected : "auto";
      state.language = getEffectiveLanguage(state.languageSetting);
      await persistLanguageSetting(state.languageSetting);
      applyLocalization();
      initOptionDescriptionMarquee();
      await refreshPreview();
    });

    document.addEventListener("click", (e) => {
      if (!ui.languageSelect.contains(e.target)) {
        menu.hidden = true;
        ui.languageSelect.classList.remove("open");
      }
    });
  }

}

function parseTabUrl(url) {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(t("httpOnly"));
  }

  return {
    origin: parsed.origin,
    hostname: parsed.hostname
  };
}

function applyPreset(keys) {
  document.querySelectorAll(checkboxSelector).forEach((checkbox) => {
    checkbox.checked = keys.includes(checkbox.dataset.key);
  });
  void persistSelectedOptions();
  void refreshPreview();
  updateActivePreset();
}

async function runDeepClean() {
  // Select all checkboxes
  document.querySelectorAll(checkboxSelector).forEach((checkbox) => {
    checkbox.checked = true;
  });
  updateActivePreset();

  if (!state.origin || !state.hostname) {
    setStatus(t("invalidTab"), true);
    return;
  }

  // All UI keys + hidden technical keys
  const selectedKeys = expandKeys(UI_OPTION_KEYS, true);

  try {
    toggleButtons(true);
    setStatus(t("cleaning"));
    setCounter(t("cleaningRunning"));
    resetOptionMetrics();

    const scope = await getResetScope();

    const clearStats = await clearSelectedData({
      selectedKeys,
      origins: scope.origins,
      hostnames: scope.hostnames,
      tabIds: scope.tabIds
    });

    await reloadTabs(scope.tabIds);

    setCounter(buildCounterText(UI_OPTION_KEYS));
    updateOptionMetrics(UI_OPTION_KEYS, clearStats.perKeyCounts);
    setStatus(t("cleaningDone"), false, true);
    await persistLastResetResult({
      status: {
        message: t("cleaningDone"),
        messageKey: "cleaningDone",
        isError: false,
        isSuccess: true
      },
      counterText: buildCounterText(UI_OPTION_KEYS),
      perKeyCounts: clearStats.perKeyCounts,
      savedAt: Date.now()
    });
  } catch (error) {
    setStatus(t("errorPrefix", { message: error.message }), true);
  } finally {
    toggleButtons(false);
    await refreshPreview();
  }
}

function updateActivePreset() {
  const selectedKeys = getSelectedKeys().sort().join(",");
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    const presetName = btn.dataset.preset;
    const presetKeys = presets[presetName]?.slice().sort().join(",") || "";
    btn.classList.toggle("active-preset", presetKeys === selectedKeys);
  });
}

function getSelectedKeys() {
  return [...document.querySelectorAll(checkboxSelector)]
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset.key);
}

function getDefaultSelectedKeys() {
  return DEFAULT_SELECTED_KEYS;
}

async function restoreSelectedOptions() {
  const storageArea = chrome.storage?.local;
  const defaults = getDefaultSelectedKeys();
  let keys = defaults;

  if (storageArea) {
    try {
      const result = await storageArea.get(OPTION_SELECTIONS_KEY);
      if (Array.isArray(result?.[OPTION_SELECTIONS_KEY])) {
        keys = result[OPTION_SELECTIONS_KEY];
      }
    } catch (_) {
      // Depolama okunamazsa varsayilan secimler kullanilir.
    }
  }

  document.querySelectorAll(checkboxSelector).forEach((checkbox) => {
    checkbox.checked = keys.includes(checkbox.dataset.key);
  });
}

async function persistSelectedOptions() {
  const storageArea = chrome.storage?.local;
  if (!storageArea) {
    return;
  }

  try {
    await storageArea.set({
      [OPTION_SELECTIONS_KEY]: getSelectedKeys()
    });
  } catch (_) {
    // Depolama hatalari popup akisinda kritik degildir.
  }
}

async function runReset({ reloadAfter }) {
  if (!state.origin || !state.hostname) {
    setStatus(t("invalidTab"), true);
    return;
  }

  const uiKeys = getSelectedKeys();

  if (uiKeys.length === 0) {
    setStatus(t("selectAtLeastOne"), true);
    return;
  }

  const selectedKeys = expandKeys(uiKeys, false);

  try {
    toggleButtons(true);
    setStatus(t("cleaning"));
    setCounter(t("cleaningRunning"));
    resetOptionMetrics();

    const scope = await getResetScope();

    const clearStats = await clearSelectedData({
      selectedKeys,
      origins: scope.origins,
      hostnames: scope.hostnames,
      tabIds: scope.tabIds
    });

    if (reloadAfter) {
      await reloadTabs(scope.tabIds);
    }

    setCounter(buildCounterText(uiKeys));
    updateOptionMetrics(uiKeys, clearStats.perKeyCounts);
    setStatus(t("cleaningDone"), false, true);
    await persistLastResetResult({
      status: {
        message: t("cleaningDone"),
        messageKey: "cleaningDone",
        isError: false,
        isSuccess: true
      },
      counterText: ui.counter.textContent,
      perKeyCounts: clearStats.perKeyCounts
    });
  } catch (error) {
    setStatus(t("errorPrefix", { message: error.message }), true);
    await persistLastResetResult({
      status: {
        message: t("errorPrefix", { message: error.message }),
        messageKey: "errorPrefix",
        messageArg: error.message,
        isError: true,
        isSuccess: false
      },
      counterText: ui.counter.textContent,
      perKeyCounts: {}
    });
  } finally {
    toggleButtons(false);
    await refreshPreview();
  }
}

// Keys that support origin-based filtering in chrome.browsingData.remove
const ORIGIN_FILTERABLE_KEYS = new Set([
  "cache", "cacheStorage", "cookies", "fileSystems",
  "indexedDB", "localStorage", "serviceWorkers", "webSQL", "appcache"
]);

async function clearSelectedData({ selectedKeys, origins, hostnames, tabIds }) {
  const apiKeys = selectedKeys.filter((key) => key !== "sessionStorage");
  let cookiesRemoved = 0;
  let sessionEntriesCleared = 0;
  const perKeyCounts = {};

  for (const key of selectedKeys) {
    perKeyCounts[key] = 0;
  }

  if (apiKeys.includes("cookies")) {
    const cookieMap = await collectCookiesForHostnames(hostnames);
    cookiesRemoved = await removeCookiesFromMap(cookieMap);
    perKeyCounts.cookies = cookiesRemoved;
  }

  // Split keys: origin-filterable vs non-origin
  const originKeys = apiKeys.filter((k) => ORIGIN_FILTERABLE_KEYS.has(k));
  const globalKeys = apiKeys.filter((k) => !ORIGIN_FILTERABLE_KEYS.has(k) && k !== "history");

  // Origin-filterable types: use origins filter
  if (originKeys.length > 0) {
    const dataToRemove = {};
    for (const key of originKeys) {
      dataToRemove[key] = true;
    }
    await chrome.browsingData.remove({ origins, since: 0 }, dataToRemove);
    for (const key of originKeys) {
      if (key !== "cookies") {
        perKeyCounts[key] = origins.length;
      }
    }
  }

  // History: per-domain via chrome.history API
  if (selectedKeys.includes("history")) {
    perKeyCounts.history = await clearHistoryForHostnames(hostnames);
  }

  // Global-only types (downloads, formData): no per-domain API
  if (globalKeys.length > 0) {
    const dataToRemove = {};
    for (const key of globalKeys) {
      dataToRemove[key] = true;
    }
    await chrome.browsingData.remove({ since: 0 }, dataToRemove);
    for (const key of globalKeys) {
      perKeyCounts[key] = 1;
    }
  }

  if (selectedKeys.includes("sessionStorage")) {
    sessionEntriesCleared = await clearSessionStorageForTabs(tabIds);
    perKeyCounts.sessionStorage = sessionEntriesCleared;
  }

  return {
    cookiesRemoved,
    sessionEntriesCleared,
    perKeyCounts
  };
}

async function clearHistoryForHostnames(hostnames) {
  let deleted = 0;
  for (const hostname of hostnames) {
    try {
      const results = await chrome.history.search({
        text: hostname,
        startTime: 0,
        maxResults: 10000
      });
      for (const item of results) {
        try {
          const url = new URL(item.url);
          if (url.hostname === hostname || url.hostname.endsWith("." + hostname)) {
            await chrome.history.deleteUrl({ url: item.url });
            deleted++;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }
  return deleted;
}

async function clearSessionStorage(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      try {
        const count = sessionStorage.length;
        sessionStorage.clear();
        return count;
      } catch (_) {
        // frame bazli erisim hatalari gormezden gelinir
        return 0;
      }
    }
  });

  return results.reduce((total, item) => total + (item.result || 0), 0);
}

async function clearSessionStorageForTabs(tabIds) {
  let total = 0;

  for (const tabId of tabIds) {
    try {
      total += await clearSessionStorage(tabId);
    } catch (_) {
      // Erişilemeyen sekmeler atlanır.
    }
  }

  return total;
}

async function collectCookiesForHostnames(hostnames) {
  const cookieMap = new Map();

  for (const hostname of hostnames) {
    const domains = getCookieCandidateDomains(hostname);

    for (const domain of domains) {
      const cookies = await chrome.cookies.getAll({ domain });

      for (const cookie of cookies) {
        const key = `${cookie.storeId}|${cookie.domain}|${cookie.path}|${cookie.name}`;
        cookieMap.set(key, cookie);
      }
    }
  }

  return cookieMap;
}

async function removeCookiesFromMap(cookieMap) {
  let removed = 0;

  for (const cookie of cookieMap.values()) {
    const host = cookie.domain.replace(/^\./, "");
    const protocol = cookie.secure ? "https:" : "http:";
    const url = `${protocol}//${host}${cookie.path}`;

    try {
      const result = await chrome.cookies.remove({
        url,
        name: cookie.name,
        storeId: cookie.storeId
      });

      if (result) {
        removed += 1;
      }
    } catch (_) {
      // bazi cookie turleri silinemeyebilir; digerlerine devam edilir
    }
  }

  return removed;
}


function toggleButtons(disabled) {
  ui.clearAndReloadBtn.disabled = disabled;
  ui.presetCacheCookies.disabled = disabled;
  ui.presetDeep.disabled = disabled;
  ui.shortcutsBtn.disabled = disabled;
  ui.siteDataBtn.disabled = disabled;
  ui.incognitoBtn.disabled = disabled;
}

async function openExtensionShortcutsPage() {
  try {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    setStatus(t("shortcutsOpened"), false, true);
  } catch (error) {
    setStatus(t("shortcutsFailed", { message: error.message }), true);
  }
}

async function openHstsDeletePage() {
  if (!state.hostname) {
    setStatus(t("hstsNoDomain"), true);
    return;
  }

  const baseDomain = getBaseDomain(state.hostname);

  try {
    await navigator.clipboard.writeText(baseDomain);
  } catch (_) {
    // Pano yazma basarisiz olsa da sayfayi acmaya devam edilir.
  }

  try {
    await chrome.tabs.create({ url: "chrome://net-internals/#hsts" });
    setStatus(t("hstsOpened", { domain: baseDomain }), false, true);
  } catch (error) {
    setStatus(t("hstsFailed", { message: error.message }), true);
  }
}

async function openCurrentUrlInIncognito() {
  if (!state.tabUrl || !state.origin) {
    setStatus(t("incognitoUnavailable"), true);
    return;
  }

  try {
    const currentWindow = await chrome.windows.getCurrent();
    const opts = { url: state.tabUrl, incognito: true };
    if (currentWindow.state === "maximized" || currentWindow.state === "fullscreen") {
      opts.state = currentWindow.state;
    } else {
      opts.width = currentWindow.width;
      opts.height = currentWindow.height;
      opts.left = currentWindow.left;
      opts.top = currentWindow.top;
    }
    await chrome.windows.create(opts);
    setStatus(t("incognitoOpened"), false, true);
  } catch (error) {
    setStatus(t("incognitoFailed"), true);
  }
}

function buildLanguageMenu() {
  const menu = ui.languageSelect.querySelector(".custom-select-menu");
  const current = ui.languageSelect.dataset.value || state.languageSetting;
  menu.innerHTML = "";

  const items = [
    { value: "auto", label: t("lang_auto") },
    ...SUPPORTED_LANGUAGES.map((code) => ({
      value: code,
      label: LANGUAGE_OPTION_LABELS[code] || code
    }))
  ];

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "custom-select-item" + (item.value === current ? " active" : "");
    li.dataset.value = item.value;
    li.textContent = item.label;
    menu.appendChild(li);
  }
}

function syncLanguageToggleText() {
  const current = ui.languageSelect.dataset.value || state.languageSetting;
  const text = ui.languageSelect.querySelector(".custom-select-text");
  if (current === "auto") {
    text.textContent = t("lang_auto");
  } else {
    text.textContent = LANGUAGE_OPTION_LABELS[current] || current;
  }
}

function setStatus(message, isError = false, isSuccess = false) {
  ui.status.textContent = message;
  ui.status.classList.remove("error", "success");

  if (isError) {
    ui.status.classList.add("error");
  }

  if (isSuccess) {
    ui.status.classList.add("success");
  }
}

function setCounter(message) {
  ui.counter.textContent = message;
}

function buildCounterText(uiKeys) {
  const labels = uiKeys.map((key) => t(`option_${key}_label`));
  return t("counterResult", { categories: labels.join(", ") });
}


async function measureStorageUsage(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        if (!("storage" in navigator) || !navigator.storage?.estimate) {
          return null;
        }

        try {
          const estimate = await navigator.storage.estimate();
          return typeof estimate.usage === "number" ? estimate.usage : null;
        } catch (_) {
          return null;
        }
      }
    });

    return result?.result ?? null;
  } catch (_) {
    return null;
  }
}

async function measureUsageForTabs(tabIds) {
  let total = 0;

  for (const tabId of new Set(tabIds)) {
    const usage = await measureStorageUsage(tabId);

    if (typeof usage === "number") {
      total += usage;
    }
  }

  return total;
}

function getResetScope() {
  return {
    tabIds: [state.tabId],
    measureTabIds: [state.tabId],
    origins: [state.origin],
    hostnames: [state.hostname]
  };
}

async function reloadTabs(tabIds) {
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.reload(tabId, { bypassCache: true });
    } catch (_) {
      // Kapalı veya erişilemeyen sekmeler atlanır.
    }
  }
}

async function refreshPreview() {
  if (!state.origin || !state.hostname) {
    return;
  }

  const requestId = ++previewRequestId;
  ui.preview.textContent = t("previewLoading");

  try {
    const scope = getResetScope();

    const [usageBytes, cookieCount] = await Promise.all([
      measureUsageForTabs(scope.measureTabIds),
      countCookiesForHostnames(scope.hostnames)
    ]);

    if (requestId !== previewRequestId) {
      return;
    }

    ui.preview.textContent = "";
    const parts = [
      { icon: "#i-circle-dot", text: cookieCount },
      { icon: "#i-database", text: formatMegabytes(usageBytes) + " MB" }
    ];
    parts.forEach((part, i) => {
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "preview-sep";
        sep.textContent = "|";
        ui.preview.appendChild(sep);
      }
      const span = document.createElement("span");
      span.className = "preview-part";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("preview-icon");
      svg.setAttribute("aria-hidden", "true");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", part.icon);
      svg.appendChild(use);
      span.appendChild(svg);
      span.appendChild(document.createTextNode(part.text));
      ui.preview.appendChild(span);
    });
  } catch (_) {
    if (requestId !== previewRequestId) {
      return;
    }

    ui.preview.textContent = t("previewFailed");
  }
}

async function countCookiesForHostnames(hostnames) {
  const cookieMap = await collectCookiesForHostnames(hostnames);
  return cookieMap.size;
}

function initOptionMetrics() {
  document.querySelectorAll(checkboxSelector).forEach((checkbox) => {
    const key = checkbox.dataset.key;
    const title = checkbox.closest(".option-item")?.querySelector(".option-title");

    if (!key || !title) {
      return;
    }

    const badge = document.createElement("span");
    badge.className = "option-metric";
    badge.hidden = true;
    title.appendChild(badge);
    optionMetricMap.set(key, badge);
  });
}

function resetOptionMetrics() {
  optionMetricMap.forEach((badge) => {
    badge.hidden = true;
    badge.textContent = "";
  });
}

function updateOptionMetrics(uiKeys, perKeyCounts) {
  for (const uiKey of uiKeys) {
    const badge = optionMetricMap.get(uiKey);
    if (!badge) continue;

    // Aggregate counts from all sub-keys
    const subKeys = KEY_EXPANSION[uiKey] || [uiKey];
    let total = 0;
    for (const sk of subKeys) {
      total += perKeyCounts[sk] || 0;
    }

    if (total <= 0) {
      badge.hidden = true;
      badge.textContent = "";
      continue;
    }

    badge.textContent = String(total);
    badge.hidden = false;
  }
}

function getLastResultStorageKey(tabId) {
  return `${LAST_RESULT_KEY_PREFIX}${tabId}`;
}

function getStorageArea() {
  return chrome.storage?.session || chrome.storage?.local || null;
}

async function persistLastResetResult(payload) {
  if (!state.tabId) {
    return;
  }

  const storageArea = getStorageArea();

  if (!storageArea) {
    return;
  }

  try {
    await storageArea.set({
      [getLastResultStorageKey(state.tabId)]: {
        ...payload,
        savedAt: Date.now()
      }
    });
  } catch (_) {
    // Depolama hataları UI akışını etkilemez.
  }
}

async function restoreLastResetResult() {
  if (!state.tabId) {
    return;
  }

  const storageArea = getStorageArea();

  if (!storageArea) {
    return;
  }

  try {
    const key = getLastResultStorageKey(state.tabId);
    const result = await storageArea.get(key);
    const saved = result?.[key];

    if (!saved) {
      return;
    }

    if (saved.status) {
      const translated = saved.status.messageKey
        ? t(saved.status.messageKey, { message: saved.status.messageArg || "" })
        : saved.status.message;
      if (translated) {
        setStatus(translated, Boolean(saved.status.isError), Boolean(saved.status.isSuccess));
      }
    }

    if (saved.counterText) {
      setCounter(saved.counterText);
    }

    resetOptionMetrics();
    updateOptionMetrics(Object.keys(saved.perKeyCounts || {}), saved.perKeyCounts || {});
  } catch (_) {
    // Depolama hataları sessizce yok sayılır.
  }
}


