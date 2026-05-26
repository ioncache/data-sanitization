import { mergeConfig } from 'vitest/config';
import { resolve } from 'node:path';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(baseConfig, {
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
    },
    exclude: ['scripts/**'],
  },
});
