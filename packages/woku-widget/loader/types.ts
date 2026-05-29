// ---------------------------------------------------------------------------
// Loader public types — shared between loader files.
// No runtime deps; pure TypeScript interfaces.
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  primaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  /** z-index for the overlay mounted by the loader in the host page */
  zIndex?: number;
}

export interface TriggerConfig {
  type: 'time' | 'scroll' | 'exit-intent' | 'custom-event' | 'click-selector';
  /** Seconds (time), scroll % (scroll), event name, or CSS selector */
  value?: number | string;
  behavior: 'modal' | 'banner' | 'side-tab' | 'fullscreen';
}

export interface UrlRule {
  include?: string[]; // regex strings — at least one must match
  exclude?: string[]; // regex strings — none must match
}

export interface WokuWidgetConfig {
  companyId: string;
  publishableKey: string;
  captureType: 'woku' | 'nps';
  /** Required when captureType === 'woku' */
  wokuId?: string;
  /** Optional for captureType === 'nps'; if omitted, NPS is company-level */
  npsToolId?: string;
  /** Default: https://clientapi.woku.app */
  apiBaseUrl?: string;
  /** Default: https://cdn.woku.app/woku-widget/v1 */
  widgetBaseUrl?: string;
  /** Force locale ('es' | 'en'); if omitted, auto-detect from navigator */
  lang?: string;
  triggers: TriggerConfig[];
  theme?: ThemeConfig;
  urlRules?: UrlRule;
  /** Show "Powered by Woku" branding. Default: true */
  branding?: boolean;
}

export type WidgetEventName = 'open' | 'close' | 'submit' | 'skip';
export type EventCallback = (data?: unknown) => void;

// postMessage message shapes
export interface PostMessageToApp {
  type: 'woku:config' | 'woku:show' | 'woku:hide' | 'woku:destroy';
  payload?: unknown;
}

export interface PostMessageFromApp {
  type: 'woku:ready' | 'woku:resize' | 'woku:open' | 'woku:close' | 'woku:submit' | 'woku:skip';
  payload?: unknown;
}

export interface ResizePayload {
  width: number;
  height: number;
}
