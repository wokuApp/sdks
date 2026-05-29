import type { TriggerConfig } from './types';

type FireCallback = () => void;

/**
 * Registers all configured triggers.
 * Calls `fire` at most once (first trigger wins), then cleans up.
 */
export function registerTriggers(
  triggers: TriggerConfig[],
  fire: FireCallback,
): () => void {
  let fired = false;
  const cleanups: Array<() => void> = [];

  const safeFireWith = (behavior: TriggerConfig['behavior']) => {
    if (fired) return;
    fired = true;
    cleanups.forEach((fn) => fn());
    fire();
    // expose behavior for the iframe/overlay logic
    (window as unknown as Record<string, unknown>).__wokuBehavior = behavior;
  };

  for (const trigger of triggers) {
    const cleanup = registerOne(trigger, () => safeFireWith(trigger.behavior));
    if (cleanup) cleanups.push(cleanup);
  }

  return () => cleanups.forEach((fn) => fn());
}

function registerOne(trigger: TriggerConfig, fire: FireCallback): (() => void) | null {
  switch (trigger.type) {
    case 'time': {
      const seconds = typeof trigger.value === 'number' ? trigger.value : 5;
      const id = setTimeout(fire, seconds * 1000);
      return () => clearTimeout(id);
    }

    case 'scroll': {
      const threshold = typeof trigger.value === 'number' ? trigger.value : 50;
      const handler = () => {
        const scrollPct =
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPct >= threshold) fire();
      };
      // Throttle scroll events
      let ticking = false;
      const throttled = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            handler();
            ticking = false;
          });
        }
      };
      window.addEventListener('scroll', throttled, { passive: true });
      return () => window.removeEventListener('scroll', throttled);
    }

    case 'exit-intent': {
      const handler = (e: MouseEvent) => {
        // Only fire when cursor leaves through the top of the viewport
        if (e.clientY < 10) fire();
      };
      document.addEventListener('mouseleave', handler);
      return () => document.removeEventListener('mouseleave', handler);
    }

    case 'custom-event': {
      const eventName = typeof trigger.value === 'string' ? trigger.value : 'woku:trigger';
      const handler = () => fire();
      window.addEventListener(eventName, handler);
      return () => window.removeEventListener(eventName, handler);
    }

    case 'click-selector': {
      const selector = typeof trigger.value === 'string' ? trigger.value : '';
      if (!selector) return null;
      const el = document.querySelector(selector);
      if (!el) return null;
      el.addEventListener('click', fire);
      return () => el.removeEventListener('click', fire);
    }

    default:
      return null;
  }
}
