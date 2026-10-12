import type { WokuClient } from '../core/client';
import type { RequestOptions } from '../core/options';
import type { JourneyFoldersStatus } from '../models';

/**
 * Keep customer journeys in folders (`/v1/journey-folders`): `Viajes > journey >
 * moment`. Each journey and moment exposes its folder in `journeys.get`
 * (`folderId`, `momentFolders`).
 */
export class JourneyFolders {
  constructor(private readonly client: WokuClient) {}

  /** Whether the organization is on, running, and how much is still without a folder. */
  status(opts?: RequestOptions): Promise<JourneyFoldersStatus> {
    return this.client.request<JourneyFoldersStatus>(
      'get',
      '/v1/journey-folders',
      opts,
    );
  }

  /**
   * Switch the organization on and run the one-off pass in the background: tools
   * of existing journeys without a folder move into their moment folder, and
   * tools journeys create from now on are placed there. Tools that already have
   * a folder are never touched. Rejects with a conflict (409) while a pass is
   * already running; poll {@link status} for progress.
   */
  organize(opts?: RequestOptions): Promise<JourneyFoldersStatus> {
    return this.client.request<JourneyFoldersStatus>(
      'post',
      '/v1/journey-folders/organize',
      opts,
    );
  }
}
