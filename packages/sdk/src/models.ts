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
  /** Only identified answers (email or phone) are accepted. */
  anonymousDisabled?: boolean;
  /** Each identified client can answer once; anonymous answers never count. */
  onlyOneResponsePerClient?: boolean;
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
  /** Only identified answers (email or phone) are accepted. */
  anonymousDisabled?: boolean;
  /** Each identified client can answer once; anonymous answers never count. */
  onlyOneResponsePerClient?: boolean;
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
  /** Only identified answers (email or phone) are accepted. */
  anonymousDisabled?: boolean;
  /** Each identified client can answer once; anonymous answers never count. */
  onlyOneResponsePerClient?: boolean;
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

/** A WhatsApp number that receives improvement alerts of a folder. */
export interface WhatsappAlertRecipient {
  /** E.164 phone number without the leading +. */
  whatsappId: string;
  name: string;
  /** Kinds of comment that alert this number (numbers created before this feature only get `woku`). */
  sources: ToolType[];
  /** `true`: every review of those kinds (recognitions too). `false`: improvements only (default). */
  allReviews: boolean;
}

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
  /** Provider of an integration folder (`shopify`, `pancake`), otherwise `null`. */
  integrationProvider?: string | null;
  /** WhatsApp numbers alerted when a comment of any tool in the folder is an improvement (or any review, with `allReviews`). */
  whatsappAlertRecipients: WhatsappAlertRecipient[];
  createdAt: string | null;
  stats: FolderStats;
}

/** One page of `tools.list`: folders, tools, facet counts and the cursor. */
export interface ToolItemsPageResponse {
  folders: Folder[];
  /** Cursor of the next page of folders; null when they were all returned. */
  foldersNextCursor: string | null;
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

/** One window (the period, or the one before it) of one tool. */
export interface ToolWindow {
  count: number;
  headline: ToolHeadline;
  /** Share (0-100) of positive responses: 4-5, or NPS promoters; `null` with no responses. */
  positive: number | null;
  /** Share (0-100) of negative responses: 1-2, or NPS detractors; `null` with no responses. */
  negative: number | null;
  /** The raw counts and score sum behind the shares, to combine tools without rounding drift. */
  positiveCount: number;
  negativeCount: number;
  scoreSum: number;
}

/** Per-tool figures of `folders.metrics`: the period against the one before it. */
export interface ToolMetrics {
  type: ToolType;
  id: string;
  name: string;
  /** Responses ever received. */
  totalResponses: number;
  lastResponseAt: string | null;
  current: ToolWindow;
  previous: ToolWindow;
}

/** Sums of one day (UTC) and tool type, enough to rebuild any score on any bucket. */
export interface DailyPoint {
  date: string;
  type: ToolType;
  count: number;
  scoreSum: number;
  positive: number;
  negative: number;
}

/** Result of `folders.metrics`. */
export interface FolderToolMetrics {
  /** Period in days; `0` is the whole history (then every `previous` window is empty). */
  days: number;
  /** Custom period (`YYYY-MM-DD`, both inclusive) when one was asked for. */
  from?: string;
  to?: string;
  tools: ToolMetrics[];
  /** Daily sums of both windows (2 x `days`). */
  daily: DailyPoint[];
  /** Responses per score in the period: 0-10 for NPS, 1-5 for the rest. */
  distribution: Record<ToolType, number[]>;
}

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

/** One step of a flow: the tool the respondent answers at that point. */
export interface FlowStep {
  type: ToolType;
  /** Tool id. For an `nps` step, your company id means the company-level NPS. */
  toolId: string;
}

/** A survey flow: an ordered sequence of woku, NPS, CSAT and CES steps. */
export interface Flow {
  _id: string;
  name: string;
  /** Ordered steps. Flows live outside folders. */
  steps: FlowStep[];
  /** Woku ids of the `woku` steps, in order (kept for compatibility). */
  wokusIds?: string[];
  npsToolId?: string | null;
  companyIdNps?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** What a scheduled report covers: a folder (every tool of its subtree) or one tool. */
export type ReportSubscriptionScope =
  | 'folder'
  | 'woku'
  | 'nps'
  | 'csat'
  | 'ces';

/** monthly (1st), biweekly (1st and 16th), weekly (Mondays) at 12:00 UTC, or once. */
export type ReportSubscriptionFrequency =
  | 'monthly'
  | 'biweekly'
  | 'weekly'
  | 'once';

/** One send of a scheduled report. */
export interface ReportSubscriptionDelivery {
  /** `YYYY-MM-DD/YYYY-MM-DD`, the period it covered (`to` exclusive). */
  periodKey: string;
  sentAt: string;
  /** Recipients that got it. */
  recipients: number;
  delivered: boolean;
  error?: string;
}

/** A report emailed on a schedule to people inside or outside woku. */
export interface ReportSubscription {
  id: string;
  scopeType: ReportSubscriptionScope;
  scopeId: string;
  /** Name of the folder or tool; empty when it no longer exists. */
  scopeName?: string;
  frequency: ReportSubscriptionFrequency;
  /** `once` only: the period of the single report. */
  periodFrom: string | null;
  periodTo: string | null;
  recipients: string[];
  /** Folder only: the CSV of the period is attached too. */
  includeCsv: boolean;
  locale: string;
  /** `false` when paused, or when a one-off already went out. */
  active: boolean;
  nextRunAt: string | null;
  lastDelivery: ReportSubscriptionDelivery | null;
  createdAt: string | null;
}

/** Outcome of `reportSubscriptions.send`. */
export interface ReportSubscriptionSendResult {
  status: 'sent' | 'skipped' | 'failed';
  sent: number;
  periodKey?: string;
}

/** A person of a folder's participant list. */
export interface FolderParticipant {
  /** Stable id, for `folderParticipants.remove`. */
  id: string;
  name?: string;
  email?: string;
  /** Digits with the country code, no `+`. */
  phone?: string;
}

/** Who of the list answered one tool of the folder subtree. */
export interface ToolParticipation {
  type: ToolType;
  id: string;
  name: string;
  folderPath: string;
  /** The tool takes anonymous responses, which cannot be matched to the list. */
  anonymousAllowed: boolean;
  /** Indexes into `participants`: answered once. */
  responded: number[];
  missing: number[];
  /** Answered more than once. */
  repeated: number[];
  /** Responses not from the list (anonymous or from someone else). */
  outsideList: number;
}

/** A folder's participant list and who of it answered each tool. */
export interface FolderParticipation {
  folder: { id: string; name: string };
  participants: FolderParticipant[];
  updatedAt: string | null;
  tools: ToolParticipation[];
}

/** Outcome of `folderParticipants.replace`. */
export interface ParticipantsSaveResult {
  count: number;
  /** 1-based lines without an email or phone. */
  invalidLines: number[];
  duplicates: number;
}

/** Outcome of `folderParticipants.add`. */
export interface ParticipantsAddResult extends ParticipantsSaveResult {
  /** People on the list after adding. */
  total: number;
}

/** Outcome of `folderParticipants.resendToMissing`. */
export interface ResendToMissingResult {
  /** People of the list who have not answered the tool. */
  missing: number;
  sent: number;
  /** Missing people without a contact for the channel. */
  withoutContact: number;
  failed: number;
}
