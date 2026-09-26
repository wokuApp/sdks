import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { Schemas } from '../types';
import type { operations } from '../_generated/openapi';

/** Public journey shapes are generated from the server OpenAPI contract. */
export type JourneyStartMode = NonNullable<
  Schemas['V1JourneyResponseDto']['startMode']
>;
export type JourneyRecipients = Schemas['JourneyRecipientsDto'];
export type JourneyWebhook = Schemas['V1JourneyWebhookDto'];
export type JourneySendWindow = Schemas['V1JourneySendWindowDto'];
export type JourneyMomentPreview = Schemas['V1JourneyPreviewResponseDto'];
export type JourneyMomentTrigger = Schemas['V1JourneyTriggerDto'];
export type JourneyMoment = Schemas['V1JourneyMomentDto'];
export type JourneyInput = Schemas['V1UpdateJourneyBodyDto'];
export type Journey = Schemas['V1JourneyResponseDto'];
export type CreatedJourney = Schemas['V1CreatedJourneyResponseDto'];
export type JourneyEnrollment = Schemas['V1JourneyParticipationDto'];
export type JourneyEnrollmentPage = Schemas['V1JourneyParticipationPageDto'];
export type ListJourneyEnrollmentsParams = NonNullable<
  operations['V1JourneysController_listParticipations']['parameters']['query']
>;
export type JourneyConnection = Schemas['V1JourneyConnectionDto'];
export type EnrollInput = Schemas['V1EnrollSubjectBodyDto'];
export type JourneyEventInput = Schemas['V1EmitJourneyEventBodyDto'];
export type JourneyEntryInfo = Schemas['JourneyEntryInfoDto'];
export type PrepareJourneyEntryInput = Schemas['PrepareJourneyEntryDto'];
export type PreparedJourneyEntry = Schemas['PreparedJourneyEntryDto'];

/**
 * Customer journeys (`/v1/journeys`): define the moments where you listen,
 * create a tool per enrollment or share one within each moment, and set them off by hand or from your
 * own events.
 */
export class Journeys {
  constructor(private readonly client: WokuClient) {}

  /** Read customer entry metadata without starting or preparing an evaluation. */
  entryInfo(
    journeyId: string,
    opts?: RequestOptions,
  ): Promise<JourneyEntryInfo> {
    return this.client.request(
      'get',
      `/v1/journey-entries/${encodeURIComponent(journeyId)}`,
      opts,
    );
  }

  /** Prepare a first tool. Only its saved response with dispatchToken confirms entry. */
  prepareEntry(
    journeyId: string,
    body: PrepareJourneyEntryInput,
    opts?: RequestOptions,
  ): Promise<PreparedJourneyEntry> {
    return this.client.request(
      'post',
      `/v1/journey-entries/${encodeURIComponent(journeyId)}`,
      { ...opts, body },
    );
  }

  /** Every journey of your company. */
  list(opts?: RequestOptions): Promise<Journey[]> {
    return this.client.request<Journey[]>('get', '/v1/journeys', opts);
  }

  /** One journey with its moments. */
  get(journeyId: string, opts?: RequestOptions): Promise<Journey> {
    return this.client.request<Journey>(
      'get',
      `/v1/journeys/${encodeURIComponent(journeyId)}`,
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
    return this.client.request<Journey>(
      'patch',
      `/v1/journeys/${encodeURIComponent(journeyId)}`,
      {
        ...opts,
        body,
      },
    );
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
      `/v1/journeys/${encodeURIComponent(journeyId)}`,
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
  ): Promise<Schemas['V1JourneySecretResponseDto']> {
    return this.client.request<Schemas['V1JourneySecretResponseDto']>(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/webhook-secret`,
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
  ): Promise<Schemas['V1JourneyEnrollmentResponseDto']> {
    return this.client.request<Schemas['V1JourneyEnrollmentResponseDto']>(
      'post',
      `/v1/journeys/${encodeURIComponent(journeyId)}/enrollments`,
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
  ): Promise<Schemas['V1JourneyEventResponseDto']> {
    return this.client.request<Schemas['V1JourneyEventResponseDto']>(
      'post',
      '/v1/journey-events',
      {
        ...opts,
        body,
      },
    );
  }
}
