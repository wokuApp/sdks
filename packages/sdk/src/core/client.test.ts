import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';

import { WokuClient } from './client';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
  WokuConnectionError,
  WokuError,
  WokuTimeoutError,
} from './errors';

const BASE = 'http://api.test';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const makeClient = (overrides = {}): WokuClient =>
  new WokuClient({
    apiKey: 'sk_test',
    baseURL: BASE,
    maxRetries: 2,
    ...overrides,
  });

describe('WokuClient config', () => {
  it('throws when no api key is provided', () => {
    expect(() => new WokuClient({ baseURL: BASE })).toThrow(WokuError);
  });

  it('accepts a bare string api key via the client too', () => {
    expect(() => new WokuClient({ apiKey: 'sk' })).not.toThrow();
  });
});

describe('WokuClient.request', () => {
  it('sends the auth header + user-agent and returns the parsed body', async () => {
    let seenAuth: string | null = null;
    let seenUa: string | null = null;
    server.use(
      http.get(`${BASE}/v1/thing`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        seenUa = request.headers.get('user-agent');
        return HttpResponse.json({ ok: true });
      }),
    );
    const out = await makeClient().request('get', '/v1/thing');
    expect(out).toEqual({ ok: true });
    expect(seenAuth).toBe('Bearer sk_test');
    expect(seenUa).toContain('woku-sdk-js/');
  });

  it('maps 404 to NotFoundError carrying status, body and request id', async () => {
    server.use(
      http.get(`${BASE}/v1/thing`, () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Nope' },
          { status: 404, headers: { 'x-request-id': 'req_abc' } },
        ),
      ),
    );
    const err = await makeClient({ maxRetries: 0 })
      .request('get', '/v1/thing')
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.status).toBe(404);
    expect(err.requestId).toBe('req_abc');
    expect(err.message).toContain('Nope');
    expect(err.message).toContain('req_abc');
  });

  it('maps 400 to BadRequestError with joined validation messages', async () => {
    server.use(
      http.post(`${BASE}/v1/thing`, () =>
        HttpResponse.json(
          { statusCode: 400, message: ['a is bad', 'b is bad'] },
          { status: 400 },
        ),
      ),
    );
    const err = await makeClient()
      .request('post', '/v1/thing', { body: {} })
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toContain('a is bad, b is bad');
  });

  it('maps 429 to RateLimitError, reading retryAfterSeconds from the Retry-After header', async () => {
    server.use(
      http.get(`${BASE}/v1/thing`, () =>
        HttpResponse.json({}, { status: 429, headers: { 'retry-after': '2' } }),
      ),
    );
    const err = await makeClient({ maxRetries: 0 })
      .request('get', '/v1/thing')
      .catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterSeconds).toBe(2);
  });

  it('falls back to a retryAfter body field when there is no Retry-After header', async () => {
    server.use(
      http.get(`${BASE}/v1/thing`, () =>
        HttpResponse.json({ retryAfter: 5 }, { status: 429 }),
      ),
    );
    const err = await makeClient({ maxRetries: 0 })
      .request('get', '/v1/thing')
      .catch((e) => e);
    expect(err.retryAfterSeconds).toBe(5);
  });

  it('maps every documented status to its typed error subclass', async () => {
    const cases: Array<[number, unknown]> = [
      [401, AuthenticationError],
      [403, PermissionDeniedError],
      [409, ConflictError],
      [422, UnprocessableEntityError],
      [503, InternalServerError],
    ];
    for (const [status, ctor] of cases) {
      server.use(
        http.get(`${BASE}/v1/thing`, () => new HttpResponse(null, { status })),
      );
      const err = await makeClient({ maxRetries: 0 })
        .request('get', '/v1/thing')
        .catch((e) => e);
      expect(err, `status ${status}`).toBeInstanceOf(ctor as never);
      expect(err.status).toBe(status);
    }
  });
});

describe('retries', () => {
  it('retries a GET on 500 and then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/thing`, () => {
        calls += 1;
        if (calls < 3) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ ok: true });
      }),
    );
    const out = await makeClient().request('get', '/v1/thing');
    expect(out).toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it('retries an idempotent create (POST) and sends a stable idempotency key', async () => {
    let calls = 0;
    const keys = new Set<string>();
    server.use(
      http.post(`${BASE}/v1/things`, ({ request }) => {
        calls += 1;
        keys.add(request.headers.get('x-woku-idempotency-key') ?? '');
        if (calls < 2) return new HttpResponse(null, { status: 503 });
        return HttpResponse.json({ _id: 't1' }, { status: 201 });
      }),
    );
    const out = await makeClient().request('post', '/v1/things', {
      body: { name: 'x' },
      idempotent: true,
    });
    expect(out).toEqual({ _id: 't1' });
    expect(calls).toBe(2);
    expect(keys.size).toBe(1); // same key across the retry
    expect([...keys][0]).not.toBe('');
  });

  it('does NOT retry a non-idempotent POST (action) on 500', async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v1/things/send`, () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    await expect(
      makeClient().request('post', '/v1/things/send', { body: {} }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('retries a GET on a network error', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/thing`, () => {
        calls += 1;
        if (calls < 2) return HttpResponse.error();
        return HttpResponse.json({ ok: true });
      }),
    );
    const out = await makeClient().request('get', '/v1/thing');
    expect(out).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('exhausts retries then throws the mapped error (attempts = maxRetries + 1)', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/thing`, () => {
        calls += 1;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    await expect(
      makeClient({ maxRetries: 2 }).request('get', '/v1/thing'),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(calls).toBe(3);
  });
});

describe('headers', () => {
  it('does not let caller headers unset the Authorization bearer', async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/v1/thing`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await makeClient().request('get', '/v1/thing', {
      headers: { Authorization: 'Bearer HIJACK', 'X-Extra': '1' },
    });
    expect(auth).toBe('Bearer sk_test');
  });
});

describe('timeout and abort', () => {
  it('rejects with WokuTimeoutError when the request exceeds the timeout', async () => {
    server.use(
      http.get(`${BASE}/v1/slow`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    await expect(
      makeClient({ timeout: 30, maxRetries: 0 }).request('get', '/v1/slow'),
    ).rejects.toBeInstanceOf(WokuTimeoutError);
  });

  it('rejects with a connection error when the caller aborts', async () => {
    server.use(
      http.get(`${BASE}/v1/slow`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const p = makeClient({ maxRetries: 0 }).request('get', '/v1/slow', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(p).rejects.toBeInstanceOf(WokuConnectionError);
  });

  it('does not retry a caller-aborted GET even with retries enabled', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/slow`, async () => {
        calls += 1;
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const p = makeClient({ maxRetries: 3 }).request('get', '/v1/slow', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(p).rejects.toBeInstanceOf(WokuConnectionError);
    expect(calls).toBe(1);
  });
});
