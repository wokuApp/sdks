import type { UrlRule } from './types';

/**
 * Evaluates URL rules against the current page URL.
 * Returns true if the current URL passes all rules (widget should show).
 */
export function passesUrlRules(rules: UrlRule | undefined): boolean {
  if (!rules) return true;

  const url = window.location.href;

  if (rules.include && rules.include.length > 0) {
    const matches = rules.include.some((pattern) => new RegExp(pattern).test(url));
    if (!matches) return false;
  }

  if (rules.exclude && rules.exclude.length > 0) {
    const excluded = rules.exclude.some((pattern) => new RegExp(pattern).test(url));
    if (excluded) return false;
  }

  return true;
}
