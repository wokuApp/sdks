import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { FollowUpConversation } from '../models';

/** Read authorized follow-up conversations with a company management secret. */
export class FollowUps {
  constructor(private readonly client: WokuClient) {}

  async get(id: string, opts?: RequestOptions): Promise<FollowUpConversation> {
    const result = await this.client.request<{ data: FollowUpConversation }>(
      'get',
      `/v1/follow-ups/${encodeURIComponent(id)}`,
      opts,
    );
    return result.data;
  }
}
