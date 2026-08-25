import {
  WokuAPIError,
  WokuConnectionError,
  WokuError,
  WokuTimeoutError,
  type WokuErrorBody,
} from './errors';
import { Page, isPageResponse, type PageResponse } from './pagination';
import type { RequestOptions } from './options';

/** Minimal subset of the Fetch API the client depends on. */
export type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export interface WokuClientOptions {
  /** Company secret key. Defaults to `process.env.WOKU_API_KEY`. */
  apiKey?: string;
  /** API base URL. Defaults to `https://clientapi.woku.app`. */
  baseURL?: string;
  /** Per-request timeout in ms. Default 60000. */
  timeout?: number;
  /** Automatic retries for transient failures. Default 2. */
  maxRetries?: number;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /**
   * Allow running in a browser. Off by default: the secret key grants full
   * management access and must never ship to a browser bundle.
   */
  dangerouslyAllowBrowser?: boolean;
}

interface RequestArgs extends RequestOptions {
  body?: unknown;
  /**
   * Mark a POST as an idempotent create: an idempotency key is auto-generated
   * (unless the caller passed one) so a retry after a transient failure returns
   * the original result instead of creating twice. Left off for action POSTs
   * (send/approve/test) so they are never silently replayed.
   */
  idempotent?: boolean;
}

const DEFAULT_BASE_URL = 'https://clientapi.woku.app';
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;
const RETRY_CAP_MS = 8_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const SDK_VERSION = '0.1.0';

const randomId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `idmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transport core: turns a resource call into an authenticated HTTP request
 * with timeout, typed error mapping and jittered retries. Resource namespaces
 * call {@link request} and {@link getPage}; end users use the `Woku` facade.
 */
export class WokuClient {
  readonly baseURL: string;
  readonly maxRetries: number;
  readonly timeout: number;

  private readonly apiKey: string;
  private readonly fetch: FetchLike;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: WokuClientOptions = {}) {
    const apiKey =
      options.apiKey ??
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env?.WOKU_API_KEY;
    if (!apiKey) {
      throw new WokuError(
        'Missing API key: pass { apiKey } or set WOKU_API_KEY.',
        { code: 'config_error' },
      );
    }
    if (!options.dangerouslyAllowBrowser && isBrowser()) {
      throw new WokuError(
        'The Woku SDK is server-only: the secret key must not run in a browser. ' +
          'Pass { dangerouslyAllowBrowser: true } only if you fully control the runtime.',
        { code: 'config_error' },
      );
    }
    const fetchImpl =
      options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!fetchImpl) {
      throw new WokuError(
        'No fetch implementation available; pass { fetch }.',
        {
          code: 'config_error',
        },
      );
    }

    this.apiKey = apiKey;
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetch = fetchImpl;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  /** Issue one request and return the parsed JSON body typed as `T`. */
  async request<T>(
    method: string,
    path: string,
    args: RequestArgs = {},
  ): Promise<T> {
    const url = this.buildUrl(path, args.query);
    const idempotencyKey =
      args.idempotencyKey ??
      (args.idempotent && method.toUpperCase() === 'POST'
        ? randomId()
        : undefined);
    const headers = this.buildHeaders(method, { ...args, idempotencyKey });
    const bodyText =
      args.body === undefined ? undefined : JSON.stringify(args.body);
    const maxRetries = args.maxRetries ?? this.maxRetries;
    const timeout = args.timeout ?? this.timeout;
    // Retries are only safe on GET or when the write carries an idempotency key.
    const retryable =
      method.toUpperCase() === 'GET' ||
      Boolean(headers['X-Woku-Idempotency-Key']);

    let attempt = 0;
    for (;;) {
      try {
        const { status, body, requestId } = await this.send(
          url,
          method,
          headers,
          bodyText,
          timeout,
          args.signal,
        );
        if (status >= 200 && status < 300) {
          return body as T;
        }
        const apiError = WokuAPIError.from(status, body, requestId);
        if (retryable && attempt < maxRetries && RETRYABLE_STATUS.has(status)) {
          await sleep(this.backoff(attempt, apiError));
          attempt += 1;
          continue;
        }
        throw apiError;
      } catch (error) {
        if (error instanceof WokuAPIError) throw error;
        const connError = toConnectionError(error);
        if (retryable && attempt < maxRetries) {
          await sleep(this.backoff(attempt));
          attempt += 1;
          continue;
        }
        throw connError;
      }
    }
  }

  /**
   * Issue a GET that returns a paginated envelope and wrap it as a {@link Page}.
   * `params` accepts any plain object (a resource's typed params interface).
   */
  async getPage<T>(
    path: string,
    params?: object,
    opts?: RequestOptions,
  ): Promise<Page<T>> {
    const base = (params ?? {}) as Record<string, unknown>;
    const query: Record<string, unknown> = { ...base, ...opts?.query };
    const response = await this.request<PageResponse<T> | T[]>('get', path, {
      ...opts,
      query,
    });
    const envelope: PageResponse<T> = isPageResponse(response)
      ? (response as PageResponse<T>)
      : {
          data: (response as T[]) ?? [],
          total: Array.isArray(response) ? response.length : 0,
          page: 1,
          limit: Array.isArray(response) ? response.length : 0,
        };
    return new Page<T>(
      envelope,
      (page, pageOpts) =>
        this.getPage<T>(path, { ...base, page }, { ...opts, ...pageOpts }),
      opts,
    );
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) return url;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) search.append(key, String(item));
      } else {
        search.append(key, String(value));
      }
    }
    const qs = search.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private buildHeaders(
    method: string,
    args: RequestArgs,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': `woku-sdk-js/${SDK_VERSION}`,
      ...this.defaultHeaders,
      ...args.headers,
    };
    if (args.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (args.idempotencyKey !== undefined && method.toUpperCase() === 'POST') {
      headers['X-Woku-Idempotency-Key'] = args.idempotencyKey;
    }
    return headers;
  }

  private async send(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    timeout: number,
    signal?: AbortSignal,
  ): Promise<{
    status: number;
    body: WokuErrorBody | string | undefined;
    requestId?: string;
  }> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const onExternalAbort = (): void => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await this.fetch(url, {
        method: method.toUpperCase(),
        headers,
        body,
        signal: controller.signal,
      });
      const text = await response.text();
      return {
        status: response.status,
        body: parseBody(text),
        requestId: requestIdFrom(response.headers),
      };
    } catch (error) {
      if (timedOut) throw new WokuTimeoutError();
      if (signal?.aborted) {
        throw new WokuConnectionError('Request aborted', { code: 'aborted' });
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  }

  private backoff(attempt: number, apiError?: WokuAPIError): number {
    // Honor Retry-After (seconds) when the server sends it, else full jitter.
    const retryAfter =
      apiError &&
      apiError.body &&
      typeof apiError.body === 'object' &&
      typeof apiError.body.retryAfter === 'number'
        ? apiError.body.retryAfter * 1000
        : undefined;
    if (retryAfter !== undefined) return Math.min(retryAfter, RETRY_CAP_MS);
    const ceiling = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** attempt);
    return Math.random() * ceiling;
  }
}

const isBrowser = (): boolean =>
  typeof (globalThis as { document?: unknown }).document !== 'undefined';

const parseBody = (text: string): WokuErrorBody | string | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as WokuErrorBody;
  } catch {
    return text;
  }
};

const requestIdFrom = (headers: {
  get(name: string): string | null;
}): string | undefined =>
  headers.get('x-request-id') ??
  headers.get('request-id') ??
  headers.get('x-woku-request-id') ??
  undefined;

const toConnectionError = (error: unknown): WokuConnectionError => {
  if (error instanceof WokuConnectionError) return error;
  const message =
    error instanceof Error ? error.message : 'Network request failed';
  return new WokuConnectionError(message, { cause: error });
};
