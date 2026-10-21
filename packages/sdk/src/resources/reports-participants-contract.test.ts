import { describe, expect, it, vi } from 'vitest';
import { Woku } from '../woku';
import spec from '../../openapi/openapi-v1.json';

type Call = { url: URL; method: string; body?: unknown };

const client = (body: unknown = {}): { calls: Call[]; woku: Woku } => {
  const calls: Call[] = [];
  const fetch = vi.fn(
    async (url: string, init: { method: string; body?: string }) => {
      calls.push({
        url: new URL(url),
        method: init.method,
        body: init.body ? JSON.parse(init.body) : undefined,
      });
      return new Response(
        typeof body === 'string' ? body : JSON.stringify(body),
        { status: 200 },
      );
    },
  );
  return {
    calls,
    woku: new Woku({ apiKey: 'sk_test', fetch: fetch as never, maxRetries: 0 }),
  };
};

const operations = spec.paths as Record<string, Record<string, unknown>>;

const cases: [string, string, string, string, (w: Woku) => Promise<unknown>][] =
  [
    [
      'reportSubscriptions.list',
      'GET',
      '/v1/report-subscriptions',
      '/v1/report-subscriptions',
      (w) => w.reportSubscriptions.list({ scopeType: 'nps', scopeId: 'n1' }),
    ],
    [
      'reportSubscriptions.create',
      'POST',
      '/v1/report-subscriptions',
      '/v1/report-subscriptions',
      (w) =>
        w.reportSubscriptions.create({
          scopeType: 'folder',
          scopeId: 'f1',
          frequency: 'monthly',
          recipients: ['ana@acme.cl'],
          includeCsv: true,
        }),
    ],
    [
      'reportSubscriptions.update',
      'PATCH',
      '/v1/report-subscriptions/s1',
      '/v1/report-subscriptions/{id}',
      (w) => w.reportSubscriptions.update('s1', { active: false }),
    ],
    [
      'reportSubscriptions.delete',
      'DELETE',
      '/v1/report-subscriptions/s1',
      '/v1/report-subscriptions/{id}',
      (w) => w.reportSubscriptions.delete('s1'),
    ],
    [
      'reportSubscriptions.send',
      'POST',
      '/v1/report-subscriptions/s1/send',
      '/v1/report-subscriptions/{id}/send',
      (w) => w.reportSubscriptions.send('s1'),
    ],
    [
      'folderParticipants.get',
      'GET',
      '/v1/folders/f1/participants',
      '/v1/folders/{id}/participants',
      (w) => w.folderParticipants.get('f1'),
    ],
    [
      'folderParticipants.replace',
      'PUT',
      '/v1/folders/f1/participants',
      '/v1/folders/{id}/participants',
      (w) => w.folderParticipants.replace('f1', 'Ana, ana@acme.cl'),
    ],
    [
      'folderParticipants.add',
      'POST',
      '/v1/folders/f1/participants',
      '/v1/folders/{id}/participants',
      (w) => w.folderParticipants.add('f1', 'bo@acme.cl'),
    ],
    [
      'folderParticipants.remove',
      'DELETE',
      '/v1/folders/f1/participants/p1',
      '/v1/folders/{id}/participants/{participantId}',
      (w) => w.folderParticipants.remove('f1', 'p1'),
    ],
    [
      'folderParticipants.clear',
      'DELETE',
      '/v1/folders/f1/participants',
      '/v1/folders/{id}/participants',
      (w) => w.folderParticipants.clear('f1'),
    ],
    [
      'folderParticipants.resendToMissing',
      'POST',
      '/v1/folders/f1/participants/resend',
      '/v1/folders/{id}/participants/resend',
      (w) =>
        w.folderParticipants.resendToMissing('f1', {
          toolType: 'nps',
          toolId: 'n1',
          channel: 'email',
        }),
    ],
  ];

describe('scheduled reports and participants match the public operations', () => {
  it.each(cases)('%s', async (_name, method, path, specPath, invoke) => {
    expect(operations[specPath]?.[method.toLowerCase()]).toBeTruthy();
    const { woku, calls } = client();
    await invoke(woku);
    expect(calls[0].method).toBe(method);
    expect(calls[0].url.pathname).toBe(path);
  });
});

describe('bodies and queries', () => {
  it('participants travel as the text body', async () => {
    const { woku, calls } = client({
      count: 1,
      total: 1,
      invalidLines: [],
      duplicates: 0,
    });
    await woku.folderParticipants.add('f1', 'Ana, ana@acme.cl');
    expect(calls[0].body).toEqual({ text: 'Ana, ana@acme.cl' });
  });

  it('a one-off schedule sends its period and date', async () => {
    const { woku, calls } = client({ id: 's1' });
    await woku.reportSubscriptions.create({
      scopeType: 'csat',
      scopeId: 'c1',
      frequency: 'once',
      recipients: ['ana@acme.cl'],
      sendAt: '2026-11-02T12:00:00.000Z',
      periodFrom: '2026-10-01T00:00:00.000Z',
      periodTo: '2026-11-01T00:00:00.000Z',
    });
    expect(calls[0].body).toMatchObject({
      frequency: 'once',
      sendAt: '2026-11-02T12:00:00.000Z',
    });
  });

  it('the folder CSV takes a period', async () => {
    const { woku, calls } = client('a,b');
    await woku.folders.csv('f1', {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
    });
    expect(calls[0].url.searchParams.get('from')).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(calls[0].url.searchParams.get('to')).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('tools sort by the latest response', async () => {
    const { woku, calls } = client({
      folders: [],
      tools: [],
      facets: {},
      nextCursor: null,
    });
    await woku.tools.list({ sort: '-lastResponse' });
    expect(calls[0].url.searchParams.get('sort')).toBe('-lastResponse');
  });
});
