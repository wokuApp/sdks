import { afterEach, expect, it, vi } from 'vitest';
import { isInQuarantine } from '../../loader/quarantine';
import { registerTriggers } from '../../loader/triggers';
import '../../loader/index';
import type { WokuWidgetConfig } from '../../loader/types';

vi.mock('../../loader/quarantine', () => ({ isInQuarantine: vi.fn() }));
vi.mock('../../loader/triggers', () => ({
  registerTriggers: vi.fn(() => vi.fn()),
}));
afterEach(() => {
  window.WokuWidget.destroy();
  vi.clearAllMocks();
});
const config = (companyId: string): WokuWidgetConfig => ({
  companyId,
  publishableKey: 'pk_test',
  captureType: 'nps',
  triggers: [{ type: 'time', value: 5, behavior: 'modal' }],
});

it('ignores a previous initialization gate after destroy and a new denied initialization', async () => {
  let resolveOld!: (blocked: boolean) => void;
  vi.mocked(isInQuarantine)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    )
    .mockResolvedValueOnce(true);
  window.WokuWidget.init(config('old'));
  window.WokuWidget.destroy();
  window.WokuWidget.init(config('new'));
  await Promise.resolve();
  resolveOld(false);
  await Promise.resolve();
  expect(registerTriggers).not.toHaveBeenCalled();
});

it('registers triggers only once for a new allowed configuration after an old check completes', async () => {
  let resolveOld!: (blocked: boolean) => void;
  vi.mocked(isInQuarantine)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    )
    .mockResolvedValueOnce(false);
  window.WokuWidget.init(config('old'));
  window.WokuWidget.destroy();
  window.WokuWidget.init(config('new'));
  await Promise.resolve();
  resolveOld(false);
  await Promise.resolve();
  expect(registerTriggers).toHaveBeenCalledOnce();
});
