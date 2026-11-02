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
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
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
  expect(await screen.findByText('¡Gracias por tu opinión!')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Volver a calificar' }),
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

it('looks like the woku review page: boxed scale, square buttons, dark hint', async () => {
  // Same visual language as review.woku.app, the page respondents already
  // know: no pill buttons, no grey circles, no bright indigo bubbles.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    const option = await screen.findByRole('radio', { name: /^4/ });
    expect(option.className).toMatch(/\brounded-lg\b/);
    expect(option.className).toMatch(/\bborder\b/);
    expect(option.className).not.toMatch(/rounded-full/);
    const hint = (await screen.findByText('Selecciona del 1 al 5'))
      .parentElement as HTMLElement;
    expect(hint.className).toContain('bg-neutral-900');
    expect(hint.className).not.toContain('bg-indigo-600');

    fireEvent.click(option);
    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: 'Fácil' },
    });
    const send = screen.getByRole('button', { name: 'Enviar' });
    expect(send.className).toMatch(/\brounded-md\b/);
    expect(send.className).not.toMatch(/rounded-full/);
    const skip = screen.getByRole('button', { name: 'Enviar sin comentario' });
    expect(skip.className).toMatch(/\brounded-md\b/);
    expect(skip.className).toMatch(/\bborder\b/);
  } finally {
    vi.useRealTimers();
  }
});

it('offers voice notes with a round icon button next to the secondary action', async () => {
  const base = fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).includes('/v1/wokus/w1/review')
      ? Promise.resolve(
          respond({
            woku: { _id: 'w1', description: 'Tus primeras opiniones en woku' },
            users: [],
            company: {},
          }),
        )
      : base(input, init),
  );
  configure({ captureType: 'woku', wokuId: 'w1', email: 'ana@acme.com' });
  await screen.findByText('Tus primeras opiniones en woku');
  fireEvent.click(screen.getByRole('radio', { name: /^4/ }));
  const mic = await screen.findByRole('button', {
    name: 'Presiona para grabar audio',
  });
  expect(mic.className).toMatch(/\brounded-full\b/);
  expect(mic.className).toContain('bg-indigo-700');
  const skip = screen.getByRole('button', { name: 'Omitir' });
  expect(skip.className).toMatch(/\brounded-md\b/);
  expect(skip.parentElement).toBe(mic.parentElement?.parentElement ?? null);
  expect(
    screen.getByRole('button', { name: 'Escribe o graba tu opinión' }),
  ).toBeTruthy();
});

const withWokuReview = () => {
  const base = fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).includes('/v1/wokus/w1/review')
      ? Promise.resolve(
          respond({
            woku: {
              _id: 'w1',
              description: 'Tus primeras opiniones en woku',
              imageUrl: 'https://cdn.test/woku.png',
            },
            users: [],
            company: {},
          }),
        )
      : base(input, init),
  );
};

it('fits the woku image like review: blurred cover behind, whole image on top, no border', async () => {
  withWokuReview();
  configure({ captureType: 'woku', wokuId: 'w1', email: 'ana@acme.com' });
  const image = await screen.findByRole('img', {
    name: 'Tus primeras opiniones en woku',
  });
  expect(image.className).toContain('object-contain');
  const frame = image.parentElement as HTMLElement;
  expect(frame.className).toContain('h-20');
  expect(frame.className).not.toMatch(/\bborder\b/);
  const backdrop = frame.querySelector('img[aria-hidden="true"]');
  expect(backdrop?.getAttribute('src')).toBe('https://cdn.test/woku.png');
  expect(backdrop?.className).toContain('object-cover');
  expect(backdrop?.className).toContain('blur');
});

const poweredBy = () =>
  screen.getByRole('link', { name: /powered by/i }) as HTMLAnchorElement;

it('signs every step with the woku logo, opening woku.app in a new tab', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
  await screen.findByRole('radio', { name: /^4/ });
  const link = poweredBy();
  expect(link.querySelector('svg')).toBeTruthy();
  expect(link.target).toBe('_blank');
  expect(link.rel).toContain('noopener');
  const url = new URL(link.href);
  expect(url.origin).toBe('https://woku.app');
  expect(url.searchParams.get('utm_source')).toBe('widget');
  expect(url.searchParams.get('utm_medium')).toBe('powered_by');
  expect(url.searchParams.get('utm_campaign')).toBe('ces');

  // The thank-you step keeps it.
  fireEvent.click(screen.getByRole('radio', { name: /^4/ }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Enviar sin comentario' }),
  );
  await screen.findByText(/gracias/i);
  expect(poweredBy().querySelector('svg')).toBeTruthy();
});

it('leaves the woku mark out when the host turns branding off', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', branding: false });
  await screen.findByRole('radio', { name: /^4/ });
  expect(screen.queryByRole('link', { name: /powered by/i })).toBeNull();
});

it('shows the chosen score above the comment and lets the person change it', async () => {
  configure({ captureType: 'ces', cesToolId: 'c1', email: 'ana@acme.com' });
  fireEvent.click(await screen.findByRole('radio', { name: /^4/ }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Cambiar tu calificación: 4' }),
  );
  // Back on the scale, with the previous choice still marked.
  const previous = await screen.findByRole('radio', { name: /^4/ });
  expect(previous.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('radio', { name: /^2/ }));
  await screen.findByRole('button', { name: 'Cambiar tu calificación: 2' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar sin comentario' }),
  );
  await waitFor(() =>
    expect(
      calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/ces'))?.body,
    ).toEqual(expect.objectContaining({ score: 2 })),
  );
});

it('shows the chosen stars above the woku comment', async () => {
  withWokuReview();
  configure({ captureType: 'woku', wokuId: 'w1', email: 'ana@acme.com' });
  await screen.findByText('Tus primeras opiniones en woku');
  fireEvent.click(screen.getByRole('radio', { name: /^4/ }));
  const change = await screen.findByRole('button', {
    name: 'Cambiar tu calificación: 4',
  });
  expect(change.querySelectorAll('svg.fill-yellow-500')).toHaveLength(4);
});
