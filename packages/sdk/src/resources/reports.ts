import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { WokuRecord } from '../models';

/** Read NPS reports (`/v1/reports`). */
export class Reports {
  constructor(private readonly client: WokuClient) {}

  /** Company-level NPS report. */
  companyNps(
    params?: Record<string, unknown>,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', '/v1/reports/company-nps', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  /** NPS report for one tool. */
  npsTool(
    npsToolId: string,
    params?: Record<string, unknown>,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/reports/nps-tool/${npsToolId}`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }
}
