import type { RequestOptions } from './options';

/** The paginated envelope every `/v1` list endpoint returns. */
export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** True when `value` has the shape of a {@link PageResponse}. */
export const isPageResponse = (
  value: unknown,
): value is PageResponse<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { data?: unknown }).data) &&
  typeof (value as { total?: unknown }).total === 'number';

/**
 * A single page of results plus the cursor to walk the rest. Iterate items
 * across every page with `for await (const item of page)`, or walk page by
 * page with `for await (const p of page.iterPages())`.
 */
export class Page<T> implements AsyncIterable<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;

  constructor(
    response: PageResponse<T>,
    private readonly fetchPage: (
      page: number,
      opts?: RequestOptions,
    ) => Promise<Page<T>>,
    private readonly options?: RequestOptions,
  ) {
    this.data = response.data;
    this.total = response.total;
    this.page = response.page;
    this.limit = response.limit;
  }

  /** Whether another page exists after this one. */
  hasNextPage(): boolean {
    if (this.limit <= 0) return false;
    return this.page * this.limit < this.total;
  }

  /** Fetch the next page (throws if there is none — guard with hasNextPage). */
  getNextPage(): Promise<Page<T>> {
    if (!this.hasNextPage()) {
      throw new RangeError('No next page');
    }
    return this.fetchPage(this.page + 1, this.options);
  }

  /** Yield every item across all pages, fetching lazily as needed. */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for await (const page of walkPages(this)) {
      for (const item of page.data) yield item;
    }
  }

  /** Yield each Page, fetching lazily as needed. */
  iterPages(): AsyncGenerator<Page<T>> {
    return walkPages(this);
  }
}

/** Walk pages from a starting page, fetching the next one lazily. */
async function* walkPages<T>(start: Page<T>): AsyncGenerator<Page<T>> {
  let current = start;
  for (;;) {
    yield current;
    if (!current.hasNextPage()) return;
    current = await current.getNextPage();
  }
}
