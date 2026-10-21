import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type {
  DeletedResult,
  ReportSubscription,
  ReportSubscriptionFrequency,
  ReportSubscriptionScope,
  ReportSubscriptionSendResult,
} from '../models';

/** Body of `reportSubscriptions.create`. */
export interface CreateReportSubscriptionParams {
  scopeType: ReportSubscriptionScope;
  /** Folder or tool id. */
  scopeId: string;
  frequency: ReportSubscriptionFrequency;
  /** 1 to 10 emails; they need no woku account. */
  recipients: string[];
  /** Folder only: also attach the CSV of the period. */
  includeCsv?: boolean;
  locale?: 'es' | 'en';
  /** `once` only: when to send it (ISO). Omit to send it within minutes. */
  sendAt?: string;
  /** `once` only: period start (ISO, inclusive). */
  periodFrom?: string;
  /** `once` only: period end (ISO, exclusive). */
  periodTo?: string;
}

/** Body of `reportSubscriptions.update` (recurring reports only). */
export interface UpdateReportSubscriptionParams {
  frequency?: Exclude<ReportSubscriptionFrequency, 'once'>;
  recipients?: string[];
  includeCsv?: boolean;
  locale?: 'es' | 'en';
  /** `false` pauses, `true` resumes. */
  active?: boolean;
}

/**
 * Reports emailed on a schedule (`/v1/report-subscriptions`): the PDF of a
 * folder or of one tool, monthly, every two weeks, weekly or once, sent as
 * the company with a one-click unsubscribe.
 */
export class ReportSubscriptions {
  constructor(private readonly client: WokuClient) {}

  /** Every scheduled report, or those of one folder or tool. */
  list(
    params?: { scopeType?: ReportSubscriptionScope; scopeId?: string },
    opts?: RequestOptions,
  ): Promise<ReportSubscription[]> {
    return this.client.request<ReportSubscription[]>(
      'get',
      '/v1/report-subscriptions',
      { ...opts, query: { ...params, ...opts?.query } },
    );
  }

  create(
    body: CreateReportSubscriptionParams,
    opts?: RequestOptions,
  ): Promise<ReportSubscription> {
    return this.client.request<ReportSubscription>(
      'post',
      '/v1/report-subscriptions',
      { ...opts, body },
    );
  }

  /** Edit, pause or resume a recurring scheduled report. */
  update(
    id: string,
    body: UpdateReportSubscriptionParams,
    opts?: RequestOptions,
  ): Promise<ReportSubscription> {
    return this.client.request<ReportSubscription>(
      'patch',
      `/v1/report-subscriptions/${encodeURIComponent(id)}`,
      { ...opts, body },
    );
  }

  delete(id: string, opts?: RequestOptions): Promise<DeletedResult> {
    return this.client.request<DeletedResult>(
      'delete',
      `/v1/report-subscriptions/${encodeURIComponent(id)}`,
      opts,
    );
  }

  /**
   * Send it now: the last complete period of a recurring report (its
   * schedule stays) or the period of a one-off (which then closes).
   */
  send(
    id: string,
    opts?: RequestOptions,
  ): Promise<ReportSubscriptionSendResult> {
    return this.client.request<ReportSubscriptionSendResult>(
      'post',
      `/v1/report-subscriptions/${encodeURIComponent(id)}/send`,
      opts,
    );
  }
}
