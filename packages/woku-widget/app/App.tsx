/**
 * App — main orchestrator inside the iframe.
 * Routes between Qualifier → Feedback → Thank based on context step.
 * Handles postMessage lifecycle: ready → config → resize.
 */
import { useEffect, useRef, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Qualifier } from './components/Qualifier/Qualifier';
import { Feedback } from './components/Feedback/Feedback';
import { Thank } from './components/Thank/Thank';
import { PoweredByWoku } from './components/ui/PoweredByWoku';
import { WidgetProvider, useWidgetContext } from './contexts/WidgetContext';
import { sendToHost, onHostMessage, notifyResize } from './bridge';
import { parseUrlConfig, mergeConfig, type WidgetAppConfig } from './config';
import { resolveLocale, getMessages } from './i18n';

// ---------------------------------------------------------------------------
// Root wrapper — handles config negotiation before rendering the app
// ---------------------------------------------------------------------------

export default function Root() {
  const [config, setConfig] = useState<WidgetAppConfig | null>(null);
  const urlConfig = useRef(parseUrlConfig());

  useEffect(() => {
    let configured = false;

    const cleanup = onHostMessage((msg) => {
      if (msg.type === 'woku:config') {
        configured = true;
        clearTimeout(fallback);
        const full = mergeConfig(
          urlConfig.current,
          msg.payload as Partial<WidgetAppConfig>,
        );
        setConfig(full);
      }

      if (msg.type === 'woku:destroy') {
        // The loader is destroying us — nothing to do, the iframe will be removed.
      }
    });

    // If no postMessage arrives within 1s (e.g. DEV mode), use URL params only
    const fallback = setTimeout(() => {
      if (!configured) {
        const partial = urlConfig.current;
        if (partial.companyId && partial.captureType) {
          setConfig(mergeConfig(partial, {}));
        }
      }
    }, 1000);

    // Install the receiver before announcing readiness.
    sendToHost('woku:ready');
    return () => {
      cleanup();
      clearTimeout(fallback);
    };
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  const locale = resolveLocale(config.lang);
  const messages = getMessages(locale);

  return (
    <WidgetProvider
      key={JSON.stringify([
        config.companyId,
        config.apiBaseUrl,
        config.publishableKey,
        config.captureType,
        config.wokuId,
        config.npsToolId,
        config.cesToolId,
        config.csatToolId,
        config.dispatchToken,
        config.collectionKind,
        config.flowId,
        config.email,
        config.phone,
      ])}
      config={config}
    >
      <AppShell messages={messages} />
    </WidgetProvider>
  );
}

// ---------------------------------------------------------------------------
// AppShell — the visible widget UI with resize reporting
// ---------------------------------------------------------------------------

function AppShell({ messages }: { messages: ReturnType<typeof getMessages> }) {
  const { step, config } = useWidgetContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Report resize to the loader whenever the content changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const { offsetWidth, offsetHeight } = el;
      notifyResize(offsetWidth, offsetHeight);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleOpen = () => {
    setOpen(true);
    sendToHost('woku:open');
  };

  const handleClose = () => {
    setOpen(false);
    sendToHost('woku:close');
  };

  // Escape closes an open panel, as any dialog should.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // The widget starts as a collapsed side-tab; opening shows the panel.
  // In modal/fullscreen mode the overlay is already open from the loader,
  // so we start open automatically.
  const isModal =
    config.behavior === 'modal' || config.behavior === 'fullscreen';

  useEffect(() => {
    if (!isModal && !config.startOpen) return;
    setOpen(true);
    // The host hears "open" whether a person or the configuration opened it.
    sendToHost('woku:open');
  }, [isModal, config.startOpen]);

  return (
    // w-max: the container measures its content (the open panel), not the
    // iframe it sits in. A side-tab starts 60px wide, and reporting the
    // iframe's own width kept the open panel squeezed into those 60px.
    <div ref={containerRef} className="font-sans text-neutral-900 w-max">
      {open ? (
        // Widget panel
        <div className="relative bg-white border border-neutral-200 rounded-xl shadow-xl w-72 flex flex-col gap-3 px-4 pb-4 pt-9">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            // Inside the panel: the iframe clips anything drawn outside it.
            className="absolute top-2 right-2 rounded-full w-7 h-7 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={messages.aria.closeWidget}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Stage router */}
          {step === 'qualifier' && <Qualifier messages={messages} />}
          {step === 'feedback' && <Feedback messages={messages} />}
          {step === 'thank' && <Thank messages={messages} />}

          {/* Branding */}
          {config.branding && (
            <PoweredByWoku
              label={messages.branding.poweredBy}
              campaign={config.captureType}
              className="mt-auto"
            />
          )}
        </div>
      ) : (
        // Collapsed trigger tab
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-900 text-white rounded-l-xl py-3 px-3 cursor-pointer transition-colors shadow-lg"
          aria-label={messages.aria.openFeedback}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-semibold">Feedback</span>
        </button>
      )}
    </div>
  );
}
