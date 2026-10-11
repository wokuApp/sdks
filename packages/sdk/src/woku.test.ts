import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { Woku } from './woku';
import type { CustomTicketDestinationConfig } from './types';
import type {
  FollowUpAttachment,
  FollowUpCitation,
  FollowUpConversation,
  FollowUpLine,
  FollowUpMessagePhase,
} from './models';
import fixtures from './fixtures/follow-up.json';

const BASE = 'http://api.test';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const woku = (): Woku => new Woku({ apiKey: 'sk_test', baseURL: BASE });

describe('Woku facade — request shaping', () => {
  it('creates moment-owned tools with scope and question variables', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v1/journeys`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'j1' });
      }),
    );
    const moment = {
      key: 'sale',
      name: 'Sale',
      tool: 'csat' as const,
      toolScope: 'shared' as const,
      toolSpec: { subject: { en: 'your purchase' } },
      enabled: true,
      channel: 'email' as const,
      trigger: { type: 'manual' as const },
      sequence: {
        attemptOffsetsMs: [0],
        deadlineMs: 86400000,
        cooldownAfterResponseMs: 0,
      },
    };
    await woku().journeys.create({ name: 'Sales', moments: [moment] });
    expect(body).toEqual({ name: 'Sales', moments: [moment] });
    expect((body as { moments: unknown[] }).moments[0]).not.toHaveProperty(
      'toolRef',
    );
  });

  it('trackers.create posts to /v1/external-trackers with an idempotency key', async () => {
    let key: string | null = null;
    let body: unknown;
    server.use(
      http.post(`${BASE}/v1/external-trackers`, async ({ request }) => {
        key = request.headers.get('x-woku-idempotency-key');
        body = await request.json();
        return HttpResponse.json({
          _id: 'trk1',
          name: 'Store',
          system: 'retail',
        });
      }),
    );
    const tracker = await woku().trackers.create({
      name: 'Store',
      system: 'retail',
    });
    expect(tracker._id).toBe('trk1');
    expect(body).toEqual({ name: 'Store', system: 'retail' });
    expect(key).toBeTruthy();
  });

  it('trackers.assignToWoku upserts once without claiming unsupported replay protection', async () => {
    let key: string | null = null;
    let body: unknown;
    server.use(
      http.post(
        `${BASE}/v1/external-trackers/wokus/w1`,
        async ({ request }) => {
          key = request.headers.get('x-woku-idempotency-key');
          body = await request.json();
          return HttpResponse.json({ name: 'crm', value: 'TX-1' });
        },
      ),
    );
    await woku().trackers.assignToWoku('w1', { name: 'crm', value: 'TX-1' });
    expect(body).toEqual({ name: 'crm', value: 'TX-1' });
    expect(key).toBeNull();
  });

  it('trackers.removeFromWoku URL-encodes the tracker name in the DELETE path', async () => {
    let seenPath: string | null = null;
    server.use(
      http.delete(
        `${BASE}/v1/external-trackers/wokus/w1/:name`,
        ({ request }) => {
          seenPath = new URL(request.url).pathname;
          return HttpResponse.json({ deleted: true });
        },
      ),
    );
    await woku().trackers.removeFromWoku('w1', 'crm id');
    expect(seenPath).toBe('/v1/external-trackers/wokus/w1/crm%20id');
  });

  it('npsTools.create -> POST /v1/nps-tools ; get -> GET /v1/nps-tool/:id (singular)', async () => {
    server.use(
      http.post(`${BASE}/v1/nps-tools`, () =>
        HttpResponse.json({
          _id: 'nt1',
          name: 'Survey',
          npsMessage: 'How likely?',
        }),
      ),
      http.get(`${BASE}/v1/nps-tool/nt1`, () =>
        HttpResponse.json({
          _id: 'nt1',
          name: 'Survey',
          npsMessage: 'How likely?',
        }),
      ),
    );
    const created = await woku().npsTools.create({
      name: 'Survey',
      npsMessage: 'How likely?',
    });
    expect(created._id).toBe('nt1');
    const fetched = await woku().npsTools.get('nt1');
    expect(fetched.name).toBe('Survey');
  });

  it('nps.sendInvitations posts the exact wire body to /v1/nps/invitations with an idempotency key', async () => {
    let key: string | null = null;
    let body: unknown;
    server.use(
      http.post(`${BASE}/v1/nps/invitations`, async ({ request }) => {
        key = request.headers.get('x-woku-idempotency-key');
        body = await request.json();
        return HttpResponse.json({ accepted: 2, rejected: 0 }, { status: 202 });
      }),
    );
    const result = await woku().nps.sendInvitations({
      channel: 'email',
      npsToolId: 'nt1',
      recipients: ['a@b.c', 'd@e.f'],
    });
    // The server DTO requires channel + string[] recipients; assert the exact
    // shape so a wrong example can never silently reach the wire again.
    expect(body).toEqual({
      channel: 'email',
      npsToolId: 'nt1',
      recipients: ['a@b.c', 'd@e.f'],
    });
    expect(result.accepted).toBe(2);
    expect(key).toBeTruthy();
  });

  it('ticketDestinations.test sends { confirm: true } to /:id/test', async () => {
    let body: unknown;
    server.use(
      http.post(
        `${BASE}/v1/ticket-destinations/d1/test`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ ok: true, message: 'reachable' });
        },
      ),
    );
    const out = await woku().ticketDestinations.test('d1');
    expect(out.ok).toBe(true);
    expect(body).toEqual({ confirm: true });
  });

  it('actionPlans.reply sends { text, confirm: true } to /:id/conversation', async () => {
    let body: unknown;
    server.use(
      http.post(
        `${BASE}/v1/action-plans/p1/conversation`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ posted: true }, { status: 202 });
        },
      ),
    );
    await woku().actionPlans.reply('p1', 'please refine step 2');
    expect(body).toEqual({ text: 'please refine step 2', confirm: true });
  });

  it('tickets.list paginates and auto-iterates', async () => {
    server.use(
      http.get(`${BASE}/v1/tickets`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
        return page === 1
          ? HttpResponse.json({
              data: [{ _id: 'a', title: 'A', severity: 'high' }],
              total: 2,
              page: 1,
              limit: 1,
            })
          : HttpResponse.json({
              data: [{ _id: 'b', title: 'B', severity: 'low' }],
              total: 2,
              page: 2,
              limit: 1,
            });
      }),
    );
    const ids: string[] = [];
    for await (const t of await woku().tickets.list({ limit: 1 }))
      ids.push(t._id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('dispatches.stats reads /v1/dispatches/stats', async () => {
    server.use(
      http.get(`${BASE}/v1/dispatches/stats`, () =>
        HttpResponse.json({
          total: 10,
          delivered: 8,
          byStatus: {
            invited: 4,
            partially_responded: 1,
            responded: 3,
            failed: 2,
          },
          responseRate: 0.4,
        }),
      ),
    );
    const stats = await woku().dispatches.stats({ channel: 'email' });
    expect(stats.responseRate).toBe(0.4);
    expect(stats.total).toBe(10);
  });
});

it('reads a safe follow-up conversation with a management key, encoded id and request options', async () => {
  const conversation = {
    _id: 'fu /1',
    companyId: 'c1',
    origin: { tool: 'nps', refId: 'n1' },
    reviewType: 'textnote',
    originalReview: 'Slow',
    state: 'completed',
    reason: 'summary_generation_failed',
    channel: 'email',
    messages: [
      {
        role: 'client',
        content: 'Still waiting',
        timestamp: '2026-09-27T12:00:00Z',
        phase: 'follow_up',
      },
    ],
    summaryVersion: 1,
  };
  server.use(
    http.get(`${BASE}/v1/follow-ups/:id`, ({ request }) => {
      expect(new URL(request.url).pathname).toBe('/v1/follow-ups/fu%20%2F1');
      expect(request.headers.get('authorization')).toBe('Bearer sk_test');
      expect(request.headers.get('x-request-context')).toBe('support');
      return HttpResponse.json({ data: conversation });
    }),
  );
  const result = await woku().followUps.get('fu /1', {
    headers: { 'x-request-context': 'support' },
  });
  expect(result).toEqual(conversation);
  expect(result.reason).toBe('summary_generation_failed');
});

it('types the hybrid line, message phases, files and summary citations of a follow-up', async () => {
  const adminUrl =
    'https://admin.woku.app/companies/c1/follow-ups/fu1/files/f1';
  const conversation: FollowUpConversation = {
    _id: 'fu1',
    companyId: 'c1',
    origin: { tool: 'csat', refId: 'r1' },
    reviewType: 'voicemail',
    originalReview: 'Llegó roto',
    state: 'completed',
    channel: 'whatsapp',
    line: 'survey_thread',
    messages: [
      {
        role: 'client',
        content: '',
        timestamp: '2026-10-09T12:00:00Z',
        phase: 'survey',
        attachments: [
          {
            index: 1,
            label: 'Archivo 1',
            kind: 'audio',
            fileId: 'f1',
            filename: 'audio',
            mimeType: 'audio/ogg',
            status: 'ready',
            text: 'Llegó roto',
            adminUrl,
          },
        ],
      },
      {
        role: 'client',
        content: '',
        timestamp: '2026-10-09T12:01:00Z',
        phase: 'follow_up',
        attachments: [
          {
            index: 2,
            label: 'Archivo 2',
            kind: 'unsupported',
            filename: 'video',
            mimeType: 'video/mp4',
            status: 'unsupported',
            failureReason: 'video',
          },
        ],
      },
    ],
    executiveSummary: 'La caja llegó rota (Archivo 1).',
    summaryCitations: [
      {
        index: 1,
        label: 'Archivo 1',
        fileId: 'f1',
        supports: 'Daño del envío',
        adminUrl,
      },
    ],
    summaryVersion: 1,
  };
  server.use(
    http.get(`${BASE}/v1/follow-ups/:id`, () =>
      HttpResponse.json({ data: conversation }),
    ),
  );
  const result = await woku().followUps.get('fu1');
  expect(result).toEqual(conversation);
  const line: FollowUpLine | undefined = result.line;
  const phase: FollowUpMessagePhase = result.messages[0]!.phase;
  const file: FollowUpAttachment | undefined =
    result.messages[0]!.attachments?.[0];
  const citation: FollowUpCitation | undefined = result.summaryCitations?.[0];
  expect([line, phase, file?.adminUrl, citation?.adminUrl]).toEqual([
    'survey_thread',
    'survey',
    adminUrl,
    adminUrl,
  ]);
});

it.each([403, 404])(
  'propagates follow-up access errors without returning conversation data: %s',
  async (status) => {
    server.use(
      http.get(`${BASE}/v1/follow-ups/:id`, () =>
        HttpResponse.json({ message: 'Unavailable' }, { status }),
      ),
    );
    await expect(woku().followUps.get('other-company')).rejects.toMatchObject({
      status,
    });
  },
);

it.each(fixtures)(
  'preserves ticket evidence semantics for $name on detail and list',
  async ({ ticket, enriched }) => {
    server.use(
      http.get(`${BASE}/v1/tickets/:id`, () => HttpResponse.json(ticket)),
      http.get(`${BASE}/v1/tickets`, () =>
        HttpResponse.json({ data: [ticket], page: 1, limit: 10, total: 1 }),
      ),
    );
    const client = woku();
    const detail = await client.tickets.get(ticket._id);
    const page = await client.tickets.list();
    expect(detail).toEqual(ticket);
    expect(page.data).toEqual([ticket]);
    expect((detail.followUp?.appliedSummaryVersion ?? 0) >= 1).toBe(enriched);
  },
);

it('sends the explicit custom update configuration without losing its contract', async () => {
  const config: CustomTicketDestinationConfig = {
    url: 'https://sac.example.com/tickets',
    method: 'POST',
    update: {
      mode: 'remote-id',
      url: 'https://sac.example.com/tickets/{{remoteId}}',
      method: 'PATCH',
      responseIdPath: 'result.id',
    },
  };
  server.use(
    http.post(`${BASE}/v1/ticket-destinations`, async ({ request }) => {
      expect(await request.json()).toMatchObject({ kind: 'custom', config });
      return HttpResponse.json({ _id: 'destination_1' });
    }),
  );
  await woku().ticketDestinations.create({
    name: 'Support',
    kind: 'custom',
    config,
    credentials: { authType: 'none' },
  });
});
