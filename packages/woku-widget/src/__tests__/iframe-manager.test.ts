import { afterEach, expect, it } from 'vitest';
import { createIframeManager } from '../../loader/iframe';

afterEach(() => {
  document.body.innerHTML = '';
});

const mount = (config: Record<string, unknown>) => {
  const manager = createIframeManager(
    {
      companyId: 'c',
      publishableKey: 'pk_test',
      triggers: [],
      ...config,
    } as never,
    'side-tab',
    () => undefined,
  );
  manager.show();
  return document.querySelector('iframe') as HTMLIFrameElement;
};

it('lets the widget record voice notes from its own origin', () => {
  const iframe = mount({ captureType: 'woku', wokuId: 'w1' });
  expect(iframe.getAttribute('allow')).toContain('microphone');
});

it('passes the CES and CSAT tool ids, and nothing sensitive, in the iframe URL', () => {
  const ces = new URL(
    mount({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' }).src,
  );
  expect(ces.searchParams.get('captureType')).toBe('ces');
  expect(ces.searchParams.get('cesToolId')).toBe('c1');
  expect(ces.search).not.toContain('ana');
  document.body.innerHTML = '';
  const csat = new URL(mount({ captureType: 'csat', csatToolId: 's1' }).src);
  expect(csat.searchParams.get('csatToolId')).toBe('s1');
});

it('lets the Powered by woku link open woku.app in a new tab, never the host page', () => {
  // Without allow-popups the sandbox silently drops every target="_blank"
  // click; escaping the sandbox lets woku.app run normally in that tab.
  const sandbox = (
    mount({ captureType: 'woku', wokuId: 'w1' }).getAttribute('sandbox') ?? ''
  ).split(/\s+/);
  expect(sandbox).toContain('allow-popups');
  expect(sandbox).toContain('allow-popups-to-escape-sandbox');
  expect(sandbox).not.toContain('allow-top-navigation');
});
