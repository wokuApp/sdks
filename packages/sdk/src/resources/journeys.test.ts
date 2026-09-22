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
        });
      },
    ),
  );
  expect((await sdk().journeys.mintMomentUrl('j1', 'sale')).url).toBe(
    'http://api.test/test-hook',
  );
  expect(
    (await sdk().journeys.previewMoment('j1', 'sale', { order: 'case1' }))
      .subjectKey,
  ).toBe('case1');
});
