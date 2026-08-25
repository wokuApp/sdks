import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { WokuRecord } from '../models';

/** Check respondent quarantine status (`/v1/quarantines`). */
export class Quarantines {
  constructor(private readonly client: WokuClient) {}

  /** Check whether a contact is quarantined. */
  check(
    params: { email?: string; phone?: string | number },
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', '/v1/quarantines/check', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }
}
