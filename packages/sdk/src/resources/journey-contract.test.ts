import { expect, it, vi } from 'vitest';
import { Woku } from '../woku';
import type { Journeys } from './journeys';
import spec from '../../openapi/openapi-v1.json';

// Exercise the public facade against each documented HTTP operation.
const cases: [
  string,
  string,
  string,
  boolean,
  (j: Journeys) => Promise<unknown>,
][] = [
  ['list', 'GET', '/v1/journeys', false, (j) => j.list()],
  ['get', 'GET', '/v1/journeys/j1', false, (j) => j.get('j1')],
  ['create', 'POST', '/v1/journeys', true, (j) => j.create({ name: 'Hybrid' })],
  [
    'update',
    'PATCH',
    '/v1/journeys/j1',
    false,
    (j) => j.update('j1', { enabled: false }),
  ],
  ['delete', 'DELETE', '/v1/journeys/j1', false, (j) => j.delete('j1')],
  [
    'rotate',
    'POST',
    '/v1/journeys/j1/webhook-secret',
    false,
    (j) => j.rotateWebhookSecret('j1'),
  ],
  [
    'enroll',
    'POST',
    '/v1/journeys/j1/enrollments',
    true,
    (j) =>
      j.enroll('j1', {
        email: 'client@example.com',
        metadata: { tier: 'gold' },
      }),
  ],
  [
    'listEnrollments',
    'GET',
    '/v1/journeys/j1/enrollments',
    false,
    (j) => j.listEnrollments('j1', { limit: 50 }),
  ],
  [
    'getEnrollment',
    'GET',
    '/v1/journeys/j1/enrollments/e1',
    false,
    (j) => j.getEnrollment('j1', 'e1'),
  ],
  [
    'stop',
    'POST',
    '/v1/journeys/j1/enrollments/e1/stop',
    true,
    (j) => j.stopEnrollment('j1', 'e1', { reason: 'Cancelled' }),
  ],
  [
    'connections',
    'GET',
    '/v1/journeys/j1/connections',
    false,
    (j) => j.connections('j1'),
  ],
  [
    'url',
    'POST',
    '/v1/journeys/j1/moments/sale/url-token',
    true,
    (j) => j.mintMomentUrl('j1', 'sale'),
  ],
  [
    'sender',
    'POST',
    '/v1/journeys/j1/moments/sale/sender-secret',
    false,
    (j) => j.setSenderSecret('j1', 'sale', 'sender-secret-test'),
  ],
  [
    'preview',
    'POST',
    '/v1/journeys/j1/moments/sale/preview',
    false,
    (j) => j.previewMoment('j1', 'sale', { late: true }),
  ],
  [
    'emit',
    'POST',
    '/v1/journey-events',
    true,
    (j) =>
      j.emitEvent({
        name: 'delivery',
        subjectKey: 'case',
        metadata: { late: true },
      }),
  ],
  ['entry', 'GET', '/v1/journey-entries/j1', false, (j) => j.entryInfo('j1')],
  [
    'prepare',
    'POST',
    '/v1/journey-entries/j1',
    false,
    (j) =>
      j.prepareEntry('j1', {
        email: 'client@example.com',
        requestId: 'request',
      }),
  ],
];

it.each(cases)(
  '%s matches the public operation and retries only protected writes',
  async (_name, method, path, protectedWrite, invoke) => {
    const pattern = path
      .replace(/\/j1(?=\/|$)/g, '/{id}')
      .replace('/e1', '/{enrollmentId}')
      .replace('/sale', '/{stageKey}')
      .replace('/v1/journey-entries/{id}', '/v1/journey-entries/{journeyId}');
    expect(
      (spec.paths as Record<string, Record<string, unknown>>)[pattern]?.[
        method.toLowerCase()
      ],
    ).toBeTruthy();
    const keys: (string | undefined)[] = [];
    const fetch = vi.fn(
      async (
        url: string,
        init: { method: string; headers: Record<string, string> },
      ) => {
        expect(new URL(url).pathname).toBe(path);
        expect(init.method).toBe(method);
        expect(init.headers.Authorization).toBe('Bearer sk_test');
        keys.push(init.headers['X-Woku-Idempotency-Key']);
        const attempt = keys.length;
        return {
          status: attempt === 1 ? 503 : 200,
          headers: { get: () => '0' },
          text: async () =>
            JSON.stringify({ url: '/hook', id: 'j1', items: [] }),
        };
      },
    );
    const sdk = new Woku({
      apiKey: 'sk_test',
      baseURL: 'https://api.test',
      fetch,
      maxRetries: 1,
    });
    const promise = invoke(sdk.journeys);
    if (method === 'GET' || protectedWrite) {
      await promise;
      expect(fetch).toHaveBeenCalledTimes(2);
      if (protectedWrite) expect(keys[0]).toBeTruthy();
      expect(keys[1]).toBe(keys[0]);
    } else {
      await expect(promise).rejects.toMatchObject({ status: 503 });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  },
);

it('encodes external identifiers as individual path segments', async () => {
  const fetch = vi.fn(async (url: string) => {
    expect(url).toBe(
      'https://api.test/v1/journeys/order%2Fa%3Fq%3D1/moments/sale%23one/preview',
    );
    return {
      status: 200,
      headers: { get: () => null },
      text: async () => '{}',
    };
  });
  await new Woku({
    apiKey: 'sk_test',
    baseURL: 'https://api.test',
    fetch,
  }).journeys.previewMoment('order/a?q=1', 'sale#one', {});
});
