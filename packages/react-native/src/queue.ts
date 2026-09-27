import { InMemoryStorage, type Storage } from './adapters';
import { WokuConfigError, WokuQuarantineError } from './errors';
import type { CaptureSubmission, SubmissionResult } from './types';

interface QueuedItem {
  submission: CaptureSubmission;
  attempts: number;
  failure?: string;
}
export interface FailedCapture {
  submission: CaptureSubmission;
  reason: string;
}
export interface OfflineQueueOptions {
  storage?: Storage;
  storageKey?: string;
  maxAttempts?: number;
  /** Restrict reads, delivery and clearing to this company, including legacy rows. */
  companyId?: string;
}
export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
  quarantined?: boolean;
}

const DEFAULT_KEY = 'woku.sdk.queue.v1';
const mutations = new WeakMap<Storage, Map<string, Promise<void>>>();
const flushes = new WeakMap<Storage, Map<string, Promise<FlushResult>>>();

/** Persistent FIFO with scoped ownership, atomic local mutations and retained failures. */
export class OfflineQueue {
  private readonly storage: Storage;
  private readonly key: string;
  private readonly maxAttempts: number;
  private readonly companyId?: string;

  constructor(opts: OfflineQueueOptions = {}) {
    this.storage = opts.storage ?? new InMemoryStorage();
    this.key = opts.storageKey ?? DEFAULT_KEY;
    this.maxAttempts = opts.maxAttempts ?? 8;
    this.companyId = opts.companyId;
  }

  private owned(item: QueuedItem): boolean {
    return !this.companyId || item.submission.companyId === this.companyId;
  }
  private async load(): Promise<QueuedItem[]> {
    const raw = await this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            item.submission &&
            typeof item.submission.id === 'string' &&
            typeof item.submission.companyId === 'string' &&
            Number.isFinite(item.submission.createdAt) &&
            Number.isInteger(item.attempts) &&
            item.attempts >= 0,
        )
      )
        return parsed as QueuedItem[];
    } catch {
      /* Preserve invalid storage instead of silently overwriting it. */
    }
    throw new WokuConfigError(
      'The capture queue contains invalid data; repair it before writing.',
    );
  }
  private async persist(items: QueuedItem[]): Promise<void> {
    await this.storage.setItem(this.key, JSON.stringify(items));
  }
  private mutation<T>(run: () => Promise<T>): Promise<T> {
    let locks = mutations.get(this.storage);
    if (!locks) {
      locks = new Map();
      mutations.set(this.storage, locks);
    }
    const previous = locks.get(this.key) ?? Promise.resolve();
    const result = previous.then(run, run);
    const settled = result.then(
      () => undefined,
      () => undefined,
    );
    locks.set(this.key, settled);
    void settled.then(() => {
      if (locks?.get(this.key) === settled) locks.delete(this.key);
    });
    return result;
  }

  async enqueue(submission: CaptureSubmission): Promise<void> {
    if (this.companyId && submission.companyId !== this.companyId)
      throw new WokuConfigError(
        'Cannot enqueue a capture from another company.',
      );
    const snapshot = JSON.parse(
      JSON.stringify(submission),
    ) as CaptureSubmission;
    return this.mutation(async () => {
      const items = await this.load();
      if (
        items.some(
          (item) =>
            item.submission.id === snapshot.id &&
            item.submission.companyId === snapshot.companyId,
        )
      )
        return;
      items.push({ submission: snapshot, attempts: 0 });
      await this.persist(items);
    });
  }
  size(): Promise<number> {
    return this.mutation(
      async () =>
        (await this.load()).filter((item) => this.owned(item) && !item.failure)
          .length,
    );
  }
  pending(): Promise<CaptureSubmission[]> {
    return this.mutation(async () =>
      (await this.load())
        .filter((item) => this.owned(item) && !item.failure)
        .map((item) => item.submission),
    );
  }
  failures(): Promise<FailedCapture[]> {
    return this.mutation(async () =>
      (await this.load())
        .filter((item) => this.owned(item) && item.failure)
        .map((item) => ({
          submission: item.submission,
          reason: item.failure!,
        })),
    );
  }

  acknowledge(submission: CaptureSubmission): Promise<void> {
    return this.mutation(async () => {
      const items = await this.load();
      await this.persist(
        items.filter(
          (item) =>
            !(
              item.submission.id === submission.id &&
              item.submission.companyId === submission.companyId &&
              this.owned(item)
            ),
        ),
      );
    });
  }
  reject(submission: CaptureSubmission, reason: string): Promise<void> {
    return this.mutation(async () => {
      const items = await this.load();
      const item = items.find(
        (row) =>
          row.submission.id === submission.id &&
          row.submission.companyId === submission.companyId &&
          this.owned(row),
      );
      if (item) {
        item.failure = reason;
        await this.persist(items);
      }
    });
  }

  flush(
    send: (submission: CaptureSubmission) => Promise<SubmissionResult>,
  ): Promise<FlushResult> {
    let jobs = flushes.get(this.storage);
    if (!jobs) {
      jobs = new Map();
      flushes.set(this.storage, jobs);
    }
    const scope = JSON.stringify([this.key, this.companyId ?? '*']);
    const existing = jobs.get(scope);
    if (existing) return existing;
    const result = this.runFlush(send).finally(() => {
      if (jobs?.get(scope) === result) jobs.delete(scope);
    });
    jobs.set(scope, result);
    return result;
  }
  private async runFlush(
    send: (submission: CaptureSubmission) => Promise<SubmissionResult>,
  ): Promise<FlushResult> {
    const batch = await this.pending();
    let sent = 0,
      failed = 0,
      quarantined = false;
    for (const candidate of batch) {
      // A clear/reject while another request is in flight invalidates this snapshot.
      const current = await this.mutation(async () =>
        (await this.load()).find(
          (item) =>
            this.owned(item) &&
            !item.failure &&
            item.submission.id === candidate.id &&
            item.submission.companyId === candidate.companyId,
        ),
      );
      if (!current) continue;
      const submission = current.submission;
      // The server deduplicates for 24h; keep older uncertain captures for
      // inspection rather than resubmitting them outside that protection.
      if (
        submission.createdAt > 0 &&
        Date.now() - submission.createdAt >= 24 * 60 * 60 * 1000
      ) {
        await this.reject(
          submission,
          'Retry window expired; inspect delivery before resubmitting.',
        );
        failed++;
        continue;
      }
      let permanent = false;
      let reason: string | undefined;
      let accepted = false;
      try {
        const result = await send(submission);
        accepted = result.status === 'sent';
        reason = result.error;
        permanent = result.retryable === false;
      } catch (error) {
        if (error instanceof WokuQuarantineError) {
          quarantined = true;
          break;
        }
        reason = error instanceof Error ? error.message : 'Delivery failed';
      }
      const outcome = await this.mutation(async () => {
        const items = await this.load();
        const index = items.findIndex(
          (item) =>
            item.submission.id === submission.id &&
            item.submission.companyId === submission.companyId &&
            !item.failure,
        );
        if (index < 0) return 'removed';
        if (accepted) items.splice(index, 1);
        else {
          const item = items[index]!;
          item.attempts++;
          if (permanent || item.attempts >= this.maxAttempts)
            item.failure = reason ?? 'Attempt budget exhausted';
        }
        const exhausted = !accepted && Boolean(items[index]?.failure);
        await this.persist(items);
        return accepted ? 'sent' : exhausted ? 'failed' : 'pending';
      });
      if (outcome === 'sent') sent++;
      if (outcome === 'failed') failed++;
    }
    return { sent, failed, remaining: await this.size(), quarantined };
  }
  clear(): Promise<void> {
    return this.mutation(async () => {
      if (!this.companyId) {
        await this.storage.removeItem(this.key);
        return;
      }
      const remaining = (await this.load()).filter((item) => !this.owned(item));
      if (remaining.length) await this.persist(remaining);
      else await this.storage.removeItem(this.key);
    });
  }
}
