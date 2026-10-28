import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  DataApp,
  DataAppChange,
  DataAppPublication,
  DataAppQueryResults,
  DataAppTable,
  DataAppView,
} from '../models';
import type {
  EditDataAppParams,
  PublishDataAppVersionParams,
  RunDataAppQueriesParams,
} from '../types';

export interface ListDataAppsParams {
  page?: number;
  limit?: number;
}

export interface UploadDataAppTableParams {
  file: Blob | Uint8Array;
  /** File name with its extension (csv, xlsx, json or xml). */
  filename: string;
  contentType?: string;
}

/**
 * Data Studio apps (`/v1/data-apps`): read their spec and live data, edit
 * them with operations and manage their versions and tables. Every change
 * creates a new version; personal data never comes back.
 */
export class DataApps {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: ListDataAppsParams,
    opts?: RequestOptions,
  ): Promise<Page<DataApp>> {
    return this.client.getPage<DataApp>('/v1/data-apps', params, opts);
  }

  /** One version of an app (the current one unless `version` is given). */
  get(
    id: string,
    params?: { version?: number },
    opts?: RequestOptions,
  ): Promise<DataAppView> {
    return this.client.request<DataAppView>(
      'get',
      `/v1/data-apps/${encodeURIComponent(id)}`,
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  /** Live results of queries of the app, with filter values. */
  runQueries(
    id: string,
    body: RunDataAppQueriesParams,
    opts?: RequestOptions,
  ): Promise<DataAppQueryResults> {
    return this.client.request<DataAppQueryResults>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/queries`,
      { ...opts, body },
    );
  }

  /** Applies operations on the current version (all or nothing). */
  edit(
    id: string,
    body: EditDataAppParams,
    opts?: RequestOptions,
  ): Promise<DataAppChange> {
    return this.client.request<DataAppChange>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/operations`,
      { ...opts, body },
    );
  }

  /** Brings back an earlier version as a new one. */
  restore(
    id: string,
    version: number,
    opts?: RequestOptions,
  ): Promise<DataAppChange> {
    return this.client.request<DataAppChange>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/versions/${version}/restore`,
      opts,
    );
  }

  /** Builds the current sketch with live data. */
  build(id: string, opts?: RequestOptions): Promise<DataAppChange> {
    return this.client.request<DataAppChange>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/build`,
      opts,
    );
  }

  /** Shows a version in the shared link; the first time needs `accessKey`. */
  publish(
    id: string,
    version: number,
    body?: PublishDataAppVersionParams,
    opts?: RequestOptions,
  ): Promise<DataAppPublication> {
    return this.client.request<DataAppPublication>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/versions/${version}/publish`,
      { ...opts, body: body ?? {} },
    );
  }

  async listTables(id: string, opts?: RequestOptions): Promise<DataAppTable[]> {
    const result = await this.client.request<{ data: DataAppTable[] }>(
      'get',
      `/v1/data-apps/${encodeURIComponent(id)}/tables`,
      opts,
    );
    return result.data;
  }

  /**
   * Uploads a CSV, XLSX, JSON or XML file as a table of the app. The same
   * file name makes a new version of that table.
   */
  uploadTable(
    id: string,
    input: UploadDataAppTableParams,
    opts?: RequestOptions,
  ): Promise<DataAppTable> {
    const file = new Blob(
      [input.file instanceof Blob ? input.file : new Uint8Array(input.file)],
      {
        type:
          input.contentType ??
          (input.file instanceof Blob ? input.file.type : ''),
      },
    );
    const body = new FormData();
    body.append('file', file, input.filename);
    return this.client.request<DataAppTable>(
      'post',
      `/v1/data-apps/${encodeURIComponent(id)}/tables`,
      { ...opts, body, maxRetries: 0 },
    );
  }
}
