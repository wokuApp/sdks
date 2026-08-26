import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  CreateWokuParams,
  MoveWokuParams,
  SendInvitationsParams,
  ShareWokuParams,
  UpdateWokuParams,
  UpdateWokuSettingsParams,
} from '../types';
import type {
  DeletedResult,
  InvitationsResult,
  WokuRecord,
  WokuResource,
} from '../models';

/** Manage wokus (feedback collection tools) — `/v1/wokus`. */
export class Wokus {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<WokuResource>> {
    return this.client.getPage<WokuResource>('/v1/wokus', params, opts);
  }

  create(body: CreateWokuParams, opts?: RequestOptions): Promise<WokuResource> {
    return this.client.request<WokuResource>('post', '/v1/wokus', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  /** Get one woku with aggregated review stats. */
  get(id: string, opts?: RequestOptions): Promise<WokuResource> {
    return this.client.request<WokuResource>('get', `/v1/wokus/${id}`, opts);
  }

  update(
    id: string,
    body: UpdateWokuParams,
    opts?: RequestOptions,
  ): Promise<WokuResource> {
    return this.client.request<WokuResource>('patch', `/v1/wokus/${id}`, {
      ...opts,
      body,
    });
  }

  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/wokus/${id}`,
      opts,
    );
  }

  /** Apply the boolean settings idempotently (closed/reviewsDisabled/...). */
  updateSettings(
    id: string,
    body: UpdateWokuSettingsParams,
    opts?: RequestOptions,
  ): Promise<WokuResource> {
    return this.client.request<WokuResource>('patch', `/v1/wokus/${id}/settings`, {
      ...opts,
      body,
    });
  }

  /** Move the woku into a folder, or to the root with `{ folderId: null }`. */
  move(id: string, body: MoveWokuParams, opts?: RequestOptions): Promise<WokuResource> {
    return this.client.request<WokuResource>('patch', `/v1/wokus/${id}/move`, {
      ...opts,
      body,
    });
  }

  /** List the reviews of a woku (paginated). */
  listReviews(
    id: string,
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>(
      `/v1/wokus/${id}/reviews`,
      params,
      opts,
    );
  }

  /** Send a woku review invitation by email or WhatsApp (idempotent). */
  sendInvitations(
    id: string,
    body: SendInvitationsParams,
    opts?: RequestOptions,
  ): Promise<InvitationsResult> {
    return this.client.request<InvitationsResult>(
      'post',
      `/v1/wokus/${id}/invitations`,
      { ...opts, body, idempotent: true },
    );
  }

  /** Share a woku review link by email. */
  share(
    id: string,
    body: ShareWokuParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('post', `/v1/wokus/${id}/share`, {
      ...opts,
      body,
    });
  }
}
