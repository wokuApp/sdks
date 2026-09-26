import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { WokuRecord } from '../models';
import type { Schemas } from '../types';

export type JourneyStartMode = 'operator' | 'response' | 'webhook';
export interface JourneyRecipients {
  /** Optional. Omitted means enabled for existing journeys. */
  ticketsEnabled?: boolean;
  plansEnabled?: boolean;
  ticketEmails: string[];
  planMembers: {
    userId: string;
    role: 'admin' | 'assignee';
  }[];
}
export type JourneyWebhook = Schemas['V1JourneyWebhookDto'];
export type JourneySendWindow = Schemas['V1JourneySendWindowDto'];
export type JourneyMomentPreview = Schemas['V1JourneyPreviewResponseDto'];

/** How a moment starts. */
export interface JourneyMomentTrigger {
  verification?: JourneyWebhook['verification'];
  payload?: JourneyWebhook['payload'];
  window?: JourneySendWindow;
  /**
   * `manual` fires when a subject is enrolled, `event` on one of your own
   * event names, `webhook` on the moment's own signed url, and `afterStage`
   * waits behind an earlier moment.
   */
  type: 'manual' | 'event' | 'webhook' | 'afterStage';
  /** Only for `event`: the name your systems emit. */
  event?: string;
  /** Only for `afterStage`: the moment key it waits behind. */
  stage?: string;
  /** Only for `afterStage`: which milestone the wait counts from. */
  anchor?: 'sent' | 'response' | 'event';
  /** How long to wait, in milliseconds. */
  delayMs?: number;
}

/** One moment of a journey. */
export interface JourneyMoment {
  key: string;
  name?: string;
  description?: string;
  order?: number;
  presentation?: Schemas['V1JourneyPresentationDto'];
  tool: 'woku' | 'nps' | 'csat' | 'ces';
  /** V2 defaults to one tool shared within this moment; per_enrollment creates one per case. */
  toolScope?: 'per_enrollment' | 'shared';
  toolSpec?: {
    /** CSAT experience, CES action, or NPS company/product, not the full question. */
    subject?: { es?: string; en?: string };
    /** NPS recommendation audience. */
    audience?: { es?: string; en?: string };
    /** Woku image/video uploaded through files.upload. The moment name is its title. */
    fileId?: string;
    /** Derived from fileId when saving. Dynamic image URLs use webhook.content.imageUrlPath. */
    imageUrl?: string;
    /** Optional English Woku title shown in the English survey. */
    descriptionEn?: string;
  };
  enabled: boolean;
  channel: 'whatsapp_first' | 'email';
  trigger: JourneyMomentTrigger;
  /** Independent of timing: a webhook can advance an otherwise timed moment. */
  webhook?: JourneyWebhook;
  /** Secondary wait for a webhook-primary moment, anchored to an earlier moment. */
  fallbackAfterMs?: number;
  fallbackFromStage?: string;
  sequence: {
    attemptOffsetsMs: number[];
    deadlineMs: number;
    cooldownAfterResponseMs: number;
    sendWindow?: JourneySendWindow;
  };
}

export interface JourneyInput {
  authoringVersion?: 1 | 2;
  startMode?: JourneyStartMode;
  recipients?: JourneyRecipients;
  name?: string;
  enabled?: boolean;
  moments?: JourneyMoment[];
}

export interface Journey extends WokuRecord {
  id: string;
  name?: string;
  enabled: boolean;
  version: number;
  moments: JourneyMoment[];
  authoringVersion?: 1 | 2;
  startMode?: JourneyStartMode;
  recipients?: JourneyRecipients;
  routing?: {
    ticketsReady: boolean;
    plansReady: boolean;
    ticketDestinationId?: string;
    actionPlanGroupId?: string;
  };
}
export interface CreatedJourney extends Journey {
  webhookSecret: string;
}
export interface JourneyEnrollment extends WokuRecord {
  id: string;
  subjectKey: string;
  contact: { email?: string; phone?: string };
  lifecycle: 'pending' | 'running' | 'stopping' | 'stopped' | 'completed';
  definitionVersion?: number;
  startedAt?: string;
  startSource?: JourneyStartMode;
  stoppedAt?: string;
  completedAt?: string;
  stoppedBy?: string;
  stopReason?: string;
  dispatchOutcomeUncertain?: boolean;
  next?: {
    stageKey: string;
    name: string;
    source: JourneyStartMode | 'timer' | 'fallback';
    scheduledFor?: string;
  } | null;
  pendingMoments?: { key: string; name: string }[];
  moments: {
    key: string;
    name?: string;
    status: string;
    toolId?: string;
    toolType?: string;
    toolScope?: 'shared' | 'per_enrollment';
    sentAt?: string;
    respondedAt?: string;
    activationSource?: string;
    hookReceivedAt?: string;
  }[];
}
export interface JourneyEnrollmentPage {
  items: JourneyEnrollment[];
  nextCursor?: string;
}
export interface ListJourneyEnrollmentsParams {
  cursor?: string;
  limit?: number;
}
export interface JourneyConnection {
  stageKey: string;
  mode: string;
  configured: boolean;
  url: string;
}

export interface EnrollInput {
  /** Your own identifier for who is enrolled. */
  subjectKey: string;
  contact: { email?: string; phone?: string };
  trackers?: { name: string; value: string }[];
  metadata?: Record<string, unknown>;
}

export interface JourneyEventInput {
  /** Your own event name. Names starting with `journey.` are reserved. */
  event: string;
  subjectKey: string;
  contact?: { email?: string; phone?: string };
  trackers?: { name: string; value: string }[];
  metadata?: Record<string, unknown>;
}

/**
 * Customer journeys (`/v1/journeys`): define the moments where you listen,
 * create a tool per enrollment or share one within each moment, and set them off by hand or from your
 * own events.
 */
export class Journeys {
  constructor(private readonly client: WokuClient) {}

  /** Every journey of your company. */
  list(opts?: RequestOptions): Promise<Journey[]> {
    return this.client.request<Journey[]>('get', '/v1/journeys', opts);
  }

  /** One journey with its moments. */
  get(journeyId: string, opts?: RequestOptions): Promise<Journey> {
    return this.client.request<Journey>(
      'get',
      `/v1/journeys/${journeyId}`,
      opts,
    );
  }

  /**
   * Create a journey. The response carries `webhookSecret` once and only here:
   * it signs legacy woku_signature calls. V2 URL tokens and sender secrets
   * are configured separately per moment. Store it securely.
   */
  create(
    body: JourneyInput & { name: string },
    opts?: RequestOptions,
  ): Promise<CreatedJourney> {
    return this.client.request<CreatedJourney>('post', '/v1/journeys', {
      ...opts,
      body,
    });
  }

  /**
   * Rename a journey, switch it on or off, or replace its moments. Replacing
   * the moments mints a new version; the enrollments already running keep
   * executing the version they started with.
   */
  update(
    journeyId: string,
    body: JourneyInput,
    opts?: RequestOptions,
  ): Promise<Journey> {
    return this.client.request<Journey>('patch', `/v1/journeys/${journeyId}`, {
      ...opts,
      body,
    });
  }

  /** Cursor page of exact customer cases; pass nextCursor to retrieve another page. */
  listEnrollments(
    journeyId: string,
    params?: ListJourneyEnrollmentsParams,
    opts?: RequestOptions,
  ): Promise<JourneyEnrollmentPage> {
    return this.client.request(
      'get',
      `/v1/journeys/${encodeURIComponent(journeyId)}/enrollments`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  /** History and next step for one exact participation. */
  getEnrollment(
    journeyId: string,
    enrollmentId: string,
    opts?: RequestOptions,
  ): Promise<JourneyEnrollment> {
    return this.client.request(
      'get',
      `/v1/journeys/${encodeURIComponent(journeyId)}/enrollments/${encodeURIComponent(enrollmentId)}`,
      opts,
    );
  }

  /** Cancel future work for this case. Accepted provider sends cannot be recalled. */
  stopEnrollment(
    journeyId: string,
    enrollmentId: string,
    body: { reason?: string } = {},
    opts?: RequestOptions,
  ): Promise<JourneyEnrollment> {
    return this.client.request(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/enrollments/${encodeURIComponent(enrollmentId)}/stop`,
      { ...opts, body },
    );
  }

  /** Credential readiness is not evidence that an actual webhook has arrived. */
  connections(
    journeyId: string,
    opts?: RequestOptions,
  ): Promise<JourneyConnection[]> {
    return this.client.request(
      'get',
      `/v1/journeys/${encodeURIComponent(journeyId)}/connections`,
      opts,
    );
  }

  /** Replaces this moment's URL credential. Store the returned URL in the sender. */
  async mintMomentUrl(
    journeyId: string,
    stageKey: string,
    opts?: RequestOptions,
  ): Promise<{ token: string; url: string }> {
    const result = await this.client.request<{ token: string; url: string }>(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/moments/${encodeURIComponent(stageKey)}/url-token`,
      { ...opts, body: {} },
    );
    return {
      ...result,
      url: new URL(result.url, this.client.baseURL).toString(),
    };
  }

  /** Store the external sender's signing secret encrypted; it is never returned. */
  setSenderSecret(
    journeyId: string,
    stageKey: string,
    senderSecret: string,
    opts?: RequestOptions,
  ): Promise<void> {
    return this.client.request(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/moments/${encodeURIComponent(stageKey)}/sender-secret`,
      { ...opts, body: { senderSecret } },
    );
  }

  /** Test saved payload mapping without creating a participation or sending a tool. */
  previewMoment(
    journeyId: string,
    stageKey: string,
    payload: Record<string, unknown>,
    opts?: RequestOptions,
  ): Promise<JourneyMomentPreview> {
    return this.client.request(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/moments/${encodeURIComponent(stageKey)}/preview`,
      { ...opts, body: { payload } },
    );
  }

  /** Delete a journey. What it already started keeps its own history. */
  delete(journeyId: string, opts?: RequestOptions): Promise<void> {
    return this.client.request<void>(
      'delete',
      `/v1/journeys/${journeyId}`,
      opts,
    );
  }

  /**
   * Mint a new signing secret. The previous one stays valid until the next
   * rotation, so senders can be updated without a gap.
   */
  rotateWebhookSecret(
    journeyId: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/journeys/${journeyId}/webhook-secret`,
      { ...opts, body: {} },
    );
  }

  /**
   * Start the journey for one subject. Enrolling the same person for a later
   * cycle reuses the subject key after the previous cycle completes or stops.
   */
  enroll(
    journeyId: string,
    body: EnrollInput,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/journeys/${journeyId}/enrollments`,
      { ...opts, body },
    );
  }

  /**
   * Emit one of your own events. Every journey whose moments listen for that
   * name reacts.
   */
  emitEvent(
    body: JourneyEventInput,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('post', '/v1/journey-events', {
      ...opts,
      body,
    });
  }
}
