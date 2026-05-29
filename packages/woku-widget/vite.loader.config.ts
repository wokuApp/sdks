import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite config for the lightweight loader script (~3-5 KB gzipped).
 * Pure vanilla JS/TS — no React, no framework.
 * Built as IIFE so it self-executes when included via <script>.
 */
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'dist/loader'),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'loader/index.ts'),
      name: 'WokuWidget',
      formats: ['iife'],
      fileName: () => 'loader.js',
    },
    rollupOptions: {
      output: {
        // No external deps in the loader — keep it self-contained.
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        passes: 2,
      },
      mangle: true,
    },
    // Target modern browsers (same as Vite default)
    target: 'es2017',
  },
});
