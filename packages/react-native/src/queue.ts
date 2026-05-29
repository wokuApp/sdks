import { InMemoryStorage, type Storage } from './adapters';
import { WokuQuarantineError, WokuNetworkError } from './errors';
import type { CaptureSubmission, SubmissionResult } from './types';

interface QueuedItem {
  submission: CaptureSubmission;
  attempts: number;
}

export interface OfflineQueueOptions {
  storage?: Storage;
  /** Storage key for the persisted queue. */
  storageKey?: string;
  /** Drop a submission after this many failed delivery attempts. */
  maxAttempts?: number;
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
  /** Set when flushing stopped early due to quarantine. */
  quarantined?: boolean;
}

const DEFAULT_KEY = 'woku.sdk.queue.v1';
const DEFAULT_MAX_ATTEMPTS = 8;

/**
 * Durable, FIFO offline buffer for captures. Persists through an
 * injectable {@link Storage} so submissions survive app restarts, and
 * flushes them through a caller-provided `send` function. Pure and
 * deterministic: no timers, no platform APIs.
 *
 * Delivery semantics on flush:
 *  - `sent`        -> removed from the queue.
 *  - quarantine    -> flush stops (server is rate-limiting the
 *                     respondent); items are kept for the next attempt.
 *  - network error -> attempt count bumped, item kept, flush continues.
 *  - `failed`      -> attempt count bumped; dropped once maxAttempts is
 *                     reached so a permanently-bad item can't wedge it.
 */
export class OfflineQueue {
  private readonly storage: Storage;
  private readonly key: string;
  private readonly maxAttempts: number;
  private items: QueuedItem[] | null = null;

  constructor(opts: OfflineQueueOptions = {}) {
    this.storage = opts.storage ?? new InMemoryStorage();
    this.key = opts.storageKey ?? DEFAULT_KEY;
    this.maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  private async load(): Promise<QueuedItem[]> {
    if (this.items) return this.items;
    const raw = await this.storage.getItem(this.key);
    if (!raw) {
      this.items = [];
      return this.items;
    }
    try {
      const parsed = JSON.parse(raw) as QueuedItem[];
      this.items = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.items = [];
    }
    return this.items;
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(this.key, JSON.stringify(this.items ?? []));
  }

  /** Adds a submission to the tail of the queue (dedup by id). */
  async enqueue(submission: CaptureSubmission): Promise<void> {
    const items = await this.load();
    if (items.some((i) => i.submission.id === submission.id)) return;
    items.push({ submission, attempts: 0 });
    await this.persist();
  }

  async size(): Promise<number> {
    return (await this.load()).length;
  }

  /** Returns a copy of the pending submissions (oldest first). */
  async pending(): Promise<CaptureSubmission[]> {
    return (await this.load()).map((i) => i.submission);
  }

  /**
   * Attempts to deliver every queued submission through `send`, applying
   * the delivery semantics documented on the class. Persists once at the
   * end and returns a summary.
   */
  async flush(
    send: (submission: CaptureSubmission) => Promise<SubmissionResult>,
  ): Promise<FlushResult> {
    const items = await this.load();
    const survivors: QueuedItem[] = [];
    let sent = 0;
    let failed = 0;
    let quarantined = false;

    for (let index = 0; index < items.length; index++) {
      const item = items[index] as QueuedItem;
      if (quarantined) {
        survivors.push(item);
        continue;
      }
      try {
        const result = await send(item.submission);
        if (result.status === 'sent') {
          sent++;
        } else {
          item.attempts++;
          if (item.attempts >= this.maxAttempts) failed++;
          else survivors.push(item);
        }
      } catch (err) {
        if (err instanceof WokuQuarantineError) {
          quarantined = true;
          survivors.push(item);
        } else if (err instanceof WokuNetworkError) {
          item.attempts++;
          survivors.push(item);
        } else {
          item.attempts++;
          if (item.attempts >= this.maxAttempts) failed++;
          else survivors.push(item);
        }
      }
    }

    this.items = survivors;
    await this.persist();
    return { sent, failed, remaining: survivors.length, quarantined };
  }

  /** Clears the queue (e.g. on logout). */
  async clear(): Promise<void> {
    this.items = [];
    await this.storage.removeItem(this.key);
  }
}
