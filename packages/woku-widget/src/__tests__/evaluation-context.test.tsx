import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Root from '../../app/App';
import { useWidgetContext } from '../../app/contexts/WidgetContext';

vi.mock('../../app/components/Qualifier/Qualifier', () => ({
  Qualifier: () => {
    const ctx = useWidgetContext();
    return (
      <>
        <div data-testid="evaluation">
          {JSON.stringify({
            email: ctx.email,
            npsId: ctx.npsId,
            text: ctx.textnote,
          })}
        </div>
        <button
          onClick={() => {
            ctx.setNpsId('old-response');
            ctx.setTextnote('old-comment');
          }}
        >
          Remember feedback
        </button>
      </>
    );
  },
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const configure = (overrides: Record<string, unknown> = {}) =>
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'woku:config',
          payload: {
            companyId: 'c1',
            publishableKey: 'pk_test',
            captureType: 'nps',
            npsToolId: 'n1',
            email: 'first@example.com',
            dispatchToken: 'jent_first',
            behavior: 'modal',
            ...overrides,
          },
        },
      }),
    ),
  );
const setup = () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}')),
  );
  history.replaceState({}, '', '/?companyId=c1&captureType=nps&npsToolId=n1');
  render(<Root />);
};
const state = () =>
  JSON.parse(screen.getByTestId('evaluation').textContent ?? '{}');

it('initializes an identified contact when host config arrives after the URL fallback', async () => {
  vi.useFakeTimers();
  setup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
  configure();
  expect(state().email).toBe('first@example.com');
});

it('does not reuse a response or identity when the prepared evaluation changes', () => {
  setup();
  configure();
  fireEvent.click(screen.getByText('Remember feedback'));
  expect(state().npsId).toBe('old-response');
  configure({ email: 'second@example.com', dispatchToken: 'jent_second' });
  expect(state()).toEqual({ email: 'second@example.com' });
});

it('keeps progress for duplicate configuration or presentation-only changes', () => {
  setup();
  configure();
  fireEvent.click(screen.getByText('Remember feedback'));
  configure({ lang: 'en', theme: { primaryColor: '#4935ec' } });
  expect(state()).toMatchObject({
    email: 'first@example.com',
    npsId: 'old-response',
    text: 'old-comment',
  });
});

it.each([
  { apiBaseUrl: 'https://another-api.test' },
  { publishableKey: 'pk_other' },
])(
  'resets feedback when the API or authorization context changes: %j',
  (overrides) => {
    setup();
    configure();
    fireEvent.click(screen.getByText('Remember feedback'));
    configure(overrides);
    expect(state().npsId).toBeUndefined();
    expect(state().text).toBeUndefined();
  },
);
