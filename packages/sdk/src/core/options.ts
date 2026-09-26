/** Per-call overrides accepted by every resource method's last argument. */
export interface RequestOptions {
  /** Abort the request after N ms (overrides the client default). */
  timeout?: number;
  /** Retry budget for this call (overrides the client default). */
  maxRetries?: number;
  /**
   * Idempotency key for a POST. Protected writes generate one automatically.
   * Reuse an explicit key only for the same request within the 24h replay window.
   * A key does not add retry support to an unprotected endpoint.
   */
  idempotencyKey?: string;
  /** Caller-owned abort signal; aborting rejects with a connection error. */
  signal?: AbortSignal;
  /** Extra headers merged over the defaults (Authorization cannot be unset). */
  headers?: Record<string, string>;
  /** Extra query params merged over the method's own params. */
  query?: Record<string, unknown>;
}
