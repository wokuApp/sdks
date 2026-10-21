import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { CreateFolderParams, UpdateFolderParams } from '../types';
import type {
  DeletedResult,
  Folder,
  FolderCsv,
  FolderToolMetrics,
  WokuRecord,
} from '../models';

/**
 * Folders that organize wokus and NPS, CSAT and CES tools (`/v1/folders`).
 * To list what a folder contains use `woku.tools.list({ folderId })`.
 */
export class Folders {
  constructor(private readonly client: WokuClient) {}

  /** Every folder of the company, or the direct subfolders of `parentFolderId`. */
  list(
    params?: { parentFolderId?: string; q?: string },
    opts?: RequestOptions,
  ): Promise<Folder[]> {
    return this.client.request<Folder[]>('get', '/v1/folders', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  get(id: string, opts?: RequestOptions): Promise<Folder> {
    return this.client.request<Folder>(
      'get',
      `/v1/folders/${encodeURIComponent(id)}`,
      opts,
    );
  }

  create(body: CreateFolderParams, opts?: RequestOptions): Promise<Folder> {
    return this.client.request<Folder>('post', '/v1/folders', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  /**
   * Rename or recolor a folder (`color: null` clears the color) and/or replace
   * its WhatsApp alert recipients (`whatsappAlertRecipients`, `[]` clears them).
   */
  update(
    id: string,
    body: UpdateFolderParams,
    opts?: RequestOptions,
  ): Promise<Folder> {
    return this.client.request<Folder>(
      'patch',
      `/v1/folders/${encodeURIComponent(id)}`,
      { ...opts, body },
    );
  }

  /**
   * Move a folder under another folder, or to the root with
   * `parentFolderId: null`. A folder cannot move into its own subtree.
   */
  move(
    id: string,
    body: { parentFolderId: string | null },
    opts?: RequestOptions,
  ): Promise<Folder> {
    return this.client.request<Folder>(
      'patch',
      `/v1/folders/${encodeURIComponent(id)}/move`,
      { ...opts, body },
    );
  }

  /**
   * Delete a folder. Nothing inside is deleted: subfolders, wokus and tools
   * move up to the parent folder (or the root).
   */
  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/folders/${encodeURIComponent(id)}`,
      opts,
    );
  }

  /**
   * AI report over every woku, NPS, CSAT and CES tool of the folder and its
   * subfolders. Scales differ per type, so there is no rating distribution.
   */
  report(
    id: string,
    params?: { regenerate?: boolean; lang?: 'es' | 'en' },
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/folders/${encodeURIComponent(id)}/report`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  /**
   * Per-tool figures of the woku, NPS, CSAT and CES tools of the folder and its
   * subfolders for a period against the one before it, with the daily sums and
   * the histogram of scores. `days` is 7, 30 (default) or 90, or 0 for the whole
   * history (every `previous` window is then empty). The period is the last
   * `days` calendar days in UTC, today included. Or a custom range with `from`
   * and `to` (`YYYY-MM-DD` UTC days, both inclusive, up to 731 days), which
   * replaces `days`. Scales are never mixed across types.
   */
  metrics(
    id: string,
    params?: { days?: 0 | 7 | 30 | 90; from?: string; to?: string },
    opts?: RequestOptions,
  ): Promise<FolderToolMetrics> {
    return this.client.request<FolderToolMetrics>(
      'get',
      `/v1/folders/${encodeURIComponent(id)}/metrics`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  /**
   * CSV text with one row per response of every tool of the folder subtree,
   * or only those of a period (`from` inclusive, `to` exclusive, ISO 8601).
   */
  csv(
    id: string,
    params?: { from?: string; to?: string },
    opts?: RequestOptions,
  ): Promise<FolderCsv> {
    return this.client.request<FolderCsv>(
      'get',
      `/v1/folders/${encodeURIComponent(id)}/csv`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  /**
   * PDF of the folder report (every woku, NPS, CSAT and CES tool of the folder
   * and its subfolders) with a breakdown per type on each native scale.
   * Returns the file bytes: write them to disk or send them as is.
   */
  pdf(
    id: string,
    params?: { lang?: 'es' | 'en' },
    opts?: RequestOptions,
  ): Promise<Uint8Array> {
    return this.client.request<Uint8Array>(
      'get',
      `/v1/folders/${encodeURIComponent(id)}/pdf`,
      {
        ...opts,
        headers: { Accept: 'application/pdf', ...opts?.headers },
        query: { ...params, ...opts?.query },
        binary: true,
      },
    );
  }
}
