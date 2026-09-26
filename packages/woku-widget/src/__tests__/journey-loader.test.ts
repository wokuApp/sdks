import { afterEach, expect, it, vi } from 'vitest';
import { createIframeManager } from '../../loader/iframe';
afterEach(() => {
  document.body.innerHTML = '';
});
it('keeps contacts, credentials and journey tokens out of iframe URLs and rejects messages from other sources', () => {
  const callback = vi.fn();
  const manager = createIframeManager(
    {
      companyId: 'c1',
      triggers: [],
      publishableKey: 'pk_test',
      captureType: 'woku',
      wokuId: 'w1',
      email: 'private@example.com',
      phone: '56912345678',
      dispatchToken: 'jent_test',
      widgetBaseUrl: 'https://cdn.test/widget',
    },
    'modal',
    callback,
  );
  manager.show();
  const iframe = document.querySelector('iframe')!;
  for (const secret of ['pk_test', 'private', '56912345678', 'jent_test'])
    expect(iframe.src).not.toContain(secret);
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://cdn.test',
      source: window,
      data: { type: 'woku:submit', payload: {} },
    }),
  );
  expect(callback).not.toHaveBeenCalled();
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://cdn.test',
      source: iframe.contentWindow,
      data: { type: 'woku:ready' },
    }),
  );
  expect(callback).toHaveBeenCalledTimes(1);
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://other.test',
      source: iframe.contentWindow,
      data: { type: 'woku:ready' },
    }),
  );
  expect(callback).toHaveBeenCalledTimes(1);
  manager.destroy();
});
