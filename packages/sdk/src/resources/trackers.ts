import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  CreateTrackerParams,
  SearchEntitiesByTrackersParams,
  UpdateTrackerParams,
} from '../types';
import type { EntitiesByTrackers, Tracker } from '../models';

export interface ListTrackersParams {
  includeInactive?: boolean;
  includeUsage?: boolean;
  page?: number;
  limit?: number;
}

/** Manage external tracker definitions (`/v1/external-trackers`). */
export class Trackers {
  constructor(private readonly client: WokuClient) {}

  /** List the company tracker definitions (paginated). */
  list(
    params?: ListTrackersParams,
    opts?: RequestOptions,
  ): Promise<Page<Tracker>> {
    return this.client.getPage<Tracker>('/v1/external-trackers', params, opts);
  }

  /** Create a tracker definition (idempotent). */
  create(body: CreateTrackerParams, opts?: RequestOptions): Promise<Tracker> {
    return this.client.request<Tracker>('post', '/v1/external-trackers', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  /** Get one tracker definition. */
  get(id: string, opts?: RequestOptions): Promise<Tracker> {
    return this.client.request<Tracker>(
      'get',
      `/v1/external-trackers/${id}`,
      opts,
    );
  }

  /** Update a tracker definition. */
  update(
    id: string,
    body: UpdateTrackerParams,
    opts?: RequestOptions,
  ): Promise<Tracker> {
    return this.client.request<Tracker>(
      'patch',
      `/v1/external-trackers/${id}`,
      { ...opts, body },
    );
  }

  /** Activate a tracker definition. */
  activate(id: string, opts?: RequestOptions): Promise<Tracker> {
    return this.client.request<Tracker>(
      'patch',
      `/v1/external-trackers/${id}/activate`,
      opts,
    );
  }

  /** Deactivate a tracker definition. */
  deactivate(id: string, opts?: RequestOptions): Promise<Tracker> {
    return this.client.request<Tracker>(
      'patch',
      `/v1/external-trackers/${id}/deactivate`,
      opts,
    );
  }

  /** Search VoC entities whose trackers match every filter (AND). */
  searchEntities(
    body: SearchEntitiesByTrackersParams,
    opts?: RequestOptions,
  ): Promise<EntitiesByTrackers> {
    return this.client.request<EntitiesByTrackers>(
      'post',
      '/v1/external-trackers/search-entities',
      { ...opts, body },
    );
  }
}
