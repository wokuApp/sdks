import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type { SendInvitationsParams } from '../types';
import type { InvitationsResult, WokuRecord } from '../models';

/** Read forms and send form invitations (`/v1/forms`). */
export class Forms {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/forms', params, opts);
  }

  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', `/v1/forms/${id}`, opts);
  }

  /** List the responses of a form (paginated). */
  listResponses(
    id: string,
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>(
      `/v1/forms/${id}/responses`,
      params,
      opts,
    );
  }

  /** Send a form by email or WhatsApp (idempotent). */
  sendInvitations(
    id: string,
    body: SendInvitationsParams,
    opts?: RequestOptions,
  ): Promise<InvitationsResult> {
    return this.client.request<InvitationsResult>(
      'post',
      `/v1/forms/${id}/invitations`,
      { ...opts, body, idempotent: true },
    );
  }
}
