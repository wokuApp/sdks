import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    alias: {
      '@app': resolve(__dirname, 'app'),
      '@loader': resolve(__dirname, 'loader'),
    },
  },
});
