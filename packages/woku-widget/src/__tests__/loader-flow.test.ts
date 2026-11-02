/**
 * The loader around a real trigger: the thank-you step stays visible for a
 * moment after a submit, and host listeners hear every lifecycle event.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../../loader/index';

const BASE = 'https://cdn.test/widget';

const fromIframe = (type: string, payload?: unknown) => {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement;
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://cdn.test',
      source: iframe.contentWindow,
      data: { type, payload },
    }),
  );
};

const overlay = () =>
  document.querySelector('iframe')?.parentElement as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  window.WokuWidget.init({
    companyId: 'c',
    publishableKey: 'pk_test',
    captureType: 'ces',
    cesToolId: 'c1',
    widgetBaseUrl: BASE,
    startOpen: true,
    triggers: [
      { type: 'custom-event', value: 'open-listening', behavior: 'side-tab' },
    ],
  });
});

afterEach(() => {
  window.WokuWidget.destroy();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const openWidget = async () => {
  window.dispatchEvent(new Event('open-listening'));
  await vi.advanceTimersByTimeAsync(0);
  fromIframe('woku:ready');
};

it('keeps the thank-you step on screen for 10 s after a submit, then hides', async () => {
  // Long enough to read it and to follow "Powered by woku".
  const submitted = vi.fn();
  window.WokuWidget.on('submit', submitted);
  await openWidget();
  fromIframe('woku:submit', { score: 4 });
  expect(submitted).toHaveBeenCalledWith({ score: 4 });
  await vi.advanceTimersByTimeAsync(9000);
  expect(overlay().style.display).not.toBe('none');
  await vi.advanceTimersByTimeAsync(1500);
  expect(overlay().style.display).toBe('none');
});

it('does not fold away a new rating started during the thank-you step', async () => {
  // "Rate again" (or a host show()) inside the 10 s must keep the widget.
  await openWidget();
  fromIframe('woku:submit', { score: 4 });
  await vi.advanceTimersByTimeAsync(3000);
  fromIframe('woku:open');
  await vi.advanceTimersByTimeAsync(10_000);
  expect(overlay().style.display).not.toBe('none');
});

it('hides at once when the person closes the widget', async () => {
  const closed = vi.fn();
  window.WokuWidget.on('close', closed);
  await openWidget();
  fromIframe('woku:close');
  expect(closed).toHaveBeenCalled();
  expect(overlay().style.display).toBe('none');
});

it('relays the open the micro-app announces when it opens by itself', async () => {
  const opened = vi.fn();
  window.WokuWidget.on('open', opened);
  await openWidget();
  fromIframe('woku:open');
  expect(opened).toHaveBeenCalledTimes(1);
});
