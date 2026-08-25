import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type { WokuRecord } from '../models';

/** Read data flows (`/v1/flows`). */
export class Flows {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/flows', params, opts);
  }

  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', `/v1/flows/${id}`, opts);
  }
}
