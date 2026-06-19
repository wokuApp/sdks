import { describe, expect, it, vi } from 'vitest';

import { WokuClient } from './client';
import {
  WokuConfigError,
  WokuNetworkError,
  WokuQuarantineError,
} from './errors';
import type { HttpClient, HttpResponse } from './adapters';
import type { CaptureSubmission } from './types';

const submission: CaptureSubmission = {
  id: 'cap_1',
  kind: 'nps',
  companyId: 'c1',
  targetId: 'nps1',
  score: 9,
  createdAt: 0,
};

const mkResponse = (over: Partial<HttpResponse>): HttpResponse => ({
  status: 200,
  ok: true,
  json: async () => ({}),
  headers: { get: () => null },
  ...over,
});

const mkClient = (http: HttpClient): WokuClient =>
  new WokuClient({
    apiUrl: 'https://api.woku.app/',
    publicKey: 'pk_test',
    companyId: 'c1',
    http,
  });

describe('WokuClient', () => {
  it('validates required config', () => {
    expect(
      () => new WokuClient({ apiUrl: '', publicKey: 'x', companyId: 'c' }),
    ).toThrow(WokuConfigError);
  });

  it('POSTs to the capture endpoint with auth + idempotency headers', async () => {
    const request = vi.fn(async () =>
      mkResponse({ json: async () => ({ id: 'remote_1' }) }),
    );
    const result = await mkClient({ request }).send(submission);
    const req = request.mock.calls[0][0];
    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.woku.app/v1/captures');
    expect(req.headers.Authorization).toBe('Bearer pk_test');
    expect(req.headers['X-Woku-Company']).toBe('c1');
    expect(req.headers['X-Woku-Idempotency-Key']).toBe('cap_1');
    expect(JSON.parse(req.body as string).score).toBe(9);
    expect(result).toEqual({
      id: 'cap_1',
      status: 'sent',
      remoteId: 'remote_1',
    });
  });

  it('throws WokuQuarantineError on 429 with Retry-After', async () => {
    const request = vi.fn(async () =>
      mkResponse({
        status: 429,
        ok: false,
        headers: { get: (n) => (n === 'Retry-After' ? '120' : null) },
      }),
    );
    await expect(mkClient({ request }).send(submission)).rejects.toMatchObject({
      code: 'quarantine_blocked',
      retryAfterSeconds: 120,
    });
    await expect(mkClient({ request }).send(submission)).rejects.toBeInstanceOf(
      WokuQuarantineError,
    );
  });

  it('wraps transport failures as WokuNetworkError', async () => {
    const request = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(mkClient({ request }).send(submission)).rejects.toBeInstanceOf(
      WokuNetworkError,
    );
  });

  it('returns a failed result on other non-2xx responses', async () => {
    const request = vi.fn(async () =>
      mkResponse({
        status: 400,
        ok: false,
        json: async () => ({ message: 'bad rating' }),
      }),
    );
    const result = await mkClient({ request }).send(submission);
    expect(result).toEqual({
      id: 'cap_1',
      status: 'failed',
      error: 'bad rating',
    });
  });
});
