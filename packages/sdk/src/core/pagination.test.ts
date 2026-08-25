import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { WokuClient } from './client';

const BASE = 'http://api.test';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = (): WokuClient =>
  new WokuClient({ apiKey: 'sk_test', baseURL: BASE });

describe('Page', () => {
  it('auto-iterates items across pages, fetching lazily', async () => {
    server.use(
      http.get(`${BASE}/v1/items`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
        if (page === 1)
          return HttpResponse.json({
            data: [{ id: 'a' }, { id: 'b' }],
            total: 3,
            page: 1,
            limit: 2,
          });
        return HttpResponse.json({
          data: [{ id: 'c' }],
          total: 3,
          page: 2,
          limit: 2,
        });
      }),
    );

    const first = await client().getPage<{ id: string }>('/v1/items');
    expect(first.hasNextPage()).toBe(true);

    const ids: string[] = [];
    for await (const item of first) ids.push(item.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('walks page by page with iterPages', async () => {
    server.use(
      http.get(`${BASE}/v1/items`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
        return HttpResponse.json({
          data: [{ n: page }],
          total: 2,
          page,
          limit: 1,
        });
      }),
    );
    const pages: number[] = [];
    const first = await client().getPage<{ n: number }>('/v1/items');
    for await (const p of first.iterPages()) pages.push(p.page);
    expect(pages).toEqual([1, 2]);
  });

  it('treats a bare array response as a single page', async () => {
    server.use(
      http.get(`${BASE}/v1/events`, () =>
        HttpResponse.json([{ id: 'e1' }, { id: 'e2' }]),
      ),
    );
    const page = await client().getPage<{ id: string }>('/v1/events');
    expect(page.hasNextPage()).toBe(false);
    const ids: string[] = [];
    for await (const item of page) ids.push(item.id);
    expect(ids).toEqual(['e1', 'e2']);
  });

  it('getNextPage throws on the last page (guard with hasNextPage)', async () => {
    server.use(
      http.get(`${BASE}/v1/events`, () =>
        HttpResponse.json({ data: [{ id: 'a' }], total: 1, page: 1, limit: 20 }),
      ),
    );
    const page = await client().getPage<{ id: string }>('/v1/events');
    expect(page.hasNextPage()).toBe(false);
    expect(() => page.getNextPage()).toThrow(RangeError);
  });
});
