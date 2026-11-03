import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'apps/*/dev-server/**/*.test.ts',
      'apps/*/*.test.ts',
      'templates/*.test.ts',
    ],
    exclude: ['**/template/**'],
  },
});
