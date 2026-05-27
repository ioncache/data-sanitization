import { mergeConfig } from 'vitest/config';
import { resolve } from 'node:path';
import baseConfig from '../../vitest.config.base';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      {
        find: 'data-sanitization/utils',
        replacement: resolve(
          import.meta.dirname,
          '../data-sanitization/src/utils.ts',
        ),
      },
      {
        find: 'data-sanitization',
        replacement: resolve(
          import.meta.dirname,
          '../data-sanitization/src/index.ts',
        ),
      },
    ],
  },
  test: {
    coverage: {
      exclude: ['src/types.ts'],
    },
  },
});
