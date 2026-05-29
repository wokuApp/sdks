import type {
  PostMessageFromApp,
  PostMessageToApp,
  ResizePayload,
  WokuWidgetConfig,
} from './types';

interface IframeManager {
  show: () => void;
  hide: () => void;
  destroy: () => void;
  sendMessage: (msg: PostMessageToApp) => void;
}

const CDN_ORIGIN = 'https://cdn.woku.app';

/**
 * Injects the widget iframe into the host page, manages the overlay,
 * and wires up postMessage communication.
 *
 * Returns a handle to show/hide/destroy and send messages to the app.
 */
export function createIframeManager(
  config: WokuWidgetConfig,
  behavior: string,
  onMessage: (msg: PostMessageFromApp) => void,
): IframeManager {
  const widgetBaseUrl = config.widgetBaseUrl ?? `${CDN_ORIGIN}/sdks/woku-widget/v1`;
  const appOrigin = extractOrigin(widgetBaseUrl);
  const zIndex = config.theme?.zIndex ?? 999999;

  // Build the iframe src URL with non-sensitive config as query params
  const params = new URLSearchParams({
    companyId: config.companyId,
    captureType: config.captureType,
    ...(config.lang ? { lang: config.lang } : {}),
    ...(config.captureType === 'woku' && config.wokuId ? { wokuId: config.wokuId } : {}),
    ...(config.captureType === 'nps' && config.npsToolId ? { npsToolId: config.npsToolId } : {}),
    branding: String(config.branding !== false),
  });

  const src = `${widgetBaseUrl}/index.html?${params.toString()}`;

  // Create overlay container (handles modal/fullscreen positioning)
  const overlay = document.createElement('div');
  Object.assign(overlay.style, overlayStyles(behavior, zIndex));
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = src;
  // allow-same-origin is needed so the micro-app can do fetch() calls
  // (cross-origin fetch from the CDN document to clientapi.woku.app).
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
  iframe.setAttribute('title', 'Woku feedback widget');
  iframe.setAttribute('loading', 'lazy');
  Object.assign(iframe.style, iframeStyles(behavior));

  overlay.appendChild(iframe);

  // postMessage handler
  const messageHandler = (event: MessageEvent) => {
    if (event.origin !== appOrigin) return;

    const msg = event.data as PostMessageFromApp;
    if (!msg?.type?.startsWith('woku:')) return;

    if (msg.type === 'woku:resize') {
      const { width, height } = (msg.payload ?? {}) as ResizePayload;
      applyResize(iframe, overlay, behavior, width, height);
    }

    onMessage(msg);
  };

  window.addEventListener('message', messageHandler);

  // Backdrop click closes modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      onMessage({ type: 'woku:close' });
    }
  });

  return {
    show() {
      if (!document.body.contains(overlay)) {
        document.body.appendChild(overlay);
      }
      overlay.style.display = 'flex';
    },
    hide() {
      overlay.style.display = 'none';
    },
    destroy() {
      window.removeEventListener('message', messageHandler);
      overlay.remove();
    },
    sendMessage(msg: PostMessageToApp) {
      iframe.contentWindow?.postMessage(msg, appOrigin);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return CDN_ORIGIN;
  }
}

function overlayStyles(behavior: string, zIndex: number): Partial<CSSStyleDeclaration> {
  const base: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    zIndex: String(zIndex),
    display: 'none', // shown after ready
  };

  if (behavior === 'modal' || behavior === 'fullscreen') {
    return {
      ...base,
      inset: '0',
      backgroundColor: behavior === 'modal' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  if (behavior === 'banner') {
    return {
      ...base,
      bottom: '0',
      left: '0',
      right: '0',
      height: 'auto',
    };
  }

  // side-tab
  return {
    ...base,
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    height: 'auto',
    width: 'auto',
  };
}

function iframeStyles(behavior: string): Partial<CSSStyleDeclaration> {
  if (behavior === 'fullscreen') {
    return {
      width: '100vw',
      height: '100vh',
      border: 'none',
      borderRadius: '0',
      background: 'white',
    };
  }

  if (behavior === 'modal') {
    return {
      width: 'min(340px, 92vw)',
      height: '440px',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      background: 'white',
    };
  }

  if (behavior === 'banner') {
    return {
      width: '100%',
      height: '120px',
      border: 'none',
      borderTop: '1px solid rgba(0,0,0,0.1)',
      background: 'white',
    };
  }

  // side-tab
  return {
    width: '60px',
    height: '220px',
    border: 'none',
    borderRadius: '8px 0 0 8px',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
    background: 'white',
  };
}

function applyResize(
  iframe: HTMLIFrameElement,
  overlay: HTMLDivElement,
  behavior: string,
  width: number,
  height: number,
): void {
  // Only auto-resize for non-fullscreen modes
  if (behavior === 'fullscreen') return;

  if (behavior === 'modal') {
    iframe.style.height = `${Math.min(height, window.innerHeight * 0.9)}px`;
    iframe.style.width = `${Math.min(width || 340, window.innerWidth * 0.92)}px`;
    return;
  }

  if (behavior === 'banner') {
    overlay.style.height = `${height}px`;
    iframe.style.height = `${height}px`;
    return;
  }

  // side-tab
  iframe.style.height = `${height}px`;
  if (width) iframe.style.width = `${width}px`;
}
