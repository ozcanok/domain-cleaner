/**
 * Domain Cleaner - Utility Functions
 * Shared utility functions used across popup and background scripts
 */

/**
 * String interpolation helper
 * Replaces {key} placeholders with values from vars object
 */
function interpolate(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

/**
 * Normalize language code to supported format
 * Extracts base language code (e.g., "en-US" -> "en")
 */
function normalizeLanguageCode(value) {
  const base = String(value || "").toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : "en";
}

/**
 * Parse and validate tab URL
 * Throws error if URL is not http/https
 */
function parseTabUrl(url) {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Works only on http/https pages.");
  }

  return {
    origin: parsed.origin,
    hostname: parsed.hostname
  };
}

/**
 * Get base domain from hostname
 * Handles multi-part TLDs (e.g., co.uk, com.tr)
 */
function getBaseDomain(hostname) {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  const parts = hostname.split(".").filter(Boolean);

  if (parts.length <= 2) {
    return hostname;
  }

  const tail = parts.slice(-2).join(".");

  if (MULTI_PART_TLDS.has(tail) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

/**
 * Get candidate domains for cookie matching
 * Returns all possible domain variations for cookie lookup
 */
function getCookieCandidateDomains(hostname) {
  const domainParts = hostname.split(".");
  const domains = new Set();

  for (let i = 0; i < domainParts.length - 1; i += 1) {
    domains.add(domainParts.slice(i).join("."));
  }

  domains.add(hostname);
  return domains;
}

/**
 * Format bytes to megabytes
 * Returns rounded MB value
 */
function formatMegabytes(bytes) {
  return Math.max(0, Math.round(bytes / (1024 * 1024)));
}
