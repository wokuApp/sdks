import { describe, expect, it, vi } from 'vitest';

import { WokuSdk } from './sdk';
import {
  InMemoryStorage,
  type HttpClient,
  type HttpRequest,
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

it('returns confirmed delivery even when local acknowledgement persistence fails', async () => {
  const memory = new InMemoryStorage();
  let writes = 0;
  const storage = {
    getItem: memory.getItem.bind(memory),
    removeItem: memory.removeItem.bind(memory),
    setItem: (key: string, value: string) => {
      if (++writes === 2)
        throw new Error('Storage write failed after acceptance');
      memory.setItem(key, value);
    },
  };
  const request = vi.fn(async (_req: HttpRequest) => ({
    ...ok,
    json: async () => ({ remoteId: 'accepted-response' }),
  }));
  const sdk = new WokuSdk({
    apiUrl: 'https://api.test',
    publicKey: 'pk_test',
    companyId: 'c1',
    storage,
    http: { request },
  });
  const result = await sdk.captureCsat({ csatId: 'csat1', score: 5 });
  expect(result).toMatchObject({
    status: 'sent',
    remoteId: 'accepted-response',
  });
  expect(await sdk.pendingCount()).toBe(1);
  await sdk.flush();
  const bodies = request.mock.calls.map(([req]) =>
    JSON.parse(req.body as string),
  );
  expect(bodies[1].id).toBe(bodies[0].id);
  expect(await sdk.pendingCount()).toBe(0);
});

it.each(['woku', 'nps', 'csat', 'ces'] as const)(
  'declares standalone by default and preserves explicit flow for %s',
  async (kind) => {
    const request = vi.fn(async (_req: HttpRequest) => ok);
    const sdk = mkSdk({ request });
    const capture = (context: {
      collectionKind?: 'standalone' | 'flow';
      flowId?: string;
    }): ReturnType<WokuSdk['captureNps']> => {
      switch (kind) {
        case 'woku':
          return sdk.captureWoku({ wokuId: 'w1', rating: 2, ...context });
        case 'nps':
          return sdk.captureNps({ npsId: 'n1', score: 2, ...context });
        case 'csat':
          return sdk.captureCsat({ csatId: 's1', score: 2, ...context });
        case 'ces':
          return sdk.captureCes({ cesId: 'e1', score: 2, ...context });
      }
    };
    await capture({});
    await capture({ collectionKind: 'flow', flowId: 'f1' });
    expect(JSON.parse(request.mock.calls[0]![0].body as string)).toMatchObject({
      collectionKind: 'standalone',
    });
    expect(JSON.parse(request.mock.calls[1]![0].body as string)).toMatchObject({
      collectionKind: 'flow',
      flowId: 'f1',
    });
  },
);

it.each([false, true])(
  'replays the same flow payload and id after restart, audio=%s',
  async (audio) => {
    const storage = new InMemoryStorage();
    const request = vi.fn(async (_req: HttpRequest) => {
      throw new Error('offline');
    });
    const config = {
      apiUrl: 'https://api.woku.app',
      publicKey: 'pk_test',
      companyId: 'c1',
      storage,
      http: { request },
    };
    await new WokuSdk(config).captureNps({
      score: 2,
      collectionKind: 'flow',
      flowId: 'f1',
      ...(audio
        ? { audio: { uri: 'file://a.m4a', mimeType: 'audio/m4a' } }
        : {}),
    });
    const original = request.mock.calls[0]![0];
    const replay = vi.fn(async (_req: HttpRequest) => ok);
    const restarted = new WokuSdk({
      ...config,
      language: 'en',
      http: { request: replay },
    });
    await Promise.all([restarted.flush(), restarted.flush()]);
    expect(replay).toHaveBeenCalledTimes(1);
    const sent = replay.mock.calls[0]![0];
    const payload = (req: HttpRequest): string | FormDataEntryValue | null =>
      typeof req.body === 'string'
        ? req.body
        : (req.body as FormData).get('payload');
    expect(payload(sent)).toBe(payload(original));
    expect(sent.headers['X-Woku-Idempotency-Key']).toBe(
      original.headers['X-Woku-Idempotency-Key'],
    );
    expect(JSON.parse(payload(sent) as string)).toMatchObject({
      collectionKind: 'flow',
      flowId: 'f1',
    });
  },
);

it.each([false, true])(
  'preserves legacy queued bodies without inventing provenance or language, audio=%s',
  async (audio) => {
    const storage = new InMemoryStorage();
    const original = {
      id: 'old-capture',
      legacyContext: { source: 'older-package' },
      kind: 'nps',
      companyId: 'c1',
      score: 2,
      createdAt: Date.now(),
      ...(audio
        ? { audio: { uri: 'file://a.m4a', mimeType: 'audio/m4a' } }
        : {}),
    };
    await storage.setItem(
      'woku.sdk.queue.v1',
      JSON.stringify([{ submission: original, attempts: 1 }]),
    );
    const request = vi.fn(async (_req: HttpRequest) => ok);
    await new WokuSdk({
      apiUrl: 'https://api.woku.app',
      publicKey: 'pk_test',
      companyId: 'c1',
      storage,
      language: 'en',
      http: { request },
    }).flush();
    const req = request.mock.calls[0]![0];
    const payload =
      typeof req.body === 'string'
        ? req.body
        : (req.body as FormData).get('payload');
    expect(JSON.parse(payload as string)).toEqual(original);
    expect(req.headers['X-Woku-Idempotency-Key']).toBe('old-capture');
  },
);
