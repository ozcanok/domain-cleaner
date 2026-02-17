/**
 * Domain Cleaner - Background Script
 * Service worker for keyboard shortcuts and context menus
 * 
 * Dependencies: config.js, utils.js
 */

// Import dependencies
importScripts('config.js', 'utils.js');

// Background-specific i18n (minimal)
const BG_I18N = {
  en: {
    httpOnly: "Works only on http/https pages.",
    ctxParent: "Domain Cleaner",
    ctxCacheCookies: "Cache & Cookies",
    ctxDeep: "Deep Clean",
    ctxIncognito: "Open in Incognito",
    ctxClearHistory: "Clear Domain History",
    notifCleaned: "Cleaned {domain}",
    notifHistoryCleared: "History cleared for {domain}"
  },
  tr: {
    httpOnly: "Sadece http/https sayfalarda çalışabilir.",
    ctxParent: "Domain Cleaner",
    ctxCacheCookies: "Önbellek & Çerez",
    ctxDeep: "Derin Temizlik",
    ctxIncognito: "Gizli Pencerede Aç",
    ctxClearHistory: "Domain Geçmişini Temizle",
    notifCleaned: "{domain} temizlendi",
    notifHistoryCleared: "{domain} geçmişi temizlendi"
  }
};

async function getLanguageCode() {
  try {
    const result = await chrome.storage.local.get(UI_LANGUAGE_KEY);
    const setting = String(result?.[UI_LANGUAGE_KEY] || "auto").toLowerCase();
    if (setting === "tr" || setting === "en") {
      return setting;
    }
  } catch (_) {
    // ignore storage errors
  }

  const uiLanguage = typeof chrome.i18n?.getUILanguage === "function"
    ? chrome.i18n.getUILanguage()
    : "en";
  return String(uiLanguage).toLowerCase().startsWith("tr") ? "tr" : "en";
}

async function t(key, vars = {}) {
  const lang = await getLanguageCode();
  const pack = BG_I18N[lang] || BG_I18N.en;
  return interpolate(pack[key] || BG_I18N.en[key] || key, vars);
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "cache_cookies_clean") {
    void runCacheCookiesClean();
    return;
  }

  if (command === "deep_clean") {
    void runDeepClean();
    return;
  }

  if (command === "open_in_incognito") {
    void runOpenInIncognito();
    return;
  }

  if (command === "clear_domain_history") {
    void runClearDomainHistory();
  }
});

async function runCacheCookiesClean() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  let parsed;
  try { parsed = parseTabUrl(tab.url); } catch (_) { return; }

  try {
    await clearSelectedData({
      selectedKeys: expandKeys(presets.cacheCookies, false),
      origins: [parsed.origin],
      hostnames: [parsed.hostname],
      tabIds: [tab.id]
    });
    await reloadTabs([tab.id]);
    showNotification(await t("notifCleaned", { domain: parsed.hostname }));
  } catch (_) {}
}

async function runDeepClean() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  let parsed;
  try { parsed = parseTabUrl(tab.url); } catch (_) { return; }

  try {
    await clearSelectedData({
      selectedKeys: expandKeys(UI_OPTION_KEYS, true),
      origins: [parsed.origin],
      hostnames: [parsed.hostname],
      tabIds: [tab.id]
    });
    await reloadTabs([tab.id]);
    showNotification(await t("notifCleaned", { domain: parsed.hostname }));
  } catch (_) {}
}

async function runOpenInIncognito() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  try {
    parseTabUrl(tab.url);
    const currentWindow = await chrome.windows.getCurrent();
    const opts = { url: tab.url, incognito: true };
    if (currentWindow.state === "maximized" || currentWindow.state === "fullscreen") {
      opts.state = currentWindow.state;
    } else {
      opts.width = currentWindow.width;
      opts.height = currentWindow.height;
      opts.left = currentWindow.left;
      opts.top = currentWindow.top;
    }
    await chrome.windows.create(opts);
  } catch (_) {}
}

async function runClearDomainHistory() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  let parsed;
  try { parsed = parseTabUrl(tab.url); } catch (_) { return; }

  try {
    await clearHistoryForHostnames([parsed.hostname]);
    showNotification(await t("notifHistoryCleared", { domain: parsed.hostname }));
  } catch (_) {}
}

function parseTabUrl(url) {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(BG_I18N.en.httpOnly);
  }

  return {
    origin: parsed.origin,
    hostname: parsed.hostname
  };
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
      // Erisilemeyen sekmeler atlanir.
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
      // Bazi cookie turleri silinemeyebilir.
    }
  }

  return removed;
}


async function reloadTabs(tabIds) {
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.reload(tabId, { bypassCache: true });
    } catch (_) {
      // Kapali veya erisilemeyen sekmeler atlanir.
    }
  }
}

// Context menu setup
async function buildContextMenus() {
  await chrome.contextMenus.removeAll();
  const lang = await getLanguageCode();
  const pack = BG_I18N[lang] || BG_I18N.en;
  const label = (key) => pack[key] || BG_I18N.en[key] || key;

  chrome.contextMenus.create({ id: "dc-parent", title: label("ctxParent"), contexts: ["page", "frame"] });
  chrome.contextMenus.create({ id: "dc-cache-cookies", parentId: "dc-parent", title: label("ctxCacheCookies"), contexts: ["page", "frame"] });
  chrome.contextMenus.create({ id: "dc-deep-clean", parentId: "dc-parent", title: label("ctxDeep"), contexts: ["page", "frame"] });
  chrome.contextMenus.create({ id: "dc-incognito", parentId: "dc-parent", title: label("ctxIncognito"), contexts: ["page", "frame"] });
  chrome.contextMenus.create({ id: "dc-clear-history", parentId: "dc-parent", title: label("ctxClearHistory"), contexts: ["page", "frame"] });
}

chrome.runtime.onInstalled.addListener(() => {
  void buildContextMenus();
});

// Rebuild menus when language changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes[UI_LANGUAGE_KEY]) {
    await buildContextMenus();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = info.menuItemId;

  if (id === "dc-cache-cookies") {
    await runCacheCookiesClean();
    return;
  }

  if (id === "dc-deep-clean") {
    await runDeepClean();
    return;
  }

  if (id === "dc-incognito") {
    await runOpenInIncognito();
    return;
  }

  if (id === "dc-clear-history") {
    await runClearDomainHistory();
  }
});

function showNotification(message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Domain Cleaner",
    message
  });
}


