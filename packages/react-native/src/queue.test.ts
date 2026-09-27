import { describe, expect, it, vi } from 'vitest';

import { OfflineQueue } from './queue';
import { InMemoryStorage } from './adapters';
import {
  WokuConfigError,
  WokuNetworkError,
  WokuQuarantineError,
} from './errors';
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

it.each([
  null,
  {},
  { submission: null, attempts: 0 },
  { submission: { ...sub('a'), companyId: 4 }, attempts: 0 },
  { submission: { ...sub('a'), createdAt: 'yesterday' }, attempts: 0 },
  { submission: sub('a'), attempts: 'one' },
])(
  'rejects malformed persisted rows without modifying storage: %j',
  async (row) => {
    const storage = new InMemoryStorage();
    const raw = JSON.stringify([row]);
    await storage.setItem('woku.sdk.queue.v1', raw);
    const queue = new OfflineQueue({ storage, companyId: 'c1' });
    await expect(queue.pending()).rejects.toBeInstanceOf(WokuConfigError);
    await expect(queue.enqueue(sub('new'))).rejects.toBeInstanceOf(
      WokuConfigError,
    );
    expect(await storage.getItem('woku.sdk.queue.v1')).toBe(raw);
  },
);

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

it('keeps every concurrently enqueued submission in persistent storage', async () => {
  const storage = new InMemoryStorage();
  const queue = new OfflineQueue({ storage });
  await Promise.all([
    queue.enqueue(sub('a')),
    queue.enqueue(sub('b')),
    queue.enqueue(sub('c')),
  ]);
  expect(
    (await new OfflineQueue({ storage }).pending())
      .map((item) => item.id)
      .sort(),
  ).toEqual(['a', 'b', 'c']);
});

it('does not discard a newly enqueued capture while a flush is waiting on the network', async () => {
  const queue = new OfflineQueue();
  await queue.enqueue(sub('a'));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const flushing = queue.flush(async (value) => {
    await gate;
    return sent(value.id);
  });
  await queue.enqueue(sub('b'));
  release();
  await flushing;
  expect((await queue.pending()).map((item) => item.id)).toEqual(['b']);
});

it('does not send or clear another company captures stored by a previous SDK instance', async () => {
  const storage = new InMemoryStorage();
  const existing = new OfflineQueue({ storage });
  await existing.enqueue(sub('a'));
  await existing.enqueue({ ...sub('b'), companyId: 'c2' });
  const current = new OfflineQueue({ storage, companyId: 'c2' });
  const sender = vi.fn(async (value) => sent(value.id));
  await current.flush(sender);
  expect(sender).toHaveBeenCalledTimes(1);
  expect(sender.mock.calls[0]?.[0].companyId).toBe('c2');
  await current.clear();
  expect(
    (await new OfflineQueue({ storage }).pending()).map((item) => item.id),
  ).toEqual(['a']);
});

it('does not retry network failures indefinitely beyond the configured attempt budget', async () => {
  const queue = new OfflineQueue({ maxAttempts: 2 });
  await queue.enqueue(sub('a'));
  const send = vi.fn(async () => {
    throw new WokuNetworkError('offline');
  });
  await queue.flush(send);
  await queue.flush(send);
  await queue.flush(send);
  expect(send).toHaveBeenCalledTimes(2);
  expect(await queue.size()).toBe(0);
});

it('retains exhausted data instead of deleting the only copy of an uncertain capture', async () => {
  const storage = new InMemoryStorage();
  const queue = new OfflineQueue({ storage, maxAttempts: 1 });
  await queue.enqueue(sub('a'));
  await queue.flush(async () => {
    throw new WokuNetworkError('offline');
  });
  expect(await queue.size()).toBe(0);
  expect(
    (await new OfflineQueue({ storage }).failures())[0]?.submission.id,
  ).toBe('a');
});

it('keeps captures beyond the server dedup window for manual reconciliation without sending them', async () => {
  const queue = new OfflineQueue();
  await queue.enqueue({
    ...sub('old'),
    createdAt: Date.now() - 25 * 60 * 60 * 1000,
  });
  const send = vi.fn();
  await queue.flush(send);
  expect(send).not.toHaveBeenCalled();
  expect((await queue.failures())[0]?.reason).toContain('Retry window expired');
});

it('does not start sending snapshot rows removed by clear during an in-flight flush', async () => {
  const storage = new InMemoryStorage();
  const queue = new OfflineQueue({ storage, companyId: 'c1' });
  await queue.enqueue(sub('a'));
  await queue.enqueue(sub('b'));
  let started!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  const send = vi.fn(async (capture: CaptureSubmission) => {
    started();
    await response;
    return sent(capture.id);
  });
  const flushing = queue.flush(send);
  await firstStarted;
  await new OfflineQueue({ storage, companyId: 'c1' }).clear();
  release();
  await flushing;
  expect(send).toHaveBeenCalledOnce();
  expect(await queue.size()).toBe(0);
});
