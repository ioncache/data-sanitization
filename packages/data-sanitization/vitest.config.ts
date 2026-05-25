import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  benchmark: {
    include: ['bench/**/*.bench.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    coverage: {
      exclude: ['src/constants.ts', 'src/types.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    exclude: ['dist/**', 'node_modules/**', 'scripts/**'],
    include: ['test/**/*.test.ts'],
  },
});
