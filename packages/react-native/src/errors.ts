/** Base error for all SDK failures. */
export class WokuError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'WokuError';
  }
}

/** Thrown when the SDK is misconfigured (missing companyId, etc.). */
export class WokuConfigError extends WokuError {
  constructor(message: string) {
    super(message, 'config_error');
    this.name = 'WokuConfigError';
  }
}

/** Validation failure on a capture input (bad rating/score, etc.). */
export class WokuValidationError extends WokuError {
  constructor(message: string) {
    super(message, 'validation_error');
    this.name = 'WokuValidationError';
  }
}

/**
 * The backend rejected the submission because the respondent is in
 * quarantine (HTTP 429 with a QUARANTINE_BLOCKED code). Carries the
 * retry-after hint in seconds when the server provides one.
 */
export class WokuQuarantineError extends WokuError {
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message, 'quarantine_blocked');
    this.name = 'WokuQuarantineError';
  }
}

/** Network/transport failure; the submission should be retried later. */
export class WokuNetworkError extends WokuError {
  constructor(message: string) {
    super(message, 'network_error');
    this.name = 'WokuNetworkError';
  }
}
