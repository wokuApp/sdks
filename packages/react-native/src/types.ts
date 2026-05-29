/**
 * Public types for the Woku React Native SDK.
 *
 * The SDK core is transport- and platform-agnostic: it builds typed
 * capture payloads and hands them to injectable adapters (HTTP, storage,
 * audio). React Native apps wire those adapters at init time.
 */

/** The two capture flows Woku supports. */
export type CaptureKind = 'woku' | 'nps';

/** An audio attachment for a text/voice comment. */
export interface AudioAttachment {
  /** URI or local path to the recorded audio file. */
  uri: string;
  /** MIME type, e.g. `audio/m4a`. */
  mimeType: string;
  /** Duration in milliseconds, if known. */
  durationMs?: number;
}

/** Who is giving the feedback. Anonymous unless an identifier is set. */
export interface Respondent {
  email?: string;
  phone?: string;
  /** Free-form external id the host app controls (e.g. a CRM id). */
  externalId?: string;
}

/** Input for a Woku capture (1-tap rating 1..5 + optional comment/audio). */
export interface WokuCaptureInput {
  wokuId: string;
  /** Integer 1..5. */
  rating: number;
  comment?: string;
  audio?: AudioAttachment;
  respondent?: Respondent;
  /** Arbitrary context tags attached to the submission. */
  metadata?: Record<string, unknown>;
}

/** Input for an NPS capture (score 0..10 + optional review). */
export interface NpsCaptureInput {
  npsId: string;
  /** Integer 0..10. */
  score: number;
  comment?: string;
  audio?: AudioAttachment;
  respondent?: Respondent;
  metadata?: Record<string, unknown>;
}

/** Normalized submission persisted in the offline queue and sent to Woku. */
export interface CaptureSubmission {
  /** Client-generated idempotency id. */
  id: string;
  kind: CaptureKind;
  companyId: string;
  targetId: string;
  rating?: number;
  score?: number;
  comment?: string;
  audio?: AudioAttachment;
  respondent?: Respondent;
  metadata?: Record<string, unknown>;
  /** Unix epoch ms when the capture was created on the device. */
  createdAt: number;
}

/** Result of attempting to deliver a submission. */
export interface SubmissionResult {
  id: string;
  status: 'sent' | 'queued' | 'failed' | 'quarantined';
  /** Server id once accepted. */
  remoteId?: string;
  error?: string;
}
