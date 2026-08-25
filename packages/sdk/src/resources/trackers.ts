import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  AssignTrackerByNameParams,
  CreateTrackerParams,
  SearchEntitiesByTrackersParams,
  UpdateTrackerParams,
} from '../types';
import type { EntitiesByTrackers, Tracker, WokuRecord } from '../models';

/** A VoC entity type that can carry tracker values. */
export type TrackerEntityType = 'nps' | 'csat' | 'ces' | 'form' | 'flow';

export interface ListTrackersParams {
  includeInactive?: boolean;
  includeUsage?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchWokusByTrackerParams {
  name: string;
  value: string;
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

  /** List the tracker values assigned to a woku. */
  listWokuValues(
    wokuId: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord[]> {
    return this.client.request<WokuRecord[]>(
      'get',
      `/v1/external-trackers/wokus/${wokuId}`,
      opts,
    );
  }

  /** Assign (upsert) a tracker value to a woku by tracker name. */
  assignToWoku(
    wokuId: string,
    body: AssignTrackerByNameParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/external-trackers/wokus/${wokuId}`,
      { ...opts, body, idempotent: true },
    );
  }

  /** Remove a tracker value from a woku by tracker name. */
  removeFromWoku(
    wokuId: string,
    trackerName: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'delete',
      `/v1/external-trackers/wokus/${wokuId}/${encodeURIComponent(trackerName)}`,
      opts,
    );
  }

  /** Search wokus by an exact `(tracker name, value)` pair (paginated). */
  searchWokus(
    params: SearchWokusByTrackerParams,
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>(
      '/v1/external-trackers/search',
      params,
      opts,
    );
  }

  /** List the tracker values assigned to a VoC entity (nps/csat/ces/form/flow). */
  listEntityValues(
    entityType: TrackerEntityType,
    id: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord[]> {
    return this.client.request<WokuRecord[]>(
      'get',
      `/v1/external-trackers/${entityType}/${id}`,
      opts,
    );
  }

  /** Assign (upsert) a tracker value to a VoC entity by tracker name. */
  assignToEntity(
    entityType: TrackerEntityType,
    id: string,
    body: AssignTrackerByNameParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/external-trackers/${entityType}/${id}`,
      { ...opts, body, idempotent: true },
    );
  }

  /** Remove a tracker value from a VoC entity by tracker name. */
  removeFromEntity(
    entityType: TrackerEntityType,
    id: string,
    trackerName: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'delete',
      `/v1/external-trackers/${entityType}/${id}/${encodeURIComponent(trackerName)}`,
      opts,
    );
  }
}
