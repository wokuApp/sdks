import { describe, expect, it, vi } from 'vitest';
import { Woku } from '../woku';
import spec from '../../openapi/openapi-v1.json';

type Call = { url: URL; method: string; body?: unknown };

const client = (
  reply: (call: Call) => { status?: number; body: unknown },
): { calls: Call[]; woku: Woku } => {
  const calls: Call[] = [];
  const fetch = vi.fn(
    async (
      url: string,
      init: { method: string; headers: Record<string, string>; body?: string },
    ) => {
      const call: Call = {
        url: new URL(url),
        method: init.method,
        body: init.body ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      expect(init.headers.Authorization).toBe('Bearer sk_test');
      const { status = 200, body } = reply(call);
      return new Response(
        typeof body === 'string' ? body : JSON.stringify(body),
        { status },
      );
    },
  );
  return {
    calls,
    woku: new Woku({
      apiKey: 'sk_test',
      fetch: fetch as never,
      maxRetries: 0,
    }),
  };
};

const operations = spec.paths as Record<string, Record<string, unknown>>;

const folder = {
  id: 'f1',
  name: 'Post-sale',
  color: null,
  parentFolderId: null,
  path: 'Post-sale',
  origin: null,
  createdAt: null,
  stats: {
    toolCounts: { woku: 0, nps: 1, csat: 0, ces: 0 },
    subfolderCount: 0,
    reviewCount: 3,
  },
};

const cases: [string, string, string, string, (w: Woku) => Promise<unknown>][] =
  [
    [
      'folders.list',
      'GET',
      '/v1/folders',
      '/v1/folders',
      (w) => w.folders.list(),
    ],
    [
      'folders.get',
      'GET',
      '/v1/folders/f1',
      '/v1/folders/{id}',
      (w) => w.folders.get('f1'),
    ],
    [
      'folders.create',
      'POST',
      '/v1/folders',
      '/v1/folders',
      (w) => w.folders.create({ name: 'Post-sale' }),
    ],
    [
      'folders.update',
      'PATCH',
      '/v1/folders/f1',
      '/v1/folders/{id}',
      (w) => w.folders.update('f1', { color: null }),
    ],
    [
      'folders.move',
      'PATCH',
      '/v1/folders/f1/move',
      '/v1/folders/{id}/move',
      (w) => w.folders.move('f1', { parentFolderId: null }),
    ],
    [
      'folders.delete',
      'DELETE',
      '/v1/folders/f1',
      '/v1/folders/{id}',
      (w) => w.folders.delete('f1'),
    ],
    [
      'folders.report',
      'GET',
      '/v1/folders/f1/report',
      '/v1/folders/{id}/report',
      (w) => w.folders.report('f1', { lang: 'es' }),
    ],
    [
      'folders.csv',
      'GET',
      '/v1/folders/f1/csv',
      '/v1/folders/{id}/csv',
      (w) => w.folders.csv('f1'),
    ],
    [
      'tools.stats',
      'GET',
      '/v1/tools/stats',
      '/v1/tools/stats',
      (w) => w.tools.stats({ folderId: 'f1' }),
    ],
    [
      'tools.move',
      'POST',
      '/v1/tools/move',
      '/v1/tools/move',
      (w) =>
        w.tools.move({ items: [{ type: 'csat', id: 't1' }], folderId: null }),
    ],
    [
      'npsTools.move',
      'PATCH',
      '/v1/nps-tools/t1/move',
      '/v1/nps-tools/{id}/move',
      (w) => w.npsTools.move('t1', { folderId: 'f1' }),
    ],
    [
      'csatTools.move',
      'PATCH',
      '/v1/csat-tools/t1/move',
      '/v1/csat-tools/{id}/move',
      (w) => w.csatTools.move('t1', { folderId: null }),
    ],
    [
      'cesTools.move',
      'PATCH',
      '/v1/ces-tools/t1/move',
      '/v1/ces-tools/{id}/move',
      (w) => w.cesTools.move('t1', { folderId: 'f1' }),
    ],
  ];

describe('folders and tools match the public operations', () => {
  it.each(cases)('%s', async (_name, method, path, specPath, invoke) => {
    expect(operations[specPath]?.[method.toLowerCase()]).toBeTruthy();
    const { woku, calls } = client(() => ({
      body: path.endsWith('/csv') ? 'a,b' : {},
    }));
    await invoke(woku);
    expect(calls[0].method).toBe(method);
    expect(calls[0].url.pathname).toBe(path);
  });
});

describe('folders', () => {
  it('lists with filters as query params', async () => {
    const { woku, calls } = client(() => ({ body: [folder] }));
    const result = await woku.folders.list({ parentFolderId: 'p1', q: 'post' });
    expect(result[0].path).toBe('Post-sale');
    expect(calls[0].url.searchParams.get('parentFolderId')).toBe('p1');
    expect(calls[0].url.searchParams.get('q')).toBe('post');
  });

  it('create sends the body and an idempotency key', async () => {
    const seen: string[] = [];
    const fetch = vi.fn(
      async (_u: string, init: { headers: Record<string, string> }) => {
        seen.push(init.headers['X-Woku-Idempotency-Key']);
        return new Response(JSON.stringify(folder), { status: 201 });
      },
    );
    const woku = new Woku({ apiKey: 'sk_test', fetch: fetch as never });
    await woku.folders.create({ name: 'Post-sale', color: '#112233' });
    expect(seen[0]).toBeTruthy();
  });

  it('csv returns the raw text', async () => {
    const { woku } = client(() => ({ body: 'Carpeta,Tipo\nViajes,NPS' }));
    expect(await woku.folders.csv('f1')).toBe('Carpeta,Tipo\nViajes,NPS');
  });
});

describe('tools.list', () => {
  const tool = (id: string): Record<string, unknown> => ({
    type: 'csat',
    id,
    name: id,
    folderId: null,
    createdAt: null,
    reviewCount: 0,
    lastResponseAt: null,
    headline: { kind: 'csat', value: null, scale: '%' },
  });

  it('sends filters and joins types with commas', async () => {
    const { woku, calls } = client(() => ({
      body: { folders: [], tools: [], nextCursor: null, facets: { types: {} } },
    }));
    await woku.tools.list({
      folderId: 'f1',
      types: ['nps', 'csat'],
      q: 'x',
      limit: 10,
    });
    const query = calls[0].url.searchParams;
    expect(query.get('folderId')).toBe('f1');
    expect(query.get('types')).toBe('nps,csat');
    expect(query.get('limit')).toBe('10');
  });

  it('iterates every tool across pages following the cursor', async () => {
    const { woku, calls } = client((call) => {
      const cursor = call.url.searchParams.get('cursor');
      if (!cursor)
        return {
          body: {
            folders: [folder],
            tools: [tool('a'), tool('b')],
            nextCursor: 'c1',
            facets: { types: {} },
          },
        };
      if (cursor === 'c1')
        return {
          body: {
            folders: [],
            tools: [tool('c')],
            nextCursor: null,
            facets: { types: {} },
          },
        };
      throw new Error('unexpected cursor');
    });

    const page = await woku.tools.list();
    expect(page.folders).toHaveLength(1);
    const ids: string[] = [];
    for await (const item of page) ids.push(item.id);

    expect(ids).toEqual(['a', 'b', 'c']);
    expect(calls).toHaveLength(2);
    expect(page.hasNextPage()).toBe(true);
  });

  it('getNextPage throws when there is none', async () => {
    const { woku } = client(() => ({
      body: { folders: [], tools: [], nextCursor: null, facets: { types: {} } },
    }));
    const page = await woku.tools.list();
    expect(() => page.getNextPage()).toThrow(RangeError);
  });
});

describe('tool definitions carry folderId', () => {
  it('create bodies accept folderId in the generated contract', () => {
    const schemas = spec.components.schemas as Record<
      string,
      { properties: Record<string, unknown> }
    >;
    for (const name of [
      'CreateNpsToolBodyDTO',
      'CreateCsatToolBodyDTO',
      'CreateCesToolBodyDTO',
    ])
      expect(schemas[name].properties.folderId).toBeDefined();
  });
});

describe('journey folders', () => {
  it('reads the status and starts the organization', async () => {
    const status = {
      enabled: true,
      enabledAt: '2026-10-11T00:00:00.000Z',
      organizedAt: null,
      organizing: true,
      pending: { journeys: 2, tools: 40 },
    };
    const { woku, calls } = client(() => ({ body: status }));
    expect((await woku.journeyFolders.status()).pending.tools).toBe(40);
    expect((await woku.journeyFolders.organize()).organizing).toBe(true);
    expect(calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      'GET /v1/journey-folders',
      'POST /v1/journey-folders/organize',
    ]);
  });

  it('organize surfaces the 409 of a pass already running', async () => {
    const { woku } = client(() => ({
      status: 409,
      body: { message: 'Already organizing' },
    }));
    await expect(woku.journeyFolders.organize()).rejects.toMatchObject({
      status: 409,
    });
  });

  it('journeys expose folderId and momentFolders', async () => {
    const { woku } = client(() => ({
      body: [
        {
          id: 'j1',
          enabled: true,
          version: 1,
          moments: [],
          folderId: 'f1',
          momentFolders: { sale: 'f2' },
        },
      ],
    }));
    const [journey] = await woku.journeys.list();
    expect(journey.folderId).toBe('f1');
    expect(journey.momentFolders?.sale).toBe('f2');
  });

  it('folders carry their origin', async () => {
    const { woku } = client(() => ({
      body: [{ ...folder, origin: 'journey' }],
    }));
    expect((await woku.folders.list())[0].origin).toBe('journey');
  });
});
