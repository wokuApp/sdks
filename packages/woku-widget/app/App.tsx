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
    // Signal ready to the loader; it will respond with woku:config
    sendToHost('woku:ready');

    const cleanup = onHostMessage((msg) => {
      if (msg.type === 'woku:config') {
        const full = mergeConfig(urlConfig.current, msg.payload as Partial<WidgetAppConfig>);
        setConfig(full);
      }

      if (msg.type === 'woku:destroy') {
        // The loader is destroying us — nothing to do, the iframe will be removed.
      }
    });

    // If no postMessage arrives within 1s (e.g. DEV mode), use URL params only
    const fallback = setTimeout(() => {
      if (!config) {
        const partial = urlConfig.current;
        if (partial.companyId && partial.captureType) {
          setConfig(mergeConfig(partial, {}));
        }
      }
    }, 1000);

    return () => {
      cleanup();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <WidgetProvider config={config}>
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

  // The widget starts as a collapsed side-tab; opening shows the panel.
  // In modal/fullscreen mode the overlay is already open from the loader,
  // so we start open automatically.
  const isModal =
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).__wokuBehavior === 'modal';

  useEffect(() => {
    if (isModal) setOpen(true);
  }, [isModal]);

  return (
    <div ref={containerRef} className="font-sans text-neutral-900">
      {open ? (
        // Widget panel
        <div className="relative bg-white border border-neutral-200 rounded-xl shadow-xl w-72 min-h-64 flex flex-col gap-3 p-4">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute -top-3 right-2 rounded-full w-7 h-7 bg-neutral-700 text-white flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors"
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
            <div className="text-xs text-neutral-400 flex items-center gap-1 justify-center mt-auto">
              <span>{messages.branding.poweredBy}</span>
              <a
                href="https://woku.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                woku
              </a>
            </div>
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
