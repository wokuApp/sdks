import { WokuClient, type WokuClientConfig } from './client';
import { OfflineQueue, type FlushResult } from './queue';
import { type Storage, type Logger, noopLogger } from './adapters';
import {
  WokuNetworkError,
  WokuQuarantineError,
  WokuValidationError,
} from './errors';
import type {
  CaptureSubmission,
  CsatCaptureInput,
  CesCaptureInput,
  NpsCaptureInput,
  SubmissionResult,
  WokuCaptureInput,
} from './types';

export interface WokuSdkConfig extends WokuClientConfig {
  /** Storage adapter for the offline queue (MMKV/AsyncStorage in RN). */
  storage?: Storage;
  /** Retain a failed submission for inspection after this many flush attempts. */
  maxQueueAttempts?: number;
}

function generateId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback: timestamp + random, good enough as an idempotency key.
  return `wk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function assertInt(
  value: number,
  min: number,
  max: number,
  field: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new WokuValidationError(
      `${field} must be an integer between ${min} and ${max}`,
    );
  }
}

/**
 * Top-level Woku SDK. Wires the typed {@link WokuClient} to a durable
 * {@link OfflineQueue}: a capture is attempted immediately and, if the
 * device is offline or the server is unreachable, transparently queued
 * and retried on the next {@link WokuSdk.flush}.
 *
 * @example
 * const woku = new WokuSdk({
 *   apiUrl: 'https://api.woku.app',
 *   publicKey: 'pk_live_...',
 *   companyId: 'company_123',
 *   storage: mmkvStorageAdapter,
 * });
 * await woku.captureNps({ npsId: 'nps_1', score: 9, comment: 'Great!' });
 */
export class WokuSdk {
  private readonly client: WokuClient;
  private readonly queue: OfflineQueue;
  private readonly logger: Logger;
  private readonly companyId: string;
  private readonly language: 'es' | 'en';

  constructor(config: WokuSdkConfig) {
    this.client = new WokuClient(config);
    this.queue = new OfflineQueue({
      storage: config.storage,
      companyId: config.companyId,
      maxAttempts: config.maxQueueAttempts,
    });
    this.logger = config.logger ?? noopLogger;
    this.companyId = config.companyId;
    this.language = config.language ?? 'es';
  }

  /** Captures a Woku rating (1..5) with optional text/audio comment. */
  async captureWoku(input: WokuCaptureInput): Promise<SubmissionResult> {
    assertInt(input.rating, 1, 5, 'rating');
    const submission: CaptureSubmission = {
      id: generateId(),
      kind: 'woku',
      companyId: this.companyId,
      targetId: input.wokuId,
      rating: input.rating,
      comment: input.comment,
      audio: input.audio,
      respondent: input.respondent,
      metadata: input.metadata,
      dispatchToken: input.dispatchToken,
      language: input.language ?? (input.audio ? this.language : undefined),
      createdAt: Date.now(),
    };
    return this.deliver(submission);
  }

  /** Captures an NPS score (0..10) with optional text/audio review. */
  async captureNps(input: NpsCaptureInput): Promise<SubmissionResult> {
    assertInt(input.score, 0, 10, 'score');
    const submission: CaptureSubmission = {
      id: generateId(),
      kind: 'nps',
      companyId: this.companyId,
      targetId: input.npsId,
      score: input.score,
      comment: input.comment,
      audio: input.audio,
      respondent: input.respondent,
      metadata: input.metadata,
      dispatchToken: input.dispatchToken,
      language: input.language ?? (input.audio ? this.language : undefined),
      createdAt: Date.now(),
    };
    return this.deliver(submission);
  }

  async captureCsat(input: CsatCaptureInput): Promise<SubmissionResult> {
    assertInt(input.score, 1, 5, 'score');
    return this.deliver({
      id: generateId(),
      kind: 'csat',
      companyId: this.companyId,
      targetId: input.csatId,
      score: input.score,
      comment: input.comment,
      respondent: input.respondent,
      metadata: input.metadata,
      dispatchToken: input.dispatchToken,
      createdAt: Date.now(),
    });
  }
  async captureCes(input: CesCaptureInput): Promise<SubmissionResult> {
    assertInt(input.score, 1, 5, 'score');
    return this.deliver({
      id: generateId(),
      kind: 'ces',
      companyId: this.companyId,
      targetId: input.cesId,
      score: input.score,
      comment: input.comment,
      respondent: input.respondent,
      metadata: input.metadata,
      dispatchToken: input.dispatchToken,
      createdAt: Date.now(),
    });
  }

  /** Retries every queued submission. Safe to call on app foreground or
   *  when connectivity is regained. */
  flush(): Promise<FlushResult> {
    return this.queue.flush((s) => this.client.send(s));
  }

  /** Number of submissions waiting to be delivered. */
  pendingCount(): Promise<number> {
    return this.queue.size();
  }

  /** Inspect retained captures whose automatic attempt budget was exhausted. */
  failedCaptures(): Promise<import('./queue').FailedCapture[]> {
    return this.queue.failures();
  }

  /** Clears the offline queue (e.g. on user logout). */
  clearQueue(): Promise<void> {
    return this.queue.clear();
  }

  /**
   * Tries to send immediately; on quarantine or network failure the
   * submission is queued for a later flush rather than thrown away.
   */
  private async deliver(
    submission: CaptureSubmission,
  ): Promise<SubmissionResult> {
    submission = JSON.parse(JSON.stringify(submission)) as CaptureSubmission;
    await this.queue.enqueue(submission);
    try {
      const result = await this.client.send(submission);
      if (result.status === 'sent') {
        try {
          await this.queue.acknowledge(submission);
        } catch {
          // Delivery is confirmed. Keep its original id for a later deduplicated
          // flush rather than making callers think they must submit again.
          this.logger.warn(
            'Capture accepted; local acknowledgement is pending',
            { id: submission.id },
          );
        }
        return result;
      }
      if (result.retryable === false) {
        await this.queue.reject(submission, result.error ?? 'Capture rejected');
        return result;
      }
      // Server-rejected but transient enough to retry: queue it.
      await this.queue.enqueue(submission);
      return { ...result, status: 'queued' };
    } catch (err) {
      await this.queue.enqueue(submission);
      if (err instanceof WokuQuarantineError) {
        return { id: submission.id, status: 'quarantined', error: err.message };
      }
      if (err instanceof WokuNetworkError) {
        this.logger.debug('capture queued (offline)', { id: submission.id });
        return { id: submission.id, status: 'queued' };
      }
      throw err;
    }
  }
}
