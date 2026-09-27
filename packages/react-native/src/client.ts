import {
  fetchHttpClient,
  noopLogger,
  type HttpClient,
  type Logger,
} from './adapters';
import {
  WokuConfigError,
  WokuNetworkError,
  WokuQuarantineError,
} from './errors';
import type { CaptureSubmission, SubmissionResult } from './types';

export interface WokuClientConfig {
  /** Base URL of the Woku API, e.g. `https://clientapi.woku.app`. */
  apiUrl: string;
  /** Public SDK key issued per company for capture ingestion. */
  publicKey: string;
  /** Tenant the captures belong to. */
  companyId: string;
  /** HTTP transport. Defaults to the global `fetch`. */
  http?: HttpClient;
  logger?: Logger;
  /** Ingest path appended to `apiUrl`. Defaults to `/v1/captures`. */
  capturePath?: string;
  /** Default audio language. */
  language?: 'es' | 'en';
  /** Bound a transport attempt, including injected adapters. Default 30s. */
  timeoutMs?: number;
}

// Resource-oriented v1 capture endpoint (woku-server clientapi). The channel
// ('mobile-sdk') is sealed server-side from this endpoint.
const DEFAULT_CAPTURE_PATH = '/v1/captures';

/**
 * Thin, typed transport to the Woku capture ingest endpoint. Stateless:
 * it turns a normalized {@link CaptureSubmission} into an authenticated
 * POST and maps the response (incl. quarantine 429) to a result/error.
 */
export class WokuClient {
  private readonly http: HttpClient;
  private readonly logger: Logger;
  private readonly endpoint: string;

  constructor(private readonly config: WokuClientConfig) {
    if (!config.apiUrl) throw new WokuConfigError('apiUrl is required');
    if (!config.publicKey) throw new WokuConfigError('publicKey is required');
    if (config.publicKey.startsWith('sk_'))
      throw new WokuConfigError(
        'Use a publishable key, never a management secret key, in a mobile app.',
      );
    if (!config.companyId) throw new WokuConfigError('companyId is required');
    this.http = config.http ?? fetchHttpClient;
    this.logger = config.logger ?? noopLogger;
    const base = config.apiUrl.replace(/\/$/, '');
    const path = config.capturePath ?? DEFAULT_CAPTURE_PATH;
    this.endpoint = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /**
   * Sends one submission. Resolves with a `sent` result on 2xx, throws
   * {@link WokuQuarantineError} on a quarantine 429, {@link WokuNetworkError}
   * on transport failure, and resolves with a `failed` result on other
   * non-2xx responses (so the caller can decide to re-queue).
   */
  async send(submission: CaptureSubmission): Promise<SubmissionResult> {
    if (submission.companyId !== this.config.companyId)
      throw new WokuConfigError(
        'Cannot deliver a capture for another company.',
      );
    if (submission.audio && !submission.language)
      submission = { ...submission, language: this.config.language ?? 'es' };
    const headers: Record<string, string> = {
      'x-woku-key': this.config.publicKey,
      'X-Woku-Company': this.config.companyId,
      'X-Woku-Idempotency-Key': submission.id,
    };

    let requestBody: string | FormData;
    if (submission.audio) {
      // Audio capture: send multipart so the server can store the voicemail.
      // The platform `fetch` reads the local `uri` and sets the multipart
      // Content-Type (with boundary), so we must NOT set it ourselves.
      const form = new FormData();
      form.append('file', {
        uri: submission.audio.uri,
        type: submission.audio.mimeType,
        name: 'capture-audio',
      } as unknown as Blob);
      form.append('payload', JSON.stringify(submission));
      requestBody = form;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(submission);
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async (): Promise<SubmissionResult> => {
          const response = await this.http.request({
            method: 'POST',
            url: this.endpoint,
            headers,
            body: requestBody,
            signal: controller.signal,
          });
          if (response.ok) {
            const body = (await this.safeJson(response.json)) as {
              id?: string;
              remoteId?: string;
            } | null;
            return {
              id: submission.id,
              status: 'sent',
              remoteId: body?.remoteId ?? body?.id,
            };
          }
          if (response.status === 429) {
            const raw = response.headers.get('Retry-After');
            const retryAfter = raw === null ? undefined : Number(raw);
            throw new WokuQuarantineError(
              'Submission blocked by quarantine',
              retryAfter !== undefined && Number.isFinite(retryAfter)
                ? Math.max(0, retryAfter)
                : undefined,
            );
          }
          const body = (await this.safeJson(response.json)) as {
            message?: unknown;
          } | null;
          const value = body?.message;
          const message =
            value && typeof value === 'object' && !Array.isArray(value)
              ? (value as { message?: unknown }).message
              : value;
          const detail = Array.isArray(message)
            ? message.filter((item) => typeof item === 'string').join(', ')
            : message;
          const error =
            typeof detail === 'string' && detail
              ? detail
              : `HTTP ${response.status}`;
          this.logger.warn(`woku capture rejected: ${error}`);
          return {
            id: submission.id,
            status: 'failed',
            error,
            retryable: response.status === 408 || response.status >= 500,
          };
        })(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new WokuNetworkError('Capture request timed out'));
          }, this.config.timeoutMs ?? 30_000);
        }),
      ]);
    } catch (err) {
      if (err instanceof WokuQuarantineError) throw err;
      throw new WokuNetworkError(
        err instanceof Error ? err.message : 'Capture request failed',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async safeJson(
    json: () => Promise<unknown>,
  ): Promise<unknown | null> {
    try {
      return await json();
    } catch {
      return null;
    }
  }
}
