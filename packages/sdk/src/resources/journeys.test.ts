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

it('preserves the v2 policy and keeps cursor pagination scoped to a journey', async () => {
  let created: unknown;
  server.use(
    http.post(`${BASE}/v1/journeys`, async ({ request }) => {
      created = await request.json();
      return HttpResponse.json({
        id: 'j1',
        authoringVersion: 2,
        startMode: 'response',
        moments: [],
      });
    }),
    http.get(`${BASE}/v1/journeys/j1/enrollments`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('cursor')).toBe('last1');
      return HttpResponse.json({
        items: [{ id: 'entry1' }],
        nextCursor: 'last2',
      });
    }),
  );
  await sdk().journeys.create({
    name: 'Purchase',
    authoringVersion: 2,
    startMode: 'response',
    recipients: {
      ticketEmails: ['a@example.com'],
      planMembers: [{ userId: '507f1f77bcf86cd799439011', role: 'admin' }],
    },
  });
  expect(created).toMatchObject({
    authoringVersion: 2,
    startMode: 'response',
    recipients: {
      planMembers: [{ userId: '507f1f77bcf86cd799439011', role: 'admin' }],
    },
  });
  expect(
    (await sdk().journeys.listEnrollments('j1', { cursor: 'last1', limit: 20 }))
      .nextCursor,
  ).toBe('last2');
});

it('stops exactly one participation and forwards the caller idempotency key', async () => {
  server.use(
    http.post(
      `${BASE}/v1/journeys/j1/enrollments/entry1/stop`,
      async ({ request }) => {
        expect(await request.json()).toEqual({ reason: 'Purchase cancelled' });
        expect(request.headers.get('x-woku-idempotency-key')).toBe(
          'stop-case1',
        );
        return HttpResponse.json({ id: 'entry1', lifecycle: 'stopped' });
      },
    ),
  );
  expect(
    (
      await sdk().journeys.stopEnrollment(
        'j1',
        'entry1',
        { reason: 'Purchase cancelled' },
        { idempotencyKey: 'stop-case1' },
      )
    ).lifecycle,
  ).toBe('stopped');
});

it('generates a URL for one moment and tests mapping without sending', async () => {
  server.use(
    http.post(`${BASE}/v1/journeys/j1/moments/sale/url-token`, () =>
      HttpResponse.json({ token: 'test', url: '/test-hook' }),
    ),
    http.post(
      `${BASE}/v1/journeys/j1/moments/sale/preview`,
      async ({ request }) => {
        expect(await request.json()).toEqual({ payload: { order: 'case1' } });
        return HttpResponse.json({
          matches: true,
          subjectKey: 'case1',
          contact: {},
          preview: {
            title: 'Late delivery',
            imageUrl: 'https://cdn.example/image.webp',
            trackers: [{ name: 'Order', value: 'order1' }],
            clientFields: { tier: 'gold' },
            folder: { secondaryKey: 'order1', name: 'Orders' },
          },
        });
      },
    ),
  );
  expect((await sdk().journeys.mintMomentUrl('j1', 'sale')).url).toBe(
    'http://api.test/test-hook',
  );
  const preview = await sdk().journeys.previewMoment('j1', 'sale', {
    order: 'case1',
  });
  expect(preview.subjectKey).toBe('case1');
  expect(preview.preview?.folder?.secondaryKey).toBe('order1');
  expect(preview.preview?.clientFields.tier).toBe('gold');
});

it('prepares customer entry without enrolling and preserves its response capability', async () => {
  server.use(
    http.get(`${BASE}/v1/journey-entries/j1`, () =>
      HttpResponse.json({
        name: 'Purchase',
        tool: 'csat',
        requiresReference: true,
      }),
    ),
    http.post(`${BASE}/v1/journey-entries/j1`, async ({ request }) => {
      expect(await request.json()).toEqual({
        requestId: '07c19e38-5cf4-4ef5-9e26-88802610c510',
        email: 'client@example.com',
        reference: 'order1',
      });
      return HttpResponse.json({
        companyId: 'c1',
        tool: 'csat',
        toolId: 't1',
        token: 'jent_test',
        subjectKey: 'client@example.com',
      });
    }),
  );
  expect((await sdk().journeys.entryInfo('j1')).requiresReference).toBe(true);
  const entry = await sdk().journeys.prepareEntry('j1', {
    requestId: '07c19e38-5cf4-4ef5-9e26-88802610c510',
    email: 'client@example.com',
    reference: 'order1',
  });
  expect(entry.token).toBe('jent_test');
  expect(entry.toolId).toBe('t1');
});

it('iterates cursor pages lazily and advances past an initial query override', async () => {
  const requested: string[] = [];
  server.use(
    http.get(`${BASE}/v1/journeys/j1/enrollments`, ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
      requested.push(cursor);
      return HttpResponse.json({
        items: [{ id: cursor || 'first' }],
        nextCursor: cursor === 'second' ? null : 'second',
      });
    }),
  );
  const results: string[] = [];
  for await (const enrollment of sdk().journeys.iterEnrollments(
    'j1',
    {},
    { query: { cursor: 'initial' } },
  ))
    results.push(enrollment.id);
  expect(results).toEqual(['initial', 'second']);
  expect(requested).toEqual(['initial', 'second']);
});

it('rejects a repeated enrollment cursor rather than looping forever', async () => {
  server.use(
    http.get(`${BASE}/v1/journeys/j1/enrollments`, () =>
      HttpResponse.json({ items: [], nextCursor: 'same' }),
    ),
  );
  const iterator = sdk().journeys.iterEnrollments('j1');
  await expect(iterator.next()).rejects.toMatchObject({
    code: 'pagination_error',
  });
});
