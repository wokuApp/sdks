/**
 * Unit tests for the ambivalent capture service.
 * Tests endpoint selection and payload construction for woku vs nps modes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWokuTextnote,
  createWokuVoicemail,
  createNps,
  createNpsTextnote,
  createNpsVoicemail,
  fetchWokuReview,
  fetchNpsTool,
} from '../../app/services/capture';

const BASE = 'https://clientapi.woku.app';
const PK = 'pk_test_123';

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ ok: true }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Woku endpoint selection
// ---------------------------------------------------------------------------

describe('Woku capture endpoints', () => {
  it('fetchWokuReview calls GET /v1/wokus/:id/review with publishable key', async () => {
    const data = { _id: 'wku1', description: 'Test', imageUrl: '', anonymousDisabled: false };
    vi.stubGlobal('fetch', mockFetch(data));

    const result = await fetchWokuReview(BASE, PK, 'wku1');

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/wokus/wku1/review`);
    expect((opts.headers as Record<string, string>)['x-woku-key']).toBe(PK);
    expect(result._id).toBe('wku1');
  });

  it('createWokuTextnote calls POST /v1/wokus/:id/textnotes with correct payload', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'txn1' }));

    await createWokuTextnote({
      apiBaseUrl: BASE,
      publishableKey: PK,
      wokuId: 'wku1',
      qualification: 4,
      description: 'Great!',
      clientEmail: 'user@test.com',
    });

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/wokus/wku1/textnotes`);
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.qualification).toBe(4);
    expect(body.description).toBe('Great!');
    expect(body.clientEmail).toBe('user@test.com');
    expect(body.anonymous).toBeUndefined();
  });

  it('createWokuTextnote sets anonymous=true when anonymous flag is set', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'txn2' }));

    await createWokuTextnote({
      apiBaseUrl: BASE,
      publishableKey: PK,
      wokuId: 'wku1',
      qualification: 3,
      description: 'Ok',
      anonymous: true,
    });

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.anonymous).toBe(true);
    expect(body.clientEmail).toBeUndefined();
  });

  it('createWokuTextnote sends x-woku-key header', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'txn3' }));

    await createWokuTextnote({
      apiBaseUrl: BASE,
      publishableKey: PK,
      wokuId: 'wku1',
      qualification: 5,
      description: 'Excellent',
    });

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['x-woku-key']).toBe(PK);
  });

  it('createWokuVoicemail calls POST /v1/wokus/:id/voicemails with multipart', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'vm1' }));

    const fakeBlob = new Blob(['audio'], { type: 'audio/mp4' });
    await createWokuVoicemail({
      apiBaseUrl: BASE,
      publishableKey: PK,
      wokuId: 'wku1',
      qualification: 5,
      file: fakeBlob,
    });

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/wokus/wku1/voicemails`);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    // Content-Type must NOT be set manually for multipart (browser sets boundary)
    expect((opts.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// NPS endpoint selection
// ---------------------------------------------------------------------------

describe('NPS capture endpoints', () => {
  it('fetchNpsTool calls GET /v1/nps-tool/:id with publishable key', async () => {
    const data = { _id: 'nps1', question: 'Rate us', companyId: 'c1' };
    vi.stubGlobal('fetch', mockFetch(data));

    const result = await fetchNpsTool(BASE, PK, 'nps1');

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/nps-tool/nps1`);
    expect((opts.headers as Record<string, string>)['x-woku-key']).toBe(PK);
    expect(result._id).toBe('nps1');
  });

  it('createNps calls POST /v1/nps with score and returns npsId', async () => {
    vi.stubGlobal('fetch', mockFetch({ npsId: 'npssub1' }));

    const result = await createNps({
      apiBaseUrl: BASE,
      publishableKey: PK,
      score: 9,
      npsToolId: 'tool1',
    });

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/nps`);
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.score).toBe(9);
    expect(body.npsToolId).toBe('tool1');
    expect(result.npsId).toBe('npssub1');
  });

  it('createNps score 0-10 range — boundary values', async () => {
    for (const score of [0, 5, 10]) {
      vi.stubGlobal('fetch', mockFetch({ npsId: `id${score}` }));

      await createNps({ apiBaseUrl: BASE, publishableKey: PK, score });

      const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(opts.body as string) as Record<string, unknown>;
      expect(body.score).toBe(score);

      vi.restoreAllMocks();
    }
  });

  it('createNps without npsToolId sends company-level NPS (no npsToolId in body)', async () => {
    vi.stubGlobal('fetch', mockFetch({ npsId: 'n1' }));

    await createNps({ apiBaseUrl: BASE, publishableKey: PK, score: 7 });

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.npsToolId).toBeUndefined();
    expect(body.score).toBe(7);
  });

  it('createNps sets anonymous=true when no email provided', async () => {
    vi.stubGlobal('fetch', mockFetch({ npsId: 'n2' }));

    await createNps({ apiBaseUrl: BASE, publishableKey: PK, score: 5 });

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.anonymous).toBe(true);
  });

  it('createNpsTextnote calls POST /v1/nps/:id/textnotes', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true }));

    await createNpsTextnote({
      apiBaseUrl: BASE,
      publishableKey: PK,
      npsId: 'npssub1',
      description: 'Good service',
    });

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/nps/npssub1/textnotes`);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.description).toBe('Good service');
  });

  it('createNpsVoicemail calls POST /v1/nps/:id/voicemails with multipart', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true }));

    const fakeBlob = new Blob(['audio'], { type: 'audio/mp4' });
    await createNpsVoicemail({
      apiBaseUrl: BASE,
      publishableKey: PK,
      npsId: 'npssub1',
      file: fakeBlob,
    });

    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE}/v1/nps/npssub1/voicemails`);
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it('createNpsTextnote sends x-woku-key header', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true }));

    await createNpsTextnote({
      apiBaseUrl: BASE,
      publishableKey: 'pk_abc',
      npsId: 'n1',
      description: 'test',
    });

    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['x-woku-key']).toBe('pk_abc');
  });
});

// ---------------------------------------------------------------------------
// captureType switching — endpoint matrix
// ---------------------------------------------------------------------------

describe('captureType endpoint switching', () => {
  it('woku mode never calls /v1/nps', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'txn1' }));

    await createWokuTextnote({
      apiBaseUrl: BASE,
      publishableKey: PK,
      wokuId: 'wku1',
      qualification: 5,
      description: 'test',
    });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('/v1/wokus/');
    expect(url).not.toContain('/v1/nps');
  });

  it('nps mode never calls /v1/wokus/', async () => {
    vi.stubGlobal('fetch', mockFetch({ npsId: 'n1' }));

    await createNps({ apiBaseUrl: BASE, publishableKey: PK, score: 8 });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe(`${BASE}/v1/nps`);
    expect(url).not.toContain('/v1/wokus/');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  it('throws on non-2xx response from woku textnote', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Not found' }, 404));

    await expect(
      createWokuTextnote({
        apiBaseUrl: BASE,
        publishableKey: PK,
        wokuId: 'bad',
        qualification: 1,
        description: 'x',
      }),
    ).rejects.toThrow('HTTP 404');
  });

  it('throws on non-2xx response from NPS submit', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Unauthorized' }, 401));

    await expect(
      createNps({ apiBaseUrl: BASE, publishableKey: PK, score: 5 }),
    ).rejects.toThrow('HTTP 401');
  });
});
