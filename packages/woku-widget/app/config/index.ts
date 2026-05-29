/**
 * Widget config resolved inside the micro-app.
 *
 * Priority:
 *   1. postMessage `woku:config` (sent by the loader after `woku:ready`)
 *   2. URL search params (initial non-sensitive config embedded in iframe src)
 */

export interface WidgetAppConfig {
  companyId: string;
  publishableKey: string;
  captureType: 'woku' | 'nps';
  wokuId?: string;
  npsToolId?: string;
  apiBaseUrl: string;
  lang?: string;
  branding: boolean;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  };
}

const DEFAULT_API_BASE = 'https://clientapi.woku.app';

/** Parse initial (non-sensitive) config from the iframe src URL params */
export function parseUrlConfig(): Partial<WidgetAppConfig> {
  const params = new URLSearchParams(window.location.search);

  return {
    companyId: params.get('companyId') ?? undefined,
    captureType: (params.get('captureType') as 'woku' | 'nps' | null) ?? undefined,
    wokuId: params.get('wokuId') ?? undefined,
    npsToolId: params.get('npsToolId') ?? undefined,
    lang: params.get('lang') ?? undefined,
    branding: params.get('branding') !== 'false',
    apiBaseUrl: params.get('apiBaseUrl') ?? DEFAULT_API_BASE,
  };
}

/** Merge URL config with the full config received via postMessage */
export function mergeConfig(
  urlConfig: Partial<WidgetAppConfig>,
  pmConfig: Partial<WidgetAppConfig>,
): WidgetAppConfig {
  const merged = { ...urlConfig, ...pmConfig };

  return {
    companyId: merged.companyId ?? '',
    publishableKey: merged.publishableKey ?? '',
    captureType: merged.captureType ?? 'woku',
    wokuId: merged.wokuId,
    npsToolId: merged.npsToolId,
    apiBaseUrl: merged.apiBaseUrl ?? DEFAULT_API_BASE,
    lang: merged.lang,
    branding: merged.branding !== false,
    theme: merged.theme,
  };
}
