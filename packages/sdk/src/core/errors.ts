/**
 * Error hierarchy for the Woku SDK. Every failure is a {@link WokuError};
 * transport failures are {@link WokuConnectionError} and HTTP error responses
 * are {@link WokuAPIError} subclasses keyed by status. API errors carry the
 * server `requestId` (echo it when reporting an issue) and the parsed body.
 */

/** Parsed error body shape the API returns (NestJS exception filter). */
export interface WokuErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  [key: string]: unknown;
}

/** Base class for every SDK error. */
export class WokuError extends Error {
  /** Stable, machine-readable code (e.g. `not_found`, `rate_limited`). */
  readonly code?: string;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = 'WokuError';
    this.code = options?.code;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * The request never got a usable HTTP response: DNS/TCP failure, TLS error,
 * timeout or an aborted signal. Safe to retry (the SDK already retries these
 * up to `maxRetries`).
 */
export class WokuConnectionError extends WokuError {
  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message, {
      code: options?.code ?? 'connection_error',
      cause: options?.cause,
    });
    this.name = 'WokuConnectionError';
  }
}

/** The request was aborted (per-call `signal` or the configured timeout). */
export class WokuTimeoutError extends WokuConnectionError {
  constructor(message = 'Request timed out') {
    super(message, { code: 'timeout' });
    this.name = 'WokuTimeoutError';
  }
}

/** The server returned a non-2xx HTTP status. */
export class WokuAPIError extends WokuError {
  /** HTTP status code. */
  readonly status: number;
  /** Server correlation id, if the response carried one. */
  readonly requestId?: string;
  /** Parsed response body (or the raw text when it was not JSON). */
  readonly body: WokuErrorBody | string | undefined;

  constructor(
    status: number,
    body: WokuErrorBody | string | undefined,
    message: string,
    requestId?: string,
    code?: string,
  ) {
    super(message, { code: code ?? codeForStatus(status) });
    this.name = 'WokuAPIError';
    this.status = status;
    this.body = body;
    this.requestId = requestId;
  }

  /** Build the most specific error subclass for a status + body. */
  static from(
    status: number,
    body: WokuErrorBody | string | undefined,
    requestId?: string,
  ): WokuAPIError {
    const message = messageFrom(status, body, requestId);
    switch (true) {
      case status === 400:
        return new BadRequestError(status, body, message, requestId);
      case status === 401:
        return new AuthenticationError(status, body, message, requestId);
      case status === 403:
        return new PermissionDeniedError(status, body, message, requestId);
      case status === 404:
        return new NotFoundError(status, body, message, requestId);
      case status === 409:
        return new ConflictError(status, body, message, requestId);
      case status === 422:
        return new UnprocessableEntityError(status, body, message, requestId);
      case status === 429:
        return new RateLimitError(status, body, message, requestId);
      case status >= 500:
        return new InternalServerError(status, body, message, requestId);
      default:
        return new WokuAPIError(status, body, message, requestId);
    }
  }
}

/** 400 — malformed request or failed validation. */
export class BadRequestError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'BadRequestError';
  }
}

/** 401 — missing or invalid API key. */
export class AuthenticationError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'AuthenticationError';
  }
}

/** 403 — the key is valid but not allowed to access the resource. */
export class PermissionDeniedError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'PermissionDeniedError';
  }
}

/** 404 — the resource does not exist (or is not visible to this company). */
export class NotFoundError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'NotFoundError';
  }
}

/** 409 — the request conflicts with the resource state. */
export class ConflictError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'ConflictError';
  }
}

/** 422 — semantically invalid request. */
export class UnprocessableEntityError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'UnprocessableEntityError';
  }
}

/** 429 — rate limited. `retryAfterSeconds` mirrors the `Retry-After` header. */
export class RateLimitError extends WokuAPIError {
  readonly retryAfterSeconds?: number;

  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'RateLimitError';
    const body = this.body;
    if (
      body &&
      typeof body === 'object' &&
      typeof body.retryAfter === 'number'
    ) {
      this.retryAfterSeconds = body.retryAfter;
    }
  }
}

/** 5xx — the server failed to process the request. */
export class InternalServerError extends WokuAPIError {
  constructor(...args: ConstructorParameters<typeof WokuAPIError>) {
    super(...args);
    this.name = 'InternalServerError';
  }
}

const codeForStatus = (status: number): string => {
  const map: Record<number, string> = {
    400: 'bad_request',
    401: 'authentication_error',
    403: 'permission_denied',
    404: 'not_found',
    409: 'conflict',
    422: 'unprocessable_entity',
    429: 'rate_limited',
  };
  return map[status] ?? (status >= 500 ? 'internal_server_error' : 'api_error');
};

const messageFrom = (
  status: number,
  body: WokuErrorBody | string | undefined,
  requestId?: string,
): string => {
  let detail = `HTTP ${status}`;
  if (typeof body === 'string' && body.trim()) {
    detail = body.trim();
  } else if (body && typeof body === 'object') {
    const { message } = body;
    if (Array.isArray(message)) detail = message.join(', ');
    else if (typeof message === 'string' && message) detail = message;
    else if (typeof body.error === 'string') detail = body.error;
  }
  return requestId
    ? `${status} ${detail} (request_id: ${requestId})`
    : `${status} ${detail}`;
};
