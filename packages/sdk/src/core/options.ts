/** Per-call overrides accepted by every resource method's last argument. */
export interface RequestOptions {
  /** Abort the request after N ms (overrides the client default). */
  timeout?: number;
  /** Retry budget for this call (overrides the client default). */
  maxRetries?: number;
  /**
   * Idempotency key for a POST. One is generated automatically for creates;
   * pass your own to make a specific call safe to retry with the same result.
   */
  idempotencyKey?: string;
  /** Caller-owned abort signal; aborting rejects with a connection error. */
  signal?: AbortSignal;
  /** Extra headers merged over the defaults (Authorization cannot be unset). */
  headers?: Record<string, string>;
  /** Extra query params merged over the method's own params. */
  query?: Record<string, unknown>;
}
