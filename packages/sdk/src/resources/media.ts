import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { Schemas } from '../types';

export interface MediaUploadParams {
  file: Blob | Uint8Array;
  filename: string;
  contentType?: string;
}
export type MediaUploadResult = Schemas['WokuMediaUploadResultDto'];

/** Local image/MP4 uploads for Wokus and journey moments. */
export class Media {
  constructor(private readonly client: WokuClient) {}

  upload(
    input: MediaUploadParams,
    opts?: RequestOptions,
  ): Promise<MediaUploadResult> {
    const file = new Blob(
      [input.file instanceof Blob ? input.file : new Uint8Array(input.file)],
      {
        type:
          input.contentType ??
          (input.file instanceof Blob ? input.file.type : ''),
      },
    );
    const body = new FormData();
    body.append('file', file, input.filename);
    // This endpoint has no idempotency ledger; uncertain uploads cannot be replayed.
    return this.client.request('post', '/v1/woku-media', {
      ...opts,
      body,
      maxRetries: 0,
    });
  }
}
