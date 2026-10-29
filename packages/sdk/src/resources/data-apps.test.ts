import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Woku } from '../woku';

const BASE = 'http://api.test';
const server = setupServer();
const sdk = (): Woku =>
  new Woku({ apiKey: 'sk_test', baseURL: BASE, maxRetries: 0 });
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('lists apps and reads one version of an app', async () => {
  server.use(
    http.get(`${BASE}/v1/data-apps`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('limit')).toBe('5');
      return HttpResponse.json({
        data: [{ id: 'a1', title: 'Ranking', kind: 'studio' }],
        total: 1,
        page: 1,
        limit: 5,
        totalPages: 1,
      });
    }),
    http.get(`${BASE}/v1/data-apps/a1`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('version')).toBe('2');
      return HttpResponse.json({
        id: 'a1',
        currentVersion: 3,
        version: { version: 2, stage: 'built', spec: { title: 'Ranking' } },
      });
    }),
  );
  const page = await sdk().dataApps.list({ limit: 5 });
  expect(page.data[0]).toMatchObject({ id: 'a1', kind: 'studio' });
  const app = await sdk().dataApps.get('a1', { version: 2 });
  expect(app.version.version).toBe(2);
});

it('runs queries with filter values and edits with operations', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${BASE}/v1/data-apps/a1/queries`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ monthly: { ok: true, rows: [{ n: 3 }] } });
    }),
    http.post(`${BASE}/v1/data-apps/a1/operations`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ version: 4, issues: [] }, { status: 201 });
    }),
  );
  const results = await sdk().dataApps.runQueries('a1', {
    queries: [{ id: 'monthly' }],
    params: { period: { from: '-30d', to: 'today' } },
  });
  expect(results.monthly).toMatchObject({ ok: true });
  const edited = await sdk().dataApps.edit('a1', {
    baseVersion: 3,
    operations: [{ op: 'setTitle', title: 'Nuevo' }],
  });
  expect(edited.version).toBe(4);
  expect(bodies).toEqual([
    {
      queries: [{ id: 'monthly' }],
      params: { period: { from: '-30d', to: 'today' } },
    },
    { baseVersion: 3, operations: [{ op: 'setTitle', title: 'Nuevo' }] },
  ]);
});

it('builds, restores and publishes versions', async () => {
  const calls: string[] = [];
  server.use(
    http.post(`${BASE}/v1/data-apps/a1/build`, () => {
      calls.push('build');
      return HttpResponse.json({ version: 2 }, { status: 201 });
    }),
    http.post(`${BASE}/v1/data-apps/a1/versions/1/restore`, () => {
      calls.push('restore');
      return HttpResponse.json({ version: 3 }, { status: 201 });
    }),
    http.post(
      `${BASE}/v1/data-apps/a1/versions/3/publish`,
      async ({ request }) => {
        calls.push(`publish ${JSON.stringify(await request.json())}`);
        return HttpResponse.json({
          slug: 'ranking',
          isPublished: true,
          publishedVersion: 3,
        });
      },
    ),
  );
  await sdk().dataApps.build('a1');
  await sdk().dataApps.restore('a1', 1);
  const published = await sdk().dataApps.publish('a1', 3, {
    accessKey: 'clave',
  });
  expect(published.publishedVersion).toBe(3);
  expect(calls).toEqual(['build', 'restore', 'publish {"accessKey":"clave"}']);
});

it('lists the tables of an app and uploads a data file', async () => {
  let uploaded: { name: string; size: number } | null = null;
  server.use(
    http.get(`${BASE}/v1/data-apps/a1/tables`, () =>
      HttpResponse.json({ data: [{ id: 't1', source: 'table:t1' }] }),
    ),
    http.post(`${BASE}/v1/data-apps/a1/tables`, async ({ request }) => {
      const file = (await request.formData()).get('file') as File;
      uploaded = { name: file.name, size: file.size };
      return HttpResponse.json(
        { id: 't1', source: 'table:t1', version: 2, rowCount: 1 },
        { status: 201 },
      );
    }),
  );
  const tables = await sdk().dataApps.listTables('a1');
  expect(tables[0].source).toBe('table:t1');
  const table = await sdk().dataApps.uploadTable('a1', {
    file: new TextEncoder().encode('Meta\n10\n'),
    filename: 'metas.csv',
    contentType: 'text/csv',
  });
  expect(table.version).toBe(2);
  expect(uploaded).toEqual({ name: 'metas.csv', size: 8 });
});

it('copies a component, duplicates and stops sharing', async () => {
  const calls: string[] = [];
  server.use(
    http.post(`${BASE}/v1/data-apps/a1/copy`, async ({ request }) => {
      calls.push(`copy ${JSON.stringify(await request.json())}`);
      return HttpResponse.json({ version: 7, issues: [] }, { status: 201 });
    }),
    http.post(`${BASE}/v1/data-apps/a1/duplicate`, () => {
      calls.push('duplicate');
      return HttpResponse.json(
        { id: 'a2', title: 'Ranking (copia)', currentVersion: 1 },
        { status: 201 },
      );
    }),
    http.post(`${BASE}/v1/data-apps/a2/unpublish`, () => {
      calls.push('unpublish');
      return HttpResponse.json({
        slug: 'a2',
        isPublished: false,
        publishedVersion: null,
      });
    }),
  );
  const copied = await sdk().dataApps.copyFromVersion('a1', {
    fromVersion: 2,
    nodeId: 'chart',
    parent: 'page',
  });
  expect(copied.version).toBe(7);
  const copy = await sdk().dataApps.duplicate('a1');
  expect(copy.id).toBe('a2');
  const stopped = await sdk().dataApps.unpublish('a2');
  expect(stopped.isPublished).toBe(false);
  expect(calls).toEqual([
    'copy {"fromVersion":2,"nodeId":"chart","parent":"page"}',
    'duplicate',
    'unpublish',
  ]);
});
