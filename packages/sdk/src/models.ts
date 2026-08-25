/**
 * Response models. The `/v1` controllers return curated, projected documents;
 * these mirror those shapes. Where the server returns an opaque document the
 * type is {@link WokuRecord} (a permissive object) rather than a false promise
 * of exhaustive typing.
 */

/** A JSON object the SDK does not exhaustively type. */
export type WokuRecord = Record<string, unknown>;

export type FeedbackType = 'recognition' | 'improvement';
export type Severity = 'high' | 'medium' | 'low';
export type Locale = 'es' | 'en';
export type Channel = 'email' | 'whatsapp';

/** External tracker definition (curated). */
export interface Tracker {
  _id: string;
  name: string;
  system: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Result of a VoC-entity search by tracker filters. */
export interface EntitiesByTrackers {
  entityType: string;
  total: number;
  matches: WokuRecord[];
}

interface ToolLocalizedContent {
  locale: string;
  [key: string]: unknown;
}

/** NPS tool definition (curated, no internal fields). */
export interface NpsTool {
  _id: string;
  name: string;
  npsMessage: string;
  audienceType?: string;
  availableLocales?: string[];
  defaultLocale?: string;
  localizedContent?: ToolLocalizedContent[];
  createdAt?: string;
}

/** CSAT tool definition (curated). */
export interface CsatTool {
  _id: string;
  name: string;
  question: string;
  subject?: string;
  availableLocales?: string[];
  defaultLocale?: string;
  localizedContent?: ToolLocalizedContent[];
  createdAt?: string;
}

/** CES tool definition (curated). */
export interface CesTool {
  _id: string;
  name: string;
  question: string;
  action?: string;
  availableLocales?: string[];
  defaultLocale?: string;
  localizedContent?: ToolLocalizedContent[];
  createdAt?: string;
}

/** Acknowledgement returned by tool deletes. */
export interface DeletedResult {
  deleted: true;
  id: string;
}

/** Per-recipient outcome of a survey send. */
export interface InvitationsResult {
  accepted: number;
  rejected: number;
  rejectedRecipients?: Array<{ recipient?: string; reason?: string }>;
  [key: string]: unknown;
}

/** Support ticket (curated allow-list). */
export interface Ticket {
  _id: string;
  code?: string;
  title: string;
  severity: Severity;
  destinationId?: string;
  origin?: WokuRecord;
  score?: WokuRecord;
  aiSummary?: string;
  aiCategory?: string;
  sentiment?: string;
  client?: WokuRecord;
  customerComment?: WokuRecord;
  timeline?: WokuRecord[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Ticket aggregate counts. */
export interface TicketStats {
  byTool: Record<string, number>;
  byDestination: Array<{
    destinationId: string;
    countInPeriod: number;
    countTotal: number;
    severity: { high: number; medium: number; low: number };
  }>;
}

/** One outbound invitation dispatch (delivery view, no recipient PII). */
export interface Dispatch {
  _id: string;
  channel: Channel;
  source: string | null;
  status: 'invited' | 'partially_responded' | 'responded' | 'failed';
  targets: Array<{
    responseType: string;
    targetId: string;
    respondedAt: string | null;
  }>;
  attempts: Array<{
    channel: Channel;
    attemptIndex: number;
    sentAt: string;
    status: 'sent' | 'delivered' | 'bounced' | 'failed';
  }>;
  createdAt: string;
  updatedAt: string;
}

/** Response-rate metrics over the dispatches. */
export interface DispatchStats {
  total: number;
  delivered: number;
  byStatus: {
    invited: number;
    partially_responded: number;
    responded: number;
    failed: number;
  };
  responseRate: number | null;
}

/**
 * A woku (feedback collection tool), curated. Named `WokuResource` so it does
 * not collide with the `Woku` client class at the package root.
 */
export interface WokuResource {
  _id: string;
  description: string;
  folderId?: string | null;
  closed?: boolean;
  reviewsDisabled?: boolean;
  anonymousDisabled?: boolean;
  onlyOneReviewPerClient?: boolean;
  availableLocales?: string[];
  defaultLocale?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Sanitized ticket-destination connectivity test result. */
export interface TestConnectionResult {
  ok: boolean;
  status?: number;
  message: string;
}

/** Rotated secret key. */
export interface ApiKeyResult {
  secretKey: string;
  [key: string]: unknown;
}
