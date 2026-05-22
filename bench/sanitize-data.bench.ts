/**
 * Benchmarks for sanitizeData.
 *
 * Run with: yarn bench
 *
 * Cases marked "scanStringValues disabled" run with the opt-out flag so you
 * can directly compare the cost of string-value scanning on the same input.
 * The regression on object workloads is the cost of testing every non-sensitive
 * string value against the OR pre-filter; string and array workloads are
 * unaffected because they do not use objectReplacer.
 *
 * Update this suite as part of implementing parser-first JSON string handling
 * (JSON.parse + objectReplacer path will change the string sanitization cost
 * profile).
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

describe('sanitizeData — shallow object, scanStringValues disabled', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    email: 'user@example.com',
    region: 'us-east-1',
    username: 'mark',
  };

  bench('mask one sensitive key in a 4-field object (no string scan)', () => {
    sanitizeData(input, { scanStringValues: false });
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

  bench('mask one sensitive key across 1000 array items', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — object with embedded credentials', () => {
  const input = {
    log_message: `request failed: api_key=${SENSITIVE_STRING_VALUE}`,
    request_id: 'req-abc-123',
    user_id: 'usr-456',
  };

  bench('3-field object with embedded sensitive pattern in string value', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — object with embedded credentials, scanStringValues disabled', () => {
  const input = {
    log_message: `request failed: api_key=${SENSITIVE_STRING_VALUE}`,
    request_id: 'req-abc-123',
    user_id: 'usr-456',
  };

  bench('3-field object with embedded sensitive pattern (no string scan)', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — many embedded matches', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 20 }, (_, i) => [
      `log_${i}`,
      `api_key=${SENSITIVE_STRING_VALUE}`,
    ]),
  ]) as Record<string, unknown>;

  bench('mask 1 sensitive key and 20 string values containing embedded patterns', () => {
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

describe('sanitizeData — large flat object', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('mask one sensitive key in a 50-field object', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — large flat object, scanStringValues disabled', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('mask one sensitive key in a 50-field object (no string scan)', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — wide object with many patterns', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = Object.fromEntries([
    ['custom_0', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('50-field object scanned against 50 custom patterns', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});

describe('sanitizeData — very large array', () => {
  const input = Array.from({ length: 100_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('mask one sensitive key across 100,000 array items', () => {
    sanitizeData(input);
  });
});

describe('sanitizeData — 50 custom patterns', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    region: 'us-east-1',
    username: 'mark',
  };

  bench('mask with 50 custom patterns (default patterns disabled)', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});

describe('sanitizeData — 50 custom patterns with string match', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = {
    log: 'custom_0=hunter2&other=safe',
    username: 'mark',
  };

  bench('scan string value through 50-pattern suite', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});
