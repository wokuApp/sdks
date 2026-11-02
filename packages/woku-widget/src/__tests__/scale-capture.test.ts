/**
 * CES and CSAT capture: 1-5 score tools whose question comes from the tool.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createScaleResponse,
  createScaleTextnote,
  fetchScaleTool,
} from '../../app/services/capture';

const BASE = 'https://clientapi.woku.app';
const PK = 'pk_test_123';

const mockFetch = (data: unknown, status = 200) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);

const lastCall = () => {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1] as [string, RequestInit];
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchScaleTool', () => {
  it('reads a CES tool definition in the requested language with the publishable key', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ _id: 'c1', question: 'How easy?', action: 'start' }),
    );
    const tool = await fetchScaleTool('ces', BASE, PK, 'c1', 'en');
    const [url, opts] = lastCall();
    expect(url).toBe(`${BASE}/v1/ces-tool/c1?lang=en`);
    expect((opts.headers as Record<string, string>)['x-woku-key']).toBe(PK);
    expect(tool.question).toBe('How easy?');
  });

  it('reads a CSAT tool definition', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ _id: 's1', question: 'How satisfied?' }),
    );
    await fetchScaleTool('csat', BASE, PK, 's1', undefined);
    expect(lastCall()[0]).toBe(`${BASE}/v1/csat-tool/s1`);
  });
});

describe('createScaleResponse', () => {
  it('posts an identified CES score and returns the response id', async () => {
    vi.stubGlobal('fetch', mockFetch({ cesId: 'r1' }));
    const id = await createScaleResponse({
      kind: 'ces',
      apiBaseUrl: BASE,
      publishableKey: PK,
      toolId: 'c1',
      score: 4,
      clientEmail: 'ana@acme.com',
    });
    const [url, opts] = lastCall();
    expect(url).toBe(`${BASE}/v1/ces`);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(String(opts.body))).toEqual({
      cesToolId: 'c1',
      score: 4,
      clientEmail: 'ana@acme.com',
      responseChannel: 'widget-web',
      collectionKind: 'standalone',
    });
    expect(id).toBe('r1');
  });

  it('posts a CSAT score anonymously when there is no contact', async () => {
    vi.stubGlobal('fetch', mockFetch({ csatId: 'r2' }));
    const id = await createScaleResponse({
      kind: 'csat',
      apiBaseUrl: BASE,
      publishableKey: PK,
      toolId: 's1',
      score: 5,
    });
    const [url, opts] = lastCall();
    expect(url).toBe(`${BASE}/v1/csat`);
    expect(JSON.parse(String(opts.body))).toEqual(
      expect.objectContaining({ csatToolId: 's1', score: 5, anonymous: true }),
    );
    expect(id).toBe('r2');
  });

  it('carries the dispatch token when there is one', async () => {
    vi.stubGlobal('fetch', mockFetch({ cesId: 'r3' }));
    await createScaleResponse({
      kind: 'ces',
      apiBaseUrl: BASE,
      publishableKey: PK,
      toolId: 'c1',
      score: 2,
      clientEmail: 'ana@acme.com',
      dispatchToken: 'tok',
    });
    expect(JSON.parse(String(lastCall()[1].body)).dispatchToken).toBe('tok');
  });

  it('surfaces an API error', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'nope' }, 403));
    await expect(
      createScaleResponse({
        kind: 'ces',
        apiBaseUrl: BASE,
        publishableKey: PK,
        toolId: 'c1',
        score: 3,
      }),
    ).rejects.toThrow('HTTP 403');
  });
});

describe('createScaleTextnote', () => {
  it('adds the optional comment to the response', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true }));
    await createScaleTextnote({
      kind: 'csat',
      apiBaseUrl: BASE,
      publishableKey: PK,
      responseId: 'r2',
      description: 'Great demo',
    });
    const [url, opts] = lastCall();
    expect(url).toBe(`${BASE}/v1/csat/r2/textnotes`);
    expect(JSON.parse(String(opts.body))).toEqual({
      description: 'Great demo',
    });
  });
});
