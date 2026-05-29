/**
 * WokuWidget loader — public API.
 *
 * This file is the IIFE entry point compiled by vite.loader.config.ts.
 * Target size: ≤ ~5 KB gzipped. No React, no framework — pure vanilla TS.
 *
 * Usage in the host page:
 *   <script src="https://cdn.woku.app/woku-widget/v1/loader.js"></script>
 *   <script>
 *     WokuWidget.init({
 *       companyId: 'COMPANY_ID',
 *       publishableKey: 'pk_...',
 *       captureType: 'nps',
 *       triggers: [{ type: 'time', value: 5, behavior: 'modal' }],
 *     });
 *   </script>
 */

import { passesUrlRules } from './url-rules';
import { isInQuarantine } from './quarantine';
import { registerTriggers } from './triggers';
import { createIframeManager } from './iframe';
import type {
  EventCallback,
  PostMessageFromApp,
  PostMessageToApp,
  WidgetEventName,
  WokuWidgetConfig,
} from './types';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _config: WokuWidgetConfig | null = null;
let _pendingShow = false;

let _iframeManager: ReturnType<typeof createIframeManager> | null = null;
let _cleanupTriggers: (() => void) | null = null;

const _listeners: Map<WidgetEventName, EventCallback[]> = new Map();

const DEFAULT_API_BASE = 'https://clientapi.woku.app';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function init(config: WokuWidgetConfig): void {
  if (_config) {
    console.warn('[WokuWidget] Already initialized. Call destroy() first to reinitialize.');
    return;
  }

  _config = {
    apiBaseUrl: DEFAULT_API_BASE,
    branding: true,
    ...config,
  };

  // Gate 1: URL rules
  if (!passesUrlRules(_config.urlRules)) return;

  // Gate 2: quarantine (async — fire triggers only if not quarantined)
  const apiBase = _config.apiBaseUrl ?? DEFAULT_API_BASE;

  void isInQuarantine(apiBase, _config.companyId, _config.publishableKey).then(
    (quarantined) => {
      if (quarantined || !_config) return;

      // Register triggers — fire will inject the iframe
      _cleanupTriggers = registerTriggers(_config.triggers, () => {
        void injectAndShow();
      });
    },
  );
}

function show(): void {
  if (!_iframeManager) {
    _pendingShow = true;
    return;
  }
  _iframeManager.show();
  emit('open');
}

function hide(): void {
  _iframeManager?.hide();
  emit('close');
}

function destroy(): void {
  _cleanupTriggers?.();
  _cleanupTriggers = null;
  _iframeManager?.destroy();
  _iframeManager = null;
  _config = null;
  _pendingShow = false;
  _listeners.clear();
}

function on(event: WidgetEventName, cb: EventCallback): void {
  const list = _listeners.get(event) ?? [];
  list.push(cb);
  _listeners.set(event, list);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function injectAndShow(): Promise<void> {
  if (!_config || _iframeManager) return;

  const behavior =
    ((window as unknown as Record<string, unknown>).__wokuBehavior as string | undefined) ?? 'modal';

  _iframeManager = createIframeManager(_config, behavior, handleAppMessage);
  _iframeManager.show();
}

function handleAppMessage(msg: PostMessageFromApp): void {
  if (!_iframeManager || !_config) return;

  switch (msg.type) {
    case 'woku:ready': {
      // Send full config to the micro-app
      const configMsg: PostMessageToApp = {
        type: 'woku:config',
        payload: _config,
      };
      _iframeManager.sendMessage(configMsg);

      if (_pendingShow) {
        _pendingShow = false;
        _iframeManager.show();
        emit('open');
      }
      break;
    }

    case 'woku:open':
      emit('open');
      break;

    case 'woku:close':
      _iframeManager.hide();
      emit('close');
      break;

    case 'woku:submit':
      emit('submit', msg.payload);
      _iframeManager.hide();
      break;

    case 'woku:skip':
      emit('skip');
      _iframeManager.hide();
      break;

    case 'woku:resize':
      // resize is handled inside iframe.ts directly; nothing extra here
      break;
  }
}

function emit(event: WidgetEventName, data?: unknown): void {
  (_listeners.get(event) ?? []).forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error('[WokuWidget] Error in event listener:', e);
    }
  });
}

// ---------------------------------------------------------------------------
// Expose on window
// ---------------------------------------------------------------------------

const WokuWidget = { init, show, hide, destroy, on };

declare global {
  interface Window {
    WokuWidget: typeof WokuWidget;
  }
}

window.WokuWidget = WokuWidget;
