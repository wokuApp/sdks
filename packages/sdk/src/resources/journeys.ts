import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { WokuRecord } from '../models';

/** How a moment starts. */
export interface JourneyMomentTrigger {
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
  tool: 'woku' | 'nps' | 'csat' | 'ces';
  /** A new tool per enrollment (default), or one shared by this moment only. */
  toolScope?: 'per_enrollment' | 'shared';
  toolSpec?: {
    /** CSAT experience, CES action, or NPS company/product, not the full question. */
    subject?: { es?: string; en?: string };
    /** NPS recommendation audience. */
    audience?: { es?: string; en?: string };
    /** Woku image/video uploaded through files.upload. The moment name is its title. */
    fileId?: string;
  };
  enabled: boolean;
  channel: 'whatsapp_first' | 'email';
  trigger: JourneyMomentTrigger;
  sequence: {
    attemptOffsetsMs: number[];
    deadlineMs: number;
    cooldownAfterResponseMs: number;
  };
}

export interface JourneyInput {
  name?: string;
  enabled?: boolean;
  moments?: JourneyMoment[];
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
  list(opts?: RequestOptions): Promise<WokuRecord[]> {
    return this.client.request<WokuRecord[]>('get', '/v1/journeys', opts);
  }

  /** One journey with its moments. */
  get(journeyId: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/journeys/${journeyId}`,
      opts,
    );
  }

  /**
   * Create a journey. The response carries `webhookSecret` once and only here:
   * it is what signs this journey's inbound calls, so store it now.
   */
  create(
    body: JourneyInput & { name: string },
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('post', '/v1/journeys', {
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
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/journeys/${journeyId}`,
      { ...opts, body },
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
   * cycle is done with a new subject key.
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
