/**
 * @wokuapp/sdk — official server-side SDK for the Woku management API.
 *
 * Authenticate with your company secret key and manage trackers, VoC tools
 * (NPS/CSAT/CES), wokus, forms, flows, action plans, tickets, delivery and
 * captures over the public `/v1` API.
 */
export { Woku } from './woku';
export { WokuClient } from './core/client';
export type { WokuClientOptions, FetchLike } from './core/client';

export { Page } from './core/pagination';
export type { PageResponse } from './core/pagination';
export type { RequestOptions } from './core/options';

export {
  WokuError,
  WokuConnectionError,
  WokuTimeoutError,
  WokuAPIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
} from './core/errors';
export type { WokuErrorBody } from './core/errors';

export * from './models';
export type * from './types';
