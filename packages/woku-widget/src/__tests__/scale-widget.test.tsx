/**
 * The widget end to end inside its iframe document: CES and CSAT render the
 * tool's question on a 1-5 scale, and a score is never lost when the person
 * skips the optional comment (CES, CSAT and NPS).
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Root from '../../app/App';

type Route = { method: string; url: string; body: unknown };
let calls: Route[] = [];
let posted: unknown[] = [];

const respond = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });

beforeEach(() => {
  calls = [];
  posted = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(window.parent, 'postMessage').mockImplementation(
    (message: unknown) => {
      posted.push(message);
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (url.includes('/v1/ces-tool/'))
        return respond({
          _id: 'c1',
          question: '¿Qué tan fácil fue empezar a medir con woku?',
          action: 'empezar',
        });
      if (url.includes('/v1/csat-tool/'))
        return respond({
          _id: 's1',
          question: '¿Qué tan satisfecho estás con la demo?',
        });
      if (url.includes('/v1/nps-tool/'))
        return respond({
          _id: 'n1',
          npsMessage: 'woku',
          audienceType: 'un colega',
        });
      if (method === 'POST' && url.endsWith('/v1/ces'))
        return respond({ cesId: 'r-ces' });
      if (method === 'POST' && url.endsWith('/v1/csat'))
        return respond({ csatId: 'r-csat' });
      if (method === 'POST' && url.endsWith('/v1/nps'))
        return respond({ npsId: 'r-nps' });
      return respond({});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const configure = (payload: Record<string, unknown>) => {
  history.replaceState(
    {},
    '',
    `/?companyId=c&captureType=${String(payload.captureType)}`,
  );
  render(<Root />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'woku:config',
          payload: {
            companyId: 'c',
            publishableKey: 'pk_test',
            lang: 'es',
            behavior: 'side-tab',
            startOpen: true,
            ...payload,
          },
        },
      }),
    ),
  );
};

const submitted = () =>
  posted.some(
    (message) => (message as { type?: string })?.type === 'woku:submit',
  );

it('shows the CES tool question on a 1-5 effort scale', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
  expect(
    await screen.findByText('¿Qué tan fácil fue empezar a medir con woku?'),
  ).toBeTruthy();
  for (const score of ['1', '2', '3', '4', '5'])
    expect(
      screen.getByRole('radio', { name: new RegExp(`^${score}`) }),
    ).toBeTruthy();
  expect(screen.getByText('Muy difícil')).toBeTruthy();
  expect(screen.getByText('Muy fácil')).toBeTruthy();
  expect(calls.find((c) => c.url.includes('/v1/ces-tool/c1'))?.url).toContain(
    'lang=es',
  );
});

it('sends the CES score when the person skips the comment', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
  fireEvent.click(await screen.findByRole('radio', { name: /^4/ }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Enviar sin comentario' }),
  );
  await waitFor(() =>
    expect(
      calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/ces'))?.body,
    ).toEqual(
      expect.objectContaining({
        cesToolId: 'c1',
        score: 4,
        clientEmail: 'ana@acme.com',
      }),
    ),
  );
  await waitFor(() => expect(submitted()).toBe(true));
  expect(calls.some((c) => c.url.includes('/textnotes'))).toBe(false);
});

it('sends a CSAT score with its comment', async () => {
  configure({ captureType: 'csat', csatToolId: 's1', email: 'ana@acme.com' });
  expect(
    await screen.findByText('¿Qué tan satisfecho estás con la demo?'),
  ).toBeTruthy();
  expect(screen.getByText('Muy insatisfecho/a')).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /^5/ }));
  fireEvent.change(await screen.findByRole('textbox'), {
    target: { value: 'Muy clara' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar Feedback' }));
  await waitFor(() =>
    expect(
      calls.find((c) => c.url.endsWith('/v1/csat/r-csat/textnotes'))?.body,
    ).toEqual({
      description: 'Muy clara',
    }),
  );
  expect(
    calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/csat'))?.body,
  ).toEqual(expect.objectContaining({ csatToolId: 's1', score: 5 }));
});

it('keeps the NPS score when the person skips the comment', async () => {
  configure({ captureType: 'nps', npsToolId: 'n1', email: 'ana@acme.com' });
  fireEvent.click(await screen.findByRole('radio', { name: '8' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Enviar sin comentario' }),
  );
  await waitFor(() =>
    expect(
      calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/nps'))?.body,
    ).toEqual(expect.objectContaining({ score: 8, npsToolId: 'n1' })),
  );
  await waitFor(() => expect(submitted()).toBe(true));
});

it('asks the NPS question of the tool when it has one', async () => {
  configure({ captureType: 'nps', npsToolId: 'n1' });
  expect(
    await screen.findByText(
      'En una escala de 0 a 10, ¿qué tan probable es que recomiendes woku a un colega?',
    ),
  ).toBeTruthy();
});

it('keeps a side-tab collapsed until clicked when startOpen is not set', async () => {
  history.replaceState({}, '', '/?companyId=c&captureType=ces');
  render(<Root />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        data: {
          type: 'woku:config',
          payload: {
            companyId: 'c',
            publishableKey: 'pk_test',
            lang: 'es',
            behavior: 'side-tab',
            captureType: 'ces',
            cesToolId: 'c1',
          },
        },
      }),
    ),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Abrir feedback' }),
  );
  expect(
    await screen.findByText('¿Qué tan fácil fue empezar a medir con woku?'),
  ).toBeTruthy();
});

it('tells the host it opened when startOpen opens the panel by itself', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1' });
  await screen.findByText('¿Qué tan fácil fue empezar a medir con woku?');
  expect(
    posted.some(
      (message) => (message as { type?: string })?.type === 'woku:open',
    ),
  ).toBe(true);
});

it('does not offer to rate again to a person invited by email', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
  fireEvent.click(await screen.findByRole('radio', { name: /^4/ }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Enviar sin comentario' }),
  );
  expect(await screen.findByText('¡Gracias por tu Opinión!')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Volver a Calificar' }),
  ).toBeNull();
});

it('measures its content, not the iframe, so a side-tab grows to the open panel', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1' });
  const question = await screen.findByText(
    '¿Qué tan fácil fue empezar a medir con woku?',
  );
  // The resize observer watches the outermost container: it must shrink-wrap
  // its content (jsdom has no layout, so the class is the contract here).
  const container = question.closest('.font-sans') as HTMLElement;
  expect(container.className).toContain('w-max');
});

it('closes with Escape, keeping the close button inside the panel', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1' });
  await screen.findByText('¿Qué tan fácil fue empezar a medir con woku?');
  const close = screen.getByRole('button', { name: 'Cerrar widget' });
  expect(close.className).not.toContain('-top-');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(
    posted.some(
      (message) => (message as { type?: string })?.type === 'woku:close',
    ),
  ).toBe(true);
});

it('keeps the rating hint inside the panel for every capture type', async () => {
  // The iframe clips what is drawn outside the panel, and the panel is as
  // tall as its content: the hint's room must be part of that content.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    for (const [config, hint] of [
      [{ captureType: 'ces', cesToolId: 'c1' }, 'Selecciona del 1 al 5'],
      [
        { captureType: 'nps', npsToolId: 'n1' },
        'Selecciona un puntaje del 0 al 10',
      ],
    ] as const) {
      cleanup();
      configure(config);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      const bubble = (await screen.findByText(hint)).closest(
        '.absolute.inset-x-0',
      ) as HTMLElement;
      expect(bubble.className).not.toMatch(/-bottom-/);
      expect((bubble.parentElement as HTMLElement).className).toContain(
        'pb-10',
      );
    }
  } finally {
    vi.useRealTimers();
  }
});
