# Domain Cleaner

A Chrome extension that clears cache, cookies, and site data for the active tab's domain — not the entire browser.

## Features

- **Per-domain cleaning** — targets only the domain you're viewing
- **4 cleanup categories** — Cache, Cookies, History, Site Storage
- **Quick presets** — Cache & Cookies (everyday) and Deep Clean (full reset with confirmation)
- **Keyboard shortcuts** — Alt+Shift+C, Alt+Shift+D, Alt+Shift+H, Alt+Shift+I (customizable)
- **Right-click context menu** — quick access to all actions
- **Live preview** — see cookie count and storage usage before cleaning
- **Result badges** — per-category count of removed items after cleanup
- **HSTS clearing** — opens chrome://net-internals with domain auto-copied to clipboard
- **Open in Incognito** — opens the current page in a new incognito window matching your window size
- **9 languages** — English, Türkçe, Español, Deutsch, Français, Português, Русский, 日本語, 中文
- **Privacy first** — no data collection, no analytics, no external connections

## Installation

### From Chrome Web Store
*(Review pending)*

### Manual (Developer Mode)
1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Alt+Shift+C | Cache & Cookies clean |
| Alt+Shift+D | Deep Clean |
| Alt+Shift+H | Clear Domain History |
| Alt+Shift+I | Open in Incognito |

Customize at `chrome://extensions/shortcuts`.

## Permissions

| Permission | Reason |
|---|---|
| tabs | Read active tab URL to identify the domain |
| storage | Save user preferences locally |
| browsingData | Clear cache and site data via Chrome API |
| cookies | List and remove cookies for the domain |
| scripting | Clear sessionStorage and measure storage usage |
| clipboardWrite | Copy domain name for HSTS clearing |
| contextMenus | Add right-click menu actions |
| notifications | Show confirmation after shortcut actions |
| history | Clear browsing history for the domain |
| host_permissions | Required to access cookies and storage on any domain |

## Privacy

Domain Cleaner does not collect, transmit, or store any personal data. Everything runs locally in your browser. See [Privacy Policy](PRIVACY_POLICY.md).

## License

MIT
