import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { Woku } from './woku';

const BASE = 'http://api.test';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const woku = (): Woku => new Woku({ apiKey: 'sk_test', baseURL: BASE });

describe('Woku facade — request shaping', () => {
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

  it('nps.sendInvitations posts to /v1/nps/invitations with an idempotency key', async () => {
    let key: string | null = null;
    server.use(
      http.post(`${BASE}/v1/nps/invitations`, ({ request }) => {
        key = request.headers.get('x-woku-idempotency-key');
        return HttpResponse.json({ accepted: 2, rejected: 0 }, { status: 202 });
      }),
    );
    const result = await woku().nps.sendInvitations({
      npsToolId: 'nt1',
      recipients: [{ email: 'a@b.c' }, { email: 'd@e.f' }],
    } as never);
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
