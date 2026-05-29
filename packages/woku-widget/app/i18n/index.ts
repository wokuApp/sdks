/**
 * Lightweight i18n for the widget micro-app.
 *
 * No heavy library — just typed JSON files and a simple resolver.
 * Architecture: to add a new locale, create a JSON file and add it
 * to the `locales` map below. No component changes needed.
 */

import en from './en.json';
import es from './es.json';

export type Locale = 'en' | 'es';

type Messages = typeof en;

const locales: Record<Locale, Messages> = { en, es };

const SUPPORTED: Locale[] = ['en', 'es'];
const DEFAULT_LOCALE: Locale = 'es';

/**
 * Resolve the active locale from priority order:
 * 1. Config `lang` param (URL or postMessage)
 * 2. navigator.language
 * 3. Fallback: 'es'
 */
export function resolveLocale(configLang: string | undefined): Locale {
  if (configLang) {
    const base = configLang.split('-')[0].toLowerCase() as Locale;
    if (SUPPORTED.includes(base)) return base;
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (nav) {
    const base = nav.split('-')[0].toLowerCase() as Locale;
    if (SUPPORTED.includes(base)) return base;
  }

  return DEFAULT_LOCALE;
}

/**
 * Get translated messages for the given locale, merged with optional
 * client overrides (deep merge, values only).
 */
export function getMessages(locale: Locale, overrides?: Partial<Messages>): Messages {
  const base = locales[locale] ?? locales[DEFAULT_LOCALE];
  if (!overrides) return base;

  // Shallow merge per top-level namespace
  const baseObj = base as Record<string, Record<string, unknown>>;
  const overridesObj = overrides as Record<string, Record<string, unknown>>;

  const merged: Record<string, Record<string, unknown>> = { ...baseObj };
  for (const [ns, vals] of Object.entries(overridesObj)) {
    merged[ns] = { ...baseObj[ns], ...vals };
  }
  return merged as unknown as Messages;
}

export type { Messages };
