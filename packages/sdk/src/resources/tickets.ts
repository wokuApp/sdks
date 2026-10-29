import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  CreateTicketDestinationParams,
  UpdateTicketDestinationParams,
  UpdateTicketParams,
} from '../types';
import type {
  Severity,
  TestConnectionResult,
  Ticket,
  TicketStats,
  WokuRecord,
} from '../models';

export interface ListTicketsParams {
  tool?: 'woku' | 'nps' | 'form' | 'csat' | 'ces';
  severity?: Severity;
  search?: string;
  destinationId?: string;
  /** Tickets from tools in this folder or its subfolders. */
  folderId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}

export interface TicketStatsParams {
  destinationId?: string;
  /** Tickets from tools in this folder or its subfolders. */
  folderId?: string;
  createdFrom?: string;
  createdTo?: string;
}

/** Read and curate support tickets (`/v1/tickets`). Tickets are AI-generated. */
export class Tickets {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: ListTicketsParams,
    opts?: RequestOptions,
  ): Promise<Page<Ticket>> {
    return this.client.getPage<Ticket>('/v1/tickets', params, opts);
  }

  /** Aggregate counts by tool and by SAC destination. */
  stats(
    params?: TicketStatsParams,
    opts?: RequestOptions,
  ): Promise<TicketStats> {
    return this.client.request<TicketStats>('get', '/v1/tickets/stats', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  get(id: string, opts?: RequestOptions): Promise<Ticket> {
    return this.client.request<Ticket>(
      'get',
      `/v1/tickets/${encodeURIComponent(id)}`,
      opts,
    );
  }

  update(
    id: string,
    body: UpdateTicketParams,
    opts?: RequestOptions,
  ): Promise<Ticket> {
    return this.client.request<Ticket>(
      'patch',
      `/v1/tickets/${encodeURIComponent(id)}`,
      {
        ...opts,
        body,
      },
    );
  }
}

export interface ListTicketDestinationsParams {
  /** Only destinations by folder that listen to this folder. */
  folderId?: string;
}

/** Manage SAC ticket destinations (`/v1/ticket-destinations`). */
export class TicketDestinations {
  constructor(private readonly client: WokuClient) {}

  /**
   * List the destinations. With `{ folderId }`, only the destinations by
   * folder that listen to that folder (configured on it or on an ancestor).
   */
  list(opts?: RequestOptions): Promise<WokuRecord[]>;
  list(
    params: ListTicketDestinationsParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord[]>;
  list(
    paramsOrOpts?: ListTicketDestinationsParams | RequestOptions,
    maybeOpts?: RequestOptions,
  ): Promise<WokuRecord[]> {
    const params =
      paramsOrOpts && 'folderId' in paramsOrOpts
        ? (paramsOrOpts as ListTicketDestinationsParams)
        : undefined;
    const opts = params ? maybeOpts : (paramsOrOpts as RequestOptions);
    return this.client.request<WokuRecord[]>('get', '/v1/ticket-destinations', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/ticket-destinations/${encodeURIComponent(id)}`,
      opts,
    );
  }

  create(
    body: CreateTicketDestinationParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('post', '/v1/ticket-destinations', {
      ...opts,
      body,
      maxRetries: 0,
    });
  }

  update(
    id: string,
    body: UpdateTicketDestinationParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/ticket-destinations/${encodeURIComponent(id)}`,
      { ...opts, body },
    );
  }

  delete(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'delete',
      `/v1/ticket-destinations/${encodeURIComponent(id)}`,
      opts,
    );
  }

  /**
   * Send a real connectivity test to a saved destination. Requires
   * `confirm: true` (the test reaches the live destination).
   */
  test(id: string, opts?: RequestOptions): Promise<TestConnectionResult> {
    return this.client.request<TestConnectionResult>(
      'post',
      `/v1/ticket-destinations/${encodeURIComponent(id)}/test`,
      { ...opts, body: { confirm: true } },
    );
  }
}
