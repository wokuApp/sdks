import type { WokuClient } from '../core/client';
import type { Page } from '../core/pagination';
import type { RequestOptions } from '../core/options';
import type {
  CreateActionPlanGroupParams,
  CreateActionPlanTaskParams,
  ReorderActionPlanTasksParams,
  SendActionPlanParams,
  UpdateActionPlanGroupParams,
  UpdateActionPlanTaskParams,
} from '../types';
import type { WokuRecord } from '../models';

export interface ListActionPlansParams {
  groupId?: string;
  status?: string;
  source?: string;
  priority?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/** Read and drive action plans, incl. the managed kanban (`/v1/action-plans`). */
export class ActionPlans {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: ListActionPlansParams,
    opts?: RequestOptions,
  ): Promise<Page<WokuRecord>> {
    return this.client.getPage<WokuRecord>('/v1/action-plans', params, opts);
  }

  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/action-plans/${id}`,
      opts,
    );
  }

  /** The plan timeline (events, oldest first). */
  events(id: string, opts?: RequestOptions): Promise<WokuRecord[]> {
    return this.client.request<WokuRecord[]>(
      'get',
      `/v1/action-plans/${id}/events`,
      opts,
    );
  }

  /** The plan AI conversation (read-only). */
  getConversation(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/action-plans/${id}/conversation`,
      opts,
    );
  }

  /**
   * Reply to the plan AI agent. Each reply is a paid AI turn (`confirm:true` is
   * sent automatically); the reply is composed asynchronously, so poll
   * {@link getConversation} until `busy` is false.
   */
  reply(id: string, text: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/action-plans/${id}/conversation`,
      { ...opts, body: { text, confirm: true } },
    );
  }

  /** Send an approved plan to a destination (jira/monday/clickup/notion/internal). */
  send(
    id: string,
    body: SendActionPlanParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/action-plans/${id}/send`,
      { ...opts, body },
    );
  }

  createTask(
    id: string,
    body: CreateActionPlanTaskParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/action-plans/${id}/tasks`,
      { ...opts, body, idempotent: true },
    );
  }

  updateTask(
    id: string,
    taskId: string,
    body: UpdateActionPlanTaskParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/action-plans/${id}/tasks/${taskId}`,
      { ...opts, body },
    );
  }

  reorderTasks(
    id: string,
    body: ReorderActionPlanTasksParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/action-plans/${id}/tasks/reorder`,
      { ...opts, body },
    );
  }

  deleteTask(
    id: string,
    taskId: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'delete',
      `/v1/action-plans/${id}/tasks/${taskId}`,
      opts,
    );
  }

  approve(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.status(id, 'approve', opts);
  }

  reopen(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.status(id, 'reopen', opts);
  }

  cancel(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.status(id, 'cancel', opts);
  }

  complete(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.status(id, 'complete', opts);
  }

  resume(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.status(id, 'resume', opts);
  }

  private status(
    id: string,
    action: string,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'post',
      `/v1/action-plans/${id}/${action}`,
      opts,
    );
  }
}

/** Manage action-plan groups (`/v1/action-plan-groups`). */
export class ActionPlanGroups {
  constructor(private readonly client: WokuClient) {}

  list(
    params?: { search?: string },
    opts?: RequestOptions,
  ): Promise<WokuRecord[]> {
    return this.client.request<WokuRecord[]>('get', '/v1/action-plan-groups', {
      ...opts,
      query: { ...params, ...opts?.query },
    });
  }

  /** Get one group with its embedded stats. */
  get(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'get',
      `/v1/action-plan-groups/${id}`,
      opts,
    );
  }

  create(
    body: CreateActionPlanGroupParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>('post', '/v1/action-plan-groups', {
      ...opts,
      body,
      idempotent: true,
    });
  }

  update(
    id: string,
    body: UpdateActionPlanGroupParams,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/action-plan-groups/${id}`,
      { ...opts, body },
    );
  }

  setEnabled(
    id: string,
    enabled: boolean,
    opts?: RequestOptions,
  ): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'patch',
      `/v1/action-plan-groups/${id}/enabled`,
      { ...opts, body: { enabled } },
    );
  }

  delete(id: string, opts?: RequestOptions): Promise<WokuRecord> {
    return this.client.request<WokuRecord>(
      'delete',
      `/v1/action-plan-groups/${id}`,
      opts,
    );
  }
}
