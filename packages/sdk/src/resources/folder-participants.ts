import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type {
  FolderParticipation,
  ParticipantsAddResult,
  ParticipantsSaveResult,
  ResendToMissingResult,
  ToolType,
} from '../models';

/** Body of `folderParticipants.resendToMissing`. */
export interface ResendToMissingParams {
  toolType: ToolType;
  toolId: string;
  channel: 'email' | 'whatsapp';
  language?: 'es' | 'en';
}

/**
 * The participant list of a folder (`/v1/folders/{id}/participants`): the
 * people expected to answer its tools and who of them did. The list is text,
 * one person per line with a name, an email and/or a phone (with its country
 * code), separated by commas, semicolons or tabs; a CSV goes as is. Up to 500
 * people.
 */
export class FolderParticipants {
  constructor(private readonly client: WokuClient) {}

  /** The list and, per tool of the folder subtree, who answered. */
  get(folderId: string, opts?: RequestOptions): Promise<FolderParticipation> {
    return this.client.request<FolderParticipation>(
      'get',
      `/v1/folders/${encodeURIComponent(folderId)}/participants`,
      opts,
    );
  }

  /** Replace the whole list. */
  replace(
    folderId: string,
    text: string,
    opts?: RequestOptions,
  ): Promise<ParticipantsSaveResult> {
    return this.client.request<ParticipantsSaveResult>(
      'put',
      `/v1/folders/${encodeURIComponent(folderId)}/participants`,
      { ...opts, body: { text } },
    );
  }

  /** Add people; the ones already on the list are skipped. */
  add(
    folderId: string,
    text: string,
    opts?: RequestOptions,
  ): Promise<ParticipantsAddResult> {
    return this.client.request<ParticipantsAddResult>(
      'post',
      `/v1/folders/${encodeURIComponent(folderId)}/participants`,
      { ...opts, body: { text } },
    );
  }

  /** Remove one person (the `id` from `get`). */
  remove(
    folderId: string,
    participantId: string,
    opts?: RequestOptions,
  ): Promise<{ removed: true }> {
    return this.client.request<{ removed: true }>(
      'delete',
      `/v1/folders/${encodeURIComponent(folderId)}/participants/${encodeURIComponent(participantId)}`,
      opts,
    );
  }

  /** Delete the whole list. Responses are never touched. */
  clear(folderId: string, opts?: RequestOptions): Promise<{ deleted: true }> {
    return this.client.request<{ deleted: true }>(
      'delete',
      `/v1/folders/${encodeURIComponent(folderId)}/participants`,
      opts,
    );
  }

  /** Send a tool again to the people of the list who have not answered it. */
  resendToMissing(
    folderId: string,
    body: ResendToMissingParams,
    opts?: RequestOptions,
  ): Promise<ResendToMissingResult> {
    return this.client.request<ResendToMissingResult>(
      'post',
      `/v1/folders/${encodeURIComponent(folderId)}/participants/resend`,
      { ...opts, body },
    );
  }
}
