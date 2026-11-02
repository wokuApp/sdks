import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { resolve } from 'path';

/**
 * Vite config for the micro-app served inside the iframe.
 * Produces index.html + hashed assets for deployment to cdn.woku.app.
 */
export default defineConfig({
  root: 'app',
  // Relative base so index.html references its assets as ./assets/... — this
  // makes the build portable under any CDN path prefix
  // (e.g. cdn.woku.app/sdks/woku-widget/v1/ and /v0.1.0/) without rebuilding.
  base: './',
  plugins: [react()],
  // Tailwind v4 generates the utility classes the micro-app uses. Without it
  // the shipped CSS carried none and the widget rendered unstyled.
  css: {
    postcss: {
      plugins: [tailwindcss({ base: resolve(__dirname, 'app') })],
    },
  },
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'app'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/app'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'app/index.html'),
    },
  },
});
