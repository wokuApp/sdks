import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  CreateCesToolParams,
  CreateCsatToolParams,
  CreateNpsToolParams,
  UpdateCesToolParams,
  UpdateCsatToolParams,
  UpdateNpsToolParams,
} from '../types';
import type { CesTool, CsatTool, DeletedResult, NpsTool } from '../models';

/** Manage NPS tool definitions (`/v1/nps-tools`). */
export class NpsTools {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<NpsTool>> {
    return this.client.getPage<NpsTool>('/v1/nps-tools', params, opts);
  }

  create(body: CreateNpsToolParams, opts?: RequestOptions): Promise<NpsTool> {
    return this.client.request<NpsTool>('post', '/v1/nps-tools', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  get(id: string, opts?: RequestOptions): Promise<NpsTool> {
    return this.client.request<NpsTool>('get', `/v1/nps-tool/${id}`, opts);
  }

  update(
    id: string,
    body: UpdateNpsToolParams,
    opts?: RequestOptions,
  ): Promise<NpsTool> {
    return this.client.request<NpsTool>('patch', `/v1/nps-tools/${id}`, {
      ...opts,
      body,
    });
  }

  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/nps-tools/${id}`,
      opts,
    );
  }
}

/** Manage CSAT tool definitions (`/v1/csat-tools`). */
export class CsatTools {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<CsatTool>> {
    return this.client.getPage<CsatTool>('/v1/csat-tools', params, opts);
  }

  create(body: CreateCsatToolParams, opts?: RequestOptions): Promise<CsatTool> {
    return this.client.request<CsatTool>('post', '/v1/csat-tools', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  get(id: string, opts?: RequestOptions): Promise<CsatTool> {
    return this.client.request<CsatTool>('get', `/v1/csat-tool/${id}`, opts);
  }

  update(
    id: string,
    body: UpdateCsatToolParams,
    opts?: RequestOptions,
  ): Promise<CsatTool> {
    return this.client.request<CsatTool>('patch', `/v1/csat-tools/${id}`, {
      ...opts,
      body,
    });
  }

  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/csat-tools/${id}`,
      opts,
    );
  }
}

/** Manage CES tool definitions (`/v1/ces-tools`). */
export class CesTools {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<Page<CesTool>> {
    return this.client.getPage<CesTool>('/v1/ces-tools', params, opts);
  }

  create(body: CreateCesToolParams, opts?: RequestOptions): Promise<CesTool> {
    return this.client.request<CesTool>('post', '/v1/ces-tools', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  get(id: string, opts?: RequestOptions): Promise<CesTool> {
    return this.client.request<CesTool>('get', `/v1/ces-tool/${id}`, opts);
  }

  update(
    id: string,
    body: UpdateCesToolParams,
    opts?: RequestOptions,
  ): Promise<CesTool> {
    return this.client.request<CesTool>('patch', `/v1/ces-tools/${id}`, {
      ...opts,
      body,
    });
  }

  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/ces-tools/${id}`,
      opts,
    );
  }
}
