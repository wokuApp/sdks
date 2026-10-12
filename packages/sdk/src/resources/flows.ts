import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type { CreateFlowParams, UpdateFlowParams } from '../types';
import type { DeletedResult, Flow, WokuRecord } from '../models';

/**
 * Survey flows (`/v1/flows`): an ordered sequence of steps, each a woku or an
 * NPS, CSAT or CES tool, that a respondent answers one after the other.
 */
export class Flows {
  constructor(private readonly client: WokuClient) {}

  /** List the flows of the company, with their ordered `steps`. */
  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<Flow>> {
    return this.client.getPage<Flow>('/v1/flows', params, opts);
  }

  /** The data of a flow: ordered steps with their tools, wokus and branding. */
  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/flows/${encodeURIComponent(id)}`,
      opts,
    );
  }

  /**
   * Create a flow from 1 to 20 ordered steps (each tool once, all of your
   * company). Flows live outside folders.
   */
  create(body: CreateFlowParams, opts?: RequestOptions): Promise<Flow> {
    return this.client.request<Flow>('post', '/v1/flows', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  /** Rename a flow or replace its full ordered list of steps. */
  update(
    id: string,
    body: UpdateFlowParams,
    opts?: RequestOptions,
  ): Promise<Flow> {
    return this.client.request<Flow>(
      'patch',
      `/v1/flows/${encodeURIComponent(id)}`,
      { ...opts, body },
    );
  }

  /** Delete a flow. Its tools and their responses stay. */
  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/flows/${encodeURIComponent(id)}`,
      opts,
    );
  }
}
