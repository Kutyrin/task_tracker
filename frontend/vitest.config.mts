import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
});
