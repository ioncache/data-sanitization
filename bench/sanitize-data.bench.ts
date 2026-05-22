/**
 * Benchmarks for sanitizeData covering four representative workloads.
 *
 * Run with: yarn bench
 *
 * These benchmarks establish a baseline for the current object-key and
 * string-matcher approach. Future items that affect this baseline:
 *   - String-value scanning in objectReplacer (per-field string matching on
 *     non-sensitive keys will increase per-object cost)
 *   - Parser-first JSON string handling (JSON.parse + objectReplacer path will
 *     change the string sanitization cost profile)
 * Update this suite as part of implementing those changes.
 */

import { bench, describe } from 'vitest';
import sanitizeData from '../src/index';

const SENSITIVE_STRING_VALUE = 'super-secret-value-that-should-be-masked';

describe('sanitizeData — shallow object', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    email: 'user@example.com',
    region: 'us-east-1',
    username: 'mark',
  };

  bench('mask one sensitive key in a 4-field object', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — deeply nested object', () => {
  const input = {
    level1: {
      level2: {
        level3: {
          api_key: SENSITIVE_STRING_VALUE,
          level4: {
            password: SENSITIVE_STRING_VALUE,
            username: 'mark',
          },
        },
        secret: SENSITIVE_STRING_VALUE,
      },
      token: SENSITIVE_STRING_VALUE,
    },
    password: SENSITIVE_STRING_VALUE,
  };

  bench('mask sensitive keys at 5 nesting levels', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — large array', () => {
  const input = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('mask one sensitive key across 1 000 array items', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — long string', () => {
  const pair = (i: number) =>
    `"password_${i}":"${SENSITIVE_STRING_VALUE}","safe_${i}":"value"`;
  const input = `{${Array.from({ length: 50 }, (_, i) => pair(i)).join(',')}}`;

  bench('mask 50 sensitive key/value pairs in a JSON string', () => {
    sanitizeData(input);
  });
});
