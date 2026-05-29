import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite config for the micro-app served inside the iframe.
 * Produces index.html + hashed assets for deployment to cdn.woku.app.
 */
export default defineConfig({
  root: 'app',
  plugins: [react()],
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
