// @vitest-environment node
/**
 * The micro-app is styled with Tailwind v4. Without its PostCSS plugin in the
 * Vite build, the CSS shipped to the CDN had no utility classes at all and the
 * widget rendered unstyled (0.3.1 on cdn.woku.app).
 */
import { expect, it } from 'vitest';
import config from '../../vite.app.config';

it('runs Tailwind on the app CSS when building', () => {
  const plugins = (config as { css?: { postcss?: { plugins?: unknown[] } } })
    .css?.postcss?.plugins;
  const names = (plugins ?? []).map(
    (plugin) => (plugin as { postcssPlugin?: string }).postcssPlugin,
  );
  expect(names).toContain('@tailwindcss/postcss');
});
