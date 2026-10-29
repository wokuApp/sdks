import { describe, expect, it, vi } from 'vitest';
import { Woku } from '../woku';
import { ConflictError } from '../core/errors';

type Call = { url: URL; method: string; body?: unknown };

const client = (
  reply: (call: Call) => { status?: number; body: unknown },
): { calls: Call[]; woku: Woku } => {
  const calls: Call[] = [];
  const fetch = vi.fn(
    async (url: string, init: { method: string; body?: string }) => {
      const call: Call = {
        url: new URL(url),
        method: init.method,
        body: init.body ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      const { status = 200, body } = reply(call);
      return new Response(JSON.stringify(body), { status });
    },
  );
  return {
    calls,
    woku: new Woku({ apiKey: 'sk_test', fetch: fetch as never, maxRetries: 0 }),
  };
};

describe('folder scope (folder-voc-routing)', () => {
  it('creates a destination and a group by folder', async () => {
    const { calls, woku } = client(() => ({ body: { _id: 'x' } }));
    await woku.ticketDestinations.create({
      name: 'Soporte Compra',
      kind: 'email',
      config: { emails: ['sac@acme.cl'] },
      scopeKind: 'folder',
      folderId: 'f1',
    });
    await woku.actionPlanGroups.create({
      name: 'Compra',
      scopeKind: 'folder',
      folderId: 'f1',
      members: [{ userId: 'u1', role: 'admin' }],
    });
    expect(calls[0].body).toMatchObject({
      scopeKind: 'folder',
      folderId: 'f1',
    });
    expect(calls[1].body).toMatchObject({
      scopeKind: 'folder',
      folderId: 'f1',
    });
  });

  it('lists what listens to a folder and filters tickets by folder', async () => {
    const { calls, woku } = client(() => ({
      body: { data: [], total: 0, page: 1, limit: 20 },
    }));
    await woku.ticketDestinations.list({ folderId: 'f1' });
    await woku.actionPlanGroups.list({ folderId: 'f1' });
    await woku.tickets.list({ folderId: 'f1' });
    await woku.tickets.stats({ folderId: 'f1' });
    for (const call of calls) {
      expect(call.url.searchParams.get('folderId')).toBe('f1');
    }
    // The previous call shape (only request options) keeps working.
    await woku.ticketDestinations.list({ timeout: 1000 });
    expect(calls.at(-1)!.url.searchParams.get('folderId')).toBeNull();
  });

  it('deleting a folder with dependents needs confirmDependents', async () => {
    const { calls, woku } = client((call) =>
      call.url.searchParams.get('confirmDependents') === 'true'
        ? { body: { deleted: true, id: 'f1' } }
        : {
            status: 409,
            body: {
              code: 'FOLDER_HAS_DEPENDENTS',
              message: 'Deleting this folder also deletes...',
              dependents: { destinations: [], groups: [] },
            },
          },
    );
    await expect(woku.folders.delete('f1')).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      woku.folders.delete('f1', { confirmDependents: true }),
    ).resolves.toEqual({ deleted: true, id: 'f1' });
    expect(calls[1].url.searchParams.get('confirmDependents')).toBe('true');
  });
});
