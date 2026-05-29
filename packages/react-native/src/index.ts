/**
 * @wokuapp/react-native
 *
 * Capture Woku ratings and NPS (text + audio) from React Native apps,
 * with offline buffering and quarantine-aware delivery.
 *
 * The core is platform-agnostic; wire React Native adapters (storage,
 * http, audio) at init time. See the package README for RN setup.
 */
export { WokuSdk } from './sdk';
export type { WokuSdkConfig } from './sdk';

export { WokuClient } from './client';
export type { WokuClientConfig } from './client';

export { OfflineQueue } from './queue';
export type { OfflineQueueOptions, FlushResult } from './queue';

export { InMemoryStorage, fetchHttpClient, noopLogger } from './adapters';
export type {
  Storage,
  HttpClient,
  HttpRequest,
  HttpResponse,
  Logger,
} from './adapters';

export {
  WokuError,
  WokuConfigError,
  WokuValidationError,
  WokuQuarantineError,
  WokuNetworkError,
} from './errors';

export type {
  CaptureKind,
  AudioAttachment,
  Respondent,
  WokuCaptureInput,
  NpsCaptureInput,
  CaptureSubmission,
  SubmissionResult,
} from './types';
