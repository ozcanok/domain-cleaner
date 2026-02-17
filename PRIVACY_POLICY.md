# Privacy Policy — Domain Cleaner

**Last Updated:** February 17, 2026

## Overview

Domain Cleaner is a browser extension that clears cache, cookies, and site data for specific domains. This privacy policy explains how the extension handles user data.

## Data Collection

**Domain Cleaner does not collect, transmit, or store any personal data.**

The extension operates entirely within your browser. No data is sent to any external server, third-party service, or analytics platform.

## Data Storage

The extension uses Chrome's local storage API (`chrome.storage.local`) to save the following user preferences:

- **Selected cleaning options** — which data types you have chosen to clean (e.g., cache, cookies)
- **Language preference** — your chosen UI language

The extension uses Chrome's session storage API (`chrome.storage.session`) to temporarily save:

- **Last cleanup result** — status message and per-option counts for the current browser session

All of this data is stored locally on your device and is never transmitted anywhere.

## Permissions

The extension requests the following browser permissions:

| Permission | Purpose |
|---|---|
| `tabs` | Access the active tab's URL to determine which domain to clean |
| `storage` | Save your preferences and settings locally |
| `browsingData` | Clear cache, history, and other browsing data for specific domains |
| `cookies` | Read and remove cookies for the targeted domain |
| `scripting` | Clear sessionStorage and measure storage usage on active tabs |
| `clipboardWrite` | Copy domain name to clipboard for HSTS clearing |
| `contextMenus` | Add right-click menu options for quick cleaning actions |
| `notifications` | Show brief notifications after keyboard shortcut actions |
| `history` | Search and delete browsing history entries for the targeted domain only |
| `<all_urls>` | Required to access and clean data on any website you visit |

## Third-Party Services

Domain Cleaner does not integrate with, connect to, or send data to any third-party service or API.

## Data Sharing

No data is shared with anyone. The extension has no server component, no analytics, and no telemetry.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in the extension's listing and this document. The "Last Updated" date at the top will be revised accordingly.

## Contact

If you have questions about this privacy policy, please open an issue on the extension's support page or contact the developer through the Chrome Web Store listing.
