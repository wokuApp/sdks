import { describe, expect, it, vi } from 'vitest';

import { OfflineQueue } from './queue';
import { InMemoryStorage } from './adapters';
import { WokuNetworkError, WokuQuarantineError } from './errors';
import type { CaptureSubmission, SubmissionResult } from './types';

const sub = (id: string): CaptureSubmission => ({
  id,
  kind: 'nps',
  companyId: 'c1',
  targetId: 'nps1',
  score: 9,
  createdAt: 0,
});

const sent = (id: string): SubmissionResult => ({ id, status: 'sent' });

describe('OfflineQueue', () => {
  it('enqueues and dedupes by id', async () => {
    const q = new OfflineQueue();
    await q.enqueue(sub('a'));
    await q.enqueue(sub('a'));
    await q.enqueue(sub('b'));
    expect(await q.size()).toBe(2);
  });

  it('persists across instances via storage', async () => {
    const storage = new InMemoryStorage();
    const q1 = new OfflineQueue({ storage });
    await q1.enqueue(sub('a'));
    const q2 = new OfflineQueue({ storage });
    expect(await q2.size()).toBe(1);
    expect((await q2.pending())[0]?.id).toBe('a');
  });

  it('removes sent items on flush', async () => {
    const q = new OfflineQueue();
    await q.enqueue(sub('a'));
    await q.enqueue(sub('b'));
    const send = vi.fn(async (s: CaptureSubmission) => sent(s.id));
    const res = await q.flush(send);
    expect(res).toMatchObject({ sent: 2, remaining: 0 });
    expect(await q.size()).toBe(0);
  });

  it('keeps items and bumps attempts on network error', async () => {
    const q = new OfflineQueue();
    await q.enqueue(sub('a'));
    const send = vi.fn(async () => {
      throw new WokuNetworkError('offline');
    });
    const res = await q.flush(send);
    expect(res.remaining).toBe(1);
    expect(res.sent).toBe(0);
  });

  it('stops flushing on quarantine and keeps remaining items', async () => {
    const q = new OfflineQueue();
    await q.enqueue(sub('a'));
    await q.enqueue(sub('b'));
    const send = vi.fn(async () => {
      throw new WokuQuarantineError('blocked', 60);
    });
    const res = await q.flush(send);
    expect(res.quarantined).toBe(true);
    expect(res.remaining).toBe(2);
    // send called once then short-circuited
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('drops an item once maxAttempts is reached', async () => {
    const q = new OfflineQueue({ maxAttempts: 2 });
    await q.enqueue(sub('a'));
    const failing = vi.fn(
      async (s: CaptureSubmission): Promise<SubmissionResult> => ({
        id: s.id,
        status: 'failed',
        error: 'bad',
      }),
    );
    await q.flush(failing); // attempt 1 -> kept
    expect(await q.size()).toBe(1);
    const res = await q.flush(failing); // attempt 2 -> dropped
    expect(res.failed).toBe(1);
    expect(await q.size()).toBe(0);
  });

  it('clears the queue', async () => {
    const q = new OfflineQueue();
    await q.enqueue(sub('a'));
    await q.clear();
    expect(await q.size()).toBe(0);
  });
});
