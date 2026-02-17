/**
 * Domain Cleaner - Configuration
 * Constants, presets, and configuration values
 */

// Storage keys
const OPTION_SELECTIONS_KEY = "selectedOptionKeys:v2";
const LAST_RESULT_KEY_PREFIX = "lastResetResult:";
const UI_LANGUAGE_KEY = "uiLanguage:v1";

// Default selections
const DEFAULT_SELECTED_KEYS = ["cache"];

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "tr", "es", "de", "fr", "pt", "ru", "ja", "zh"];

const LANGUAGE_OPTION_LABELS = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
  ru: "Русский",
  ja: "日本語",
  zh: "中文"
};

// UI key → underlying API keys mapping
const KEY_EXPANSION = {
  cache: ["cache", "cacheStorage"],
  cookies: ["cookies"],
  siteStorage: ["localStorage", "sessionStorage", "indexedDB"],
  history: ["history", "downloads", "formData"]
};

// Technical keys hidden from UI, included only by Full Reset
const HIDDEN_TECHNICAL_KEYS = ["serviceWorkers", "fileSystems", "webSQL", "appcache"];

// All visible UI keys (checkbox data-key values)
const UI_OPTION_KEYS = ["cache", "cookies", "siteStorage", "history"];

// Cleaning presets (use UI keys)
const presets = {
  cacheCookies: ["cache", "cookies"],
  deep: ["cache", "cookies", "siteStorage", "history"]
};

// Expand UI keys to API-level keys
function expandKeys(uiKeys, includeTechnical) {
  const expanded = [];
  for (const key of uiKeys) {
    if (KEY_EXPANSION[key]) {
      expanded.push(...KEY_EXPANSION[key]);
    } else {
      expanded.push(key);
    }
  }
  if (includeTechnical) {
    expanded.push(...HIDDEN_TECHNICAL_KEYS);
  }
  return expanded;
}

// UI constants
const checkboxSelector = ".options input[type='checkbox']";
const DESC_END_PAUSE_SECONDS = 0.7;

// Multi-part TLDs for base domain calculation
const MULTI_PART_TLDS = new Set([
  "com.tr",
  "co.uk",
  "org.uk",
  "gov.uk",
  "co.jp",
  "com.au",
  "com.br",
  "com.mx"
]);
