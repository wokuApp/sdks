import { describe, expect, it, vi } from 'vitest';

import { WokuSdk } from './sdk';
import {
  InMemoryStorage,
  type HttpClient,
  type HttpResponse,
} from './adapters';
import { WokuValidationError } from './errors';

const ok: HttpResponse = {
  status: 200,
  ok: true,
  json: async () => ({ id: 'remote_1' }),
  headers: { get: () => null },
};

const quarantined: HttpResponse = {
  status: 429,
  ok: false,
  json: async () => ({}),
  headers: { get: (n) => (n === 'Retry-After' ? '60' : null) },
};

const mkSdk = (http: HttpClient): WokuSdk =>
  new WokuSdk({
    apiUrl: 'https://api.woku.app',
    publicKey: 'pk_test',
    companyId: 'c1',
    http,
    storage: new InMemoryStorage(),
  });

describe('WokuSdk', () => {
  it('rejects an out-of-range rating', async () => {
    const sdk = mkSdk({ request: vi.fn() });
    await expect(
      sdk.captureWoku({ wokuId: 'w1', rating: 9 }),
    ).rejects.toBeInstanceOf(WokuValidationError);
  });

  it('rejects an out-of-range nps score', async () => {
    const sdk = mkSdk({ request: vi.fn() });
    await expect(
      sdk.captureNps({ npsId: 'n1', score: 11 }),
    ).rejects.toBeInstanceOf(WokuValidationError);
  });

  it('sends a valid capture immediately and does not queue it', async () => {
    const sdk = mkSdk({ request: vi.fn(async () => ok) });
    const result = await sdk.captureNps({ npsId: 'n1', score: 9 });
    expect(result.status).toBe('sent');
    expect(await sdk.pendingCount()).toBe(0);
  });

  it('queues a capture when the device is offline', async () => {
    const sdk = mkSdk({
      request: vi.fn(async () => {
        throw new Error('offline');
      }),
    });
    const result = await sdk.captureWoku({ wokuId: 'w1', rating: 4 });
    expect(result.status).toBe('queued');
    expect(await sdk.pendingCount()).toBe(1);
  });

  it('marks a capture quarantined but still queues it', async () => {
    const sdk = mkSdk({ request: vi.fn(async () => quarantined) });
    const result = await sdk.captureNps({ npsId: 'n1', score: 2 });
    expect(result.status).toBe('quarantined');
    expect(await sdk.pendingCount()).toBe(1);
  });

  it('flushes queued captures once connectivity returns', async () => {
    let online = false;
    const request = vi.fn(async () => {
      if (!online) throw new Error('offline');
      return ok;
    });
    const sdk = mkSdk({ request });
    await sdk.captureNps({ npsId: 'n1', score: 8 });
    expect(await sdk.pendingCount()).toBe(1);

    online = true;
    const res = await sdk.flush();
    expect(res.sent).toBe(1);
    expect(await sdk.pendingCount()).toBe(0);
  });
});

it('captures CSAT and CES with the journey token and correct 1-5 score semantics', async () => {
  const requests: unknown[] = [];
  const sdk = mkSdk({
    request: vi.fn(async (req) => {
      requests.push(JSON.parse(req.body as string));
      return ok;
    }),
  });
  await sdk.captureCsat({
    csatId: 'csat1',
    score: 5,
    dispatchToken: 'jent_test',
    respondent: { phone: '56912345678' },
  });
  await sdk.captureCes({
    cesId: 'ces1',
    score: 4,
    dispatchToken: 'jent_test',
    respondent: { email: 'client@example.com' },
  });
  expect(requests).toMatchObject([
    { kind: 'csat', targetId: 'csat1', score: 5, dispatchToken: 'jent_test' },
    { kind: 'ces', targetId: 'ces1', score: 4 },
  ]);
  await expect(
    sdk.captureCes({ cesId: 'ces1', score: 0 }),
  ).rejects.toBeInstanceOf(WokuValidationError);
});

it('keeps a rejected capture available for inspection without replaying its permanent error', async () => {
  const request = vi.fn(async () => ({
    ...ok,
    ok: false,
    status: 400,
    json: async () => ({ message: 'Invalid contact' }),
  }));
  const sdk = mkSdk({ request });
  expect((await sdk.captureNps({ npsId: 'n1', score: 8 })).status).toBe(
    'failed',
  );
  expect(await sdk.pendingCount()).toBe(0);
  expect(await sdk.failedCaptures()).toHaveLength(1);
  await sdk.flush();
  expect(request).toHaveBeenCalledTimes(1);
});
