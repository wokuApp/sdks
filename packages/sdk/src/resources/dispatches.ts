import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type { Channel, Dispatch, DispatchStats } from '../models';

export interface ListDispatchesParams {
  channel?: Channel;
  responseType?: 'woku' | 'nps' | 'form' | 'client-form' | 'csat' | 'ces';
  targetId?: string;
  status?: 'invited' | 'partially_responded' | 'responded' | 'failed';
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}

export interface DispatchStatsParams {
  channel?: Channel;
  responseType?: string;
  targetId?: string;
  createdFrom?: string;
  createdTo?: string;
}

/** Delivery tracking over invitation dispatches (`/v1/dispatches`). */
export class Dispatches {
  constructor(private readonly client: WokuClient) {}

  /** List the invitation dispatches (delivery status, no recipient PII). */
  list(
    params?: ListDispatchesParams,
    opts?: RequestOptions,
  ): Promise<Page<Dispatch>> {
    return this.client.getPage<Dispatch>('/v1/dispatches', params, opts);
  }

  /** Response-rate metrics over the dispatches. */
  stats(
    params?: DispatchStatsParams,
    opts?: RequestOptions,
  ): Promise<DispatchStats> {
    return this.client.request<DispatchStats>('get', '/v1/dispatches/stats', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }
}
