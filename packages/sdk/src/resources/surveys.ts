import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  SendCesInvitationsParams,
  SendCsatInvitationsParams,
  SendNpsInvitationsParams,
} from '../types';
import type { InvitationsResult, WokuRecord } from '../models';

export interface ListResponsesParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** Send the NPS survey and read its responses (`/v1/nps`). */
export class Nps {
  constructor(private readonly client: WokuClient) {}

  /** Send the NPS survey by email or WhatsApp (idempotent). */
  sendInvitations(
    body: SendNpsInvitationsParams,
    opts?: RequestOptions,
  ): Promise<InvitationsResult> {
    return this.client.request<InvitationsResult>(
      'post',
      '/v1/nps/invitations',
      {
        ...opts,
        body,
        idempotent: true,
      },
    );
  }

  /** List NPS responses (paginated). */
  listResponses(
    params?: ListResponsesParams,
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/nps', params, opts);
  }

  /** Get one NPS response. */
  getResponse(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', `/v1/nps/${id}`, opts);
  }
}

/** Send the CSAT survey and read its responses (`/v1/csat`). */
export class Csat {
  constructor(private readonly client: WokuClient) {}

  sendInvitations(
    body: SendCsatInvitationsParams,
    opts?: RequestOptions,
  ): Promise<InvitationsResult> {
    return this.client.request<InvitationsResult>(
      'post',
      '/v1/csat/invitations',
      { ...opts, body, idempotent: true },
    );
  }

  listResponses(
    params?: ListResponsesParams,
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/csat', params, opts);
  }

  getResponse(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', `/v1/csat/${id}`, opts);
  }
}

/** Send the CES survey and read its responses (`/v1/ces`). */
export class Ces {
  constructor(private readonly client: WokuClient) {}

  sendInvitations(
    body: SendCesInvitationsParams,
    opts?: RequestOptions,
  ): Promise<InvitationsResult> {
    return this.client.request<InvitationsResult>(
      'post',
      '/v1/ces/invitations',
      {
        ...opts,
        body,
        idempotent: true,
      },
    );
  }

  listResponses(
    params?: ListResponsesParams,
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/ces', params, opts);
  }

  getResponse(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', `/v1/ces/${id}`, opts);
  }
}
