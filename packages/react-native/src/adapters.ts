/**
 * Injectable adapters. The SDK core never imports React Native or a
 * concrete HTTP/storage library directly — host apps provide these so
 * the core stays unit-testable and platform-agnostic.
 */

/** Minimal HTTP response the SDK needs. */
export interface HttpResponse {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
  headers: { get: (name: string) => string | null };
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  /**
   * JSON string for text/rating captures, or a `FormData` for audio captures
   * (multipart). For `FormData` the host's `fetch` sets the
   * `multipart/form-data` Content-Type (with boundary) itself.
   */
  body?: string | FormData;
}

/** HTTP transport. Defaults to global `fetch`. */
export interface HttpClient {
  request: (req: HttpRequest) => Promise<HttpResponse>;
}

/**
 * Key/value persistence for the offline queue. React Native apps pass an
 * MMKV or AsyncStorage-backed adapter; tests use the in-memory one.
 */
export interface Storage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface Logger {
  debug: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

/** Default HTTP client backed by the global `fetch`. */
export const fetchHttpClient: HttpClient = {
  async request(req) {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    return {
      status: res.status,
      ok: res.ok,
      json: () => res.json(),
      headers: { get: (name) => res.headers.get(name) },
    };
  },
};

/** In-memory storage. Default for tests and ephemeral usage. */
export class InMemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** No-op logger (default). */
export const noopLogger: Logger = {
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
