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
  /** Folder the tool lives in, `null` at the root. */
  folderId?: string | null;
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
  /** Folder the tool lives in, `null` at the root. */
  folderId?: string | null;
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
  /** Folder the tool lives in, `null` at the root. */
  folderId?: string | null;
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

export type FollowUpState =
  | 'pending'
  | 'initial_sent'
  | 'awaiting_detail'
  | 'closing'
  | 'completed'
  | 'timed_out'
  | 'cancelled';

export interface FollowUpOrigin {
  tool: 'woku' | 'nps' | 'csat' | 'ces';
  refId: string;
  instrumentId?: string;
}

/** Lightweight evidence state. Completion alone does not mean evidence was applied. */
export interface FollowUp {
  conversationId?: string;
  state: FollowUpState | 'not_applicable';
  reason?: string;
  availableSummaryVersion?: number;
  appliedSummaryVersion?: number;
  enrichedAt?: string;
  /** Ticket processing status; conversation completion does not imply application. */
  enrichmentState?: 'processing' | 'applied' | 'failed' | 'skipped';
  enrichmentReason?: string;
}

/**
 * WhatsApp line of a follow-up. `survey_thread`: the agent continued the
 * survey conversation on the survey number. `follow_up_number`: it wrote from
 * the dedicated follow-up number. Absent for email.
 */
export type FollowUpLine = 'survey_thread' | 'follow_up_number';

/**
 * `survey`: the survey exchange that preceded the follow-up (prelude).
 * `follow_up`: the follow-up itself.
 */
export type FollowUpMessagePhase = 'survey' | 'follow_up';

/**
 * A file the customer sent. `adminUrl` opens it in the woku admin after login
 * and a company check; the file itself and storage URLs are never returned.
 */
export interface FollowUpAttachment {
  /** Stable number of the file in the conversation (prelude included). */
  index: number;
  /** Label in the conversation language, e.g. "Archivo 2" or "File 2". */
  label: string;
  kind: 'image' | 'audio' | 'document' | 'unsupported';
  /** Private original file. Absent while pending or when nothing was stored. */
  fileId?: string;
  /** Converted copy the model read, when there was a conversion. */
  readableFileId?: string;
  filename: string;
  mimeType: string;
  status: 'pending' | 'ready' | 'failed' | 'unsupported';
  /** Transcript (audio) or description (image, document). Untrusted customer content. */
  text?: string;
  /** Stable reason code when failed or unsupported (e.g. `video`, `read_failed`). */
  failureReason?: string;
  adminUrl?: string;
}

/** A file the executive summary cites as "(Archivo N)". */
export interface FollowUpCitation {
  index: number;
  label: string;
  fileId?: string;
  /** What the file supports in the summary. */
  supports: string;
  adminUrl?: string;
}

export interface FollowUpMessage {
  role: 'agent' | 'client';
  /** May be empty when the message only has files. */
  content: string;
  timestamp: string;
  phase: FollowUpMessagePhase;
  responseType?: string;
  selectedOption?: string;
  attachments?: FollowUpAttachment[];
}

/** Authorized conversation detail, without response tokens or transport credentials. */
export interface FollowUpConversation {
  _id: string;
  companyId: string;
  origin: FollowUpOrigin;
  wokuId?: string;
  reviewId?: string;
  reviewType: 'textnote' | 'voicemail';
  originalReview: string;
  originalQualification?: number;
  state: FollowUpState;
  channel: Channel;
  line?: FollowUpLine;
  reason?: string;
  messages: FollowUpMessage[];
  executiveSummary?: string;
  actionItems?: string[];
  sentiment?: string;
  topics?: string[];
  summaryCitations?: FollowUpCitation[];
  summaryVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketOriginTracker {
  trackerId?: string;
  name?: string;
  value: string;
}

export interface TicketOrigin {
  tool: FollowUpOrigin['tool'] | 'form';
  refId: string;
  instrumentId?: string;
  instrumentName?: string;
  trackers?: TicketOriginTracker[];
  [key: string]: unknown;
}

/** Support ticket (curated allow-list). */
export interface Ticket {
  _id: string;
  code?: string;
  title: string;
  severity: Severity;
  destinationId?: string;
  origin?: TicketOrigin;
  followUp?: FollowUp;
  contentVersion?: number;
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

/** Kinds of item the Tools view mixes. */
export type ToolType = 'woku' | 'nps' | 'csat' | 'ces';

/** Headline figure of a tool, always in its native scale (scales are never mixed). */
export interface ToolHeadline {
  kind: 'stars' | 'nps' | 'csat' | 'ces';
  /** Stars 1-5, NPS -100..100, CSAT satisfied %, CES mean 1-5. `null` without responses. */
  value: number | null;
  scale: string;
}

/** A woku, NPS, CSAT or CES tool as listed by `tools.list`. */
export interface ToolItem {
  type: ToolType;
  id: string;
  name: string;
  folderId: string | null;
  createdAt: string | null;
  reviewCount: number;
  lastResponseAt: string | null;
  headline: ToolHeadline;
}

/** Subtree figures of a folder. */
export interface FolderStats {
  toolCounts: Record<ToolType, number>;
  subfolderCount: number;
  reviewCount: number;
}

/**
 * Kind of a system folder created by woku: the `Viajes` root, one journey, one
 * journey moment or an integration (Shopify, Pancake). `null` for your own folders.
 */
export type FolderOrigin =
  | 'journeys-root'
  | 'journey'
  | 'journey-moment'
  | 'integration';

/** A folder with its breadcrumb path and subtree stats. */
export interface Folder {
  id: string;
  name: string;
  color: string | null;
  parentFolderId: string | null;
  /** Breadcrumb from the root, for example `Journeys > Post-sale`. */
  path: string;
  /** System folder kind, `null` for a folder you created. */
  origin: FolderOrigin | null;
  createdAt: string | null;
  stats: FolderStats;
}

/** One page of `tools.list`: folders, tools, facet counts and the cursor. */
export interface ToolItemsPageResponse {
  folders: Folder[];
  tools: ToolItem[];
  nextCursor: string | null;
  facets: { types: Record<ToolType, number> };
}

/** Headline figures of one tool type for the company or a folder. */
export interface ToolTypeStats {
  toolCount: number;
  reviewCount: number;
  headline: ToolHeadline;
  lastResponseAt: string | null;
  /** NPS only. */
  distribution?: { promoters: number; passives: number; detractors: number };
}

/** A type that failed to compute reports `{ error: true }`; the others stay valid. */
export type ToolsStats = Record<ToolType, ToolTypeStats | { error: true }>;

/** Result of `tools.move` and `folders.move` batches. */
export interface MoveResult {
  moved: number;
  folderId: string | null;
  items: { type: ToolType | 'folder'; id: string }[];
}

/** The CSV of a folder: the raw text, one row per response. */
export type FolderCsv = string;

/** Whether the company keeps its journeys in folders (`Viajes > journey > moment`). */
export interface JourneyFoldersStatus {
  enabled: boolean;
  enabledAt: string | null;
  organizedAt: string | null;
  /** True while the one-off organization is running in the background. */
  organizing: boolean;
  /** Journeys and tools still without a folder. */
  pending: { journeys: number; tools: number };
}
