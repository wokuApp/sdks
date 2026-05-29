# @wokuapp/woku-widget

Ambivalent web widget for capturing **Woku ratings (1-5 stars)** and **NPS scores (0-10)**.

Distributed as a micro-app hosted on `cdn.woku.app` (S3 + CloudFront) and embedded in any
website via a lightweight loader `<script>` (~2.5 KB gzipped) that injects an `<iframe>`.

## Quick start

```html
<!-- 1. Load the loader (the only script your page needs) -->
<script src="https://cdn.woku.app/sdks/woku-widget/v1/loader.js"></script>

<!-- 2. Initialize the widget -->
<script>
  WokuWidget.init({
    companyId: 'YOUR_COMPANY_ID',
    publishableKey: 'pk_live_...',
    captureType: 'nps',          // 'nps' | 'woku'
    // wokuId: 'WOKU_ID',        // required when captureType === 'woku'
    // npsToolId: 'NPS_TOOL_ID', // optional for NPS (omit for company-level NPS)
    // lang: 'es',               // 'es' | 'en'; auto-detected from browser if omitted
    triggers: [
      { type: 'time', value: 5, behavior: 'modal' },
    ],
  });
</script>
```

The loader injects the `<iframe>` when a trigger fires. No CSS needs to be loaded on the host
page — all styles live inside the iframe (zero risk of clashing with host styles).

## captureType

| Value | Rating UI | API endpoint |
|-------|-----------|--------------|
| `'woku'` | 5-star rating (1-5) | `POST /v1/wokus/:wokuId/textnotes` \| `/voicemails` |
| `'nps'` | NPS scale (0-10) | `POST /v1/nps` → `POST /v1/nps/:npsId/textnotes` \| `/voicemails` |

## WokuWidgetConfig

```typescript
interface WokuWidgetConfig {
  companyId: string;
  publishableKey: string;           // pk_... safe to embed in the page
  captureType: 'woku' | 'nps';

  wokuId?: string;                  // required when captureType === 'woku'
  npsToolId?: string;               // optional for NPS — omit for company-level
  apiBaseUrl?: string;              // default: https://clientapi.woku.app
  widgetBaseUrl?: string;           // default: https://cdn.woku.app/sdks/woku-widget/v1
  lang?: string;                    // 'es' | 'en'; auto-detect if omitted
  branding?: boolean;               // show "Powered by Woku"; default: true

  triggers: TriggerConfig[];
  theme?: ThemeConfig;
  urlRules?: UrlRule;
}

interface TriggerConfig {
  type: 'time' | 'scroll' | 'exit-intent' | 'custom-event' | 'click-selector';
  value?: number | string;          // seconds, scroll%, event name, or CSS selector
  behavior: 'modal' | 'banner' | 'side-tab' | 'fullscreen';
}
```

## Programmatic API

```javascript
WokuWidget.show();           // show the widget manually
WokuWidget.hide();           // hide the widget
WokuWidget.destroy();        // remove the iframe + clean up all listeners

WokuWidget.on('open',   () => { /* widget opened */ });
WokuWidget.on('close',  () => { /* widget closed */ });
WokuWidget.on('submit', (data) => { console.log('submitted:', data); });
WokuWidget.on('skip',   () => { /* user skipped feedback */ });
```

## CSP requirements

The host page must allow:

```
Content-Security-Policy:
  script-src cdn.woku.app;        /* for the loader script */
  frame-src  cdn.woku.app;        /* for the micro-app iframe */
```

The loader does not use `eval` or inline scripts.

## i18n

Two locales are included: **ES** (default) and **EN**. Language is resolved in order:

1. `lang` config param (e.g. `lang: 'en'`)
2. `navigator.language` (auto-detect from browser)
3. Fallback: `'es'`

To add a new locale: create `app/i18n/<locale>.json` following the structure of `es.json`,
then register it in `app/i18n/index.ts`.

## Build

```bash
# Install deps (from monorepo root)
pnpm install

# Build both targets
pnpm --filter woku-widget build

# Run tests
pnpm --filter woku-widget test:run
```

Build outputs:

| File | Description |
|------|-------------|
| `dist/loader/loader.js` | Loader IIFE (~2.5 KB gzipped) — `<script src="...">` |
| `dist/app/index.html` | Micro-app entry — loaded inside the iframe |
| `dist/app/assets/*` | Hashed JS/CSS bundles for the micro-app |

## CDN paths (S3 + CloudFront)

```
cdn.woku.app/sdks/woku-widget/v1/loader.js          ← major-alias (cache 5 min)
cdn.woku.app/sdks/woku-widget/v1/index.html         ← major-alias (cache 5 min)
cdn.woku.app/sdks/woku-widget/v0.1.0/loader.js      ← semver-pinned (cache immutable)
cdn.woku.app/sdks/woku-widget/v0.1.0/index.html
cdn.woku.app/sdks/woku-widget/v0.1.0/assets/*
```

CDN publish is handled by `scripts/release-widget.sh` (infra task — not part of this package).

## Architecture

```
Host page
  └── <script src=".../loader.js"> (2.5 KB gz)
        ├── WokuWidget.init(config)
        ├── URL-rules check
        ├── quarantine check → GET /v1/quarantines/check
        ├── trigger registration (time/scroll/exit-intent/event/selector)
        └── on fire → injects <iframe src=".../index.html?...">
                          postMessage: woku:ready / woku:config
                          postMessage: woku:resize (auto-resize)
                          postMessage: woku:submit (payload to on('submit'))
                          postMessage: woku:close
```

The micro-app inside the iframe runs React 19 + Base UI + Tailwind v4 + lucide-react.
Host styles do not affect it; host JS does not share the same global scope.
