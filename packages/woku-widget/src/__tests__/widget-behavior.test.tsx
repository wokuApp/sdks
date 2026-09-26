import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Root from '../../app/App';
import { registerTriggers } from '../../loader/triggers';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('publishes the selected trigger behavior before injecting its iframe', async () => {
  vi.useFakeTimers();
  const fire = vi.fn(() =>
    expect((window as unknown as Record<string, unknown>).__wokuBehavior).toBe(
      'side-tab',
    ),
  );
  const stop = registerTriggers(
    [{ type: 'time', value: 0, behavior: 'side-tab' }],
    fire,
  );
  await vi.advanceTimersByTimeAsync(1);
  expect(fire).toHaveBeenCalledOnce();
  stop();
});
it('opens the actual qualifier when the parent sends modal configuration', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            _id: 'w1',
            description: 'Delivery',
            anonymousDisabled: true,
          }),
        ),
    ),
  );
  history.replaceState({}, '', '/?companyId=c1&captureType=woku&wokuId=w1');
  render(<Root />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'woku:config',
          payload: {
            companyId: 'c1',
            captureType: 'woku',
            wokuId: 'w1',
            publishableKey: 'pk_test',
            lang: 'en',
            behavior: 'modal',
          },
        },
      }),
    ),
  );
  expect(await screen.findByRole('radio', { name: '5' })).toBeTruthy();
});
