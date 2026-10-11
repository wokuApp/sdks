import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { MoveToolItemsParams } from '../types';
import type {
  Folder,
  MoveResult,
  ToolItem,
  ToolItemsPageResponse,
  ToolsStats,
  ToolType,
} from '../models';

/** Filters of `tools.list`. */
export interface ListToolsParams {
  /** Folder whose direct content is listed. Omit for the root. */
  folderId?: string;
  /** `level` (default) lists one folder level; `company` lists every tool flat. */
  scope?: 'level' | 'company';
  /** Only these tool types. */
  types?: ToolType[];
  /** Case and accent insensitive search (company-wide, also matches folders). */
  q?: string;
  sort?: 'name' | '-name' | 'created' | '-created';
  /** Page size, 1-100 (default 50). */
  limit?: number;
  createdFrom?: string;
  createdTo?: string;
}

/**
 * One page of `tools.list`. Iterate every tool across all pages with
 * `for await (const tool of page)`, or page by page with `page.iterPages()`.
 */
export class ToolsPage implements AsyncIterable<ToolItem> {
  readonly folders: Folder[];
  readonly tools: ToolItem[];
  readonly nextCursor: string | null;
  readonly facets: ToolItemsPageResponse['facets'];

  constructor(
    response: ToolItemsPageResponse,
    private readonly fetchNext: (cursor: string) => Promise<ToolsPage>,
  ) {
    this.folders = response.folders;
    this.tools = response.tools;
    this.nextCursor = response.nextCursor;
    this.facets = response.facets;
  }

  hasNextPage(): boolean {
    return this.nextCursor !== null;
  }

  getNextPage(): Promise<ToolsPage> {
    if (this.nextCursor === null) throw new RangeError('No next page');
    return this.fetchNext(this.nextCursor);
  }

  async *iterPages(): AsyncGenerator<ToolsPage> {
    yield this;
    if (this.hasNextPage()) yield* (await this.getNextPage()).iterPages();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ToolItem> {
    for await (const page of this.iterPages()) {
      for (const tool of page.tools) yield tool;
    }
  }
}

/**
 * The unified view over wokus and NPS, CSAT and CES tools (`/v1/tools`):
 * search and filters, headline figures per type and batch moves.
 */
export class Tools {
  constructor(private readonly client: WokuClient) {}

  /**
   * List one folder level (or search the company). Folders and tools of every
   * type come together; the first page also carries the folders and facets.
   */
  async list(
    params?: ListToolsParams,
    opts?: RequestOptions,
  ): Promise<ToolsPage> {
    const fetchPage = async (cursor?: string): Promise<ToolsPage> => {
      const response = await this.client.request<ToolItemsPageResponse>(
        'get',
        '/v1/tools',
        {
          ...opts,
          query: {
            ...params,
            types: params?.types?.join(','),
            ...(cursor ? { cursor } : {}),
            ...opts?.query,
          },
        },
      );
      return new ToolsPage(response, fetchPage);
    };
    return fetchPage();
  }

  /**
   * Headline figures per type (woku stars, NPS score, CSAT satisfied %, CES
   * mean) for the company or one folder and its subfolders, in a period.
   * A type that fails reports `{ error: true }`; the others stay valid.
   */
  stats(
    params?: { folderId?: string; from?: string; to?: string },
    opts?: RequestOptions,
  ): Promise<ToolsStats> {
    return this.client.request<ToolsStats>('get', '/v1/tools/stats', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  /**
   * Move up to 200 items of mixed types (`woku`, `nps`, `csat`, `ces`,
   * `folder`) into a folder, or to the root with `folderId: null`. Idempotent;
   * nothing moves if one item or the destination is not found.
   */
  move(body: MoveToolItemsParams, opts?: RequestOptions): Promise<MoveResult> {
    return this.client.request<MoveResult>('post', '/v1/tools/move', {
      ...opts,
      body,
    });
  }
}
