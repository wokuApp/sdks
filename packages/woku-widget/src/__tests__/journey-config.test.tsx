import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Root from '../../app/App';
import { mergeConfig } from '../../app/config';
import { onHostMessage } from '../../app/bridge';

vi.mock('../../app/contexts/WidgetContext', () => ({
  WidgetProvider: ({ config }: { config: unknown }) => (
    <div data-testid="config">{JSON.stringify(config)}</div>
  ),
  useWidgetContext: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('keeps postMessage credentials and journey context after the URL fallback deadline', async () => {
  vi.useFakeTimers();
  history.replaceState({}, '', '/?companyId=c1&captureType=woku&wokuId=w1');
  render(<Root />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        origin: 'https://host.test',
        data: {
          type: 'woku:config',
          payload: {
            companyId: 'c1',
            publishableKey: 'pk_test',
            captureType: 'woku',
            wokuId: 'w1',
            dispatchToken: 'jent_test',
          },
        },
      }),
    ),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
  const config = JSON.parse(screen.getByTestId('config').textContent ?? '{}');
  expect(config.publishableKey).toBe('pk_test');
  expect(config.dispatchToken).toBe('jent_test');
});

it('preserves preidentified contact and the response token when merging config', () => {
  const merged = mergeConfig(
    {},
    {
      companyId: 'c1',
      publishableKey: 'pk_test',
      email: 'client+journey@example.com',
      phone: '56912345678',
      dispatchToken: 'jent_test',
    },
  );
  expect(merged).toMatchObject({
    email: 'client+journey@example.com',
    phone: '56912345678',
    dispatchToken: 'jent_test',
  });
});

it('ignores configuration messages from a sibling or unrelated window', () => {
  const handler = vi.fn();
  const stop = onHostMessage(handler);
  try {
    window.dispatchEvent(
      new MessageEvent('message', {
        source: null,
        data: { type: 'woku:config', payload: { publishableKey: 'bad' } },
      }),
    );
    expect(handler).not.toHaveBeenCalled();
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        data: { type: 'woku:config', payload: { publishableKey: 'pk_test' } },
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  } finally {
    stop();
  }
});
