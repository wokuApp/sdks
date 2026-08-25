import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { ApiKeyResult, WokuRecord } from '../models';

/** The caller company and its API key (`/v1/companies/me`). */
export class Company {
  constructor(private readonly client: WokuClient) {}

  /** Get the caller company. */
  me(opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('get', '/v1/companies/me', opts);
  }

  /** Rotate the secret key. The returned key replaces the current one. */
  rotateKey(opts?: RequestOptions): Promise<ApiKeyResult> {
    return this.client.request<ApiKeyResult>(
      'post',
      '/v1/companies/me/rotate-key',
      opts,
    );
  }

  /** Revoke the secret key (all subsequent requests will be unauthorized). */
  revokeKey(opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      '/v1/companies/me/revoke-key',
      opts,
    );
  }
}
