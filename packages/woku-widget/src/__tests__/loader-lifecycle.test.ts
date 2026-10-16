import { afterEach, expect, it, vi } from 'vitest';
import { registerTriggers } from '../../loader/triggers';
import '../../loader/index';
import type { WokuWidgetConfig } from '../../loader/types';

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

it('registers the triggers right away, without a quarantine request', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  window.WokuWidget.init(config('company'));
  expect(registerTriggers).toHaveBeenCalledOnce();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

it('registers triggers once per initialization after a destroy', () => {
  window.WokuWidget.init(config('old'));
  window.WokuWidget.destroy();
  window.WokuWidget.init(config('new'));
  expect(registerTriggers).toHaveBeenCalledTimes(2);
});
