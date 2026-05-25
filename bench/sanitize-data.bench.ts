/**
 * Benchmarks for sanitizeData.
 *
 * Run with: yarn bench
 *
 * Each group includes a "scanStringValues disabled" bench where the option
 * meaningfully changes behavior (i.e. the input has non-sensitive string
 * values). Cases without a disabled variant either have no non-sensitive
 * strings to scan (all-sensitive-key inputs) or use string input, which is
 * unaffected by the option.
 *
 * Array sizes span 1k / 10k / 100k / 1M items (one order of magnitude between
 * each step) to reveal whether throughput scales linearly with item count.
 * Both simple (3-field, 1 sensitive) and complex (10-field, 5 sensitive) item
 * shapes are included so per-item work is also varied.
 *
 * Additional groups cover:
 * - Cold start vs warm cache (regex compile cost on first call)
 * - removeMatches (mask vs delete) across object and string inputs
 * - Large non-sensitive string values (~10KB pre-filter cost)
 * - Object with an array-of-strings field (per-item string scan)
 * - String input variants (form-encoded, escaped JSON)
 * - Deeply nested objects with many non-sensitive strings per level
 * - Map and Set with sanitizeCollections: true
 */

import { bench, describe } from 'vitest';
import sanitizeData from '../src/index';

const SENSITIVE_STRING_VALUE = 'super-secret-value-that-should-be-masked';

// ~10KB non-sensitive string value — worst-case pre-filter scan cost
const LARGE_CLEAN_STRING = 'x'.repeat(10_000);

const FORM_ENCODED_STRING = `api_key=${SENSITIVE_STRING_VALUE}&region=us-east-1&username=mark`;

// Inner JSON is backslash-escaped, exercising escapedJsonMatcher
const ESCAPED_JSON_STRING = `{"event":"auth","data":"{\\"api_key\\":\\"${SENSITIVE_STRING_VALUE}\\",\\"user\\":\\"mark\\"}"}`;

const LOGS_CLEAN = Array.from(
  { length: 100 },
  (_, i) => `log entry ${i}: request processed`,
);
const LOGS_WITH_MATCH = Array.from({ length: 100 }, (_, i) =>
  i === 0
    ? `api_key=${SENSITIVE_STRING_VALUE}`
    : `log entry ${i}: request processed`,
);

// 5 nesting levels, each with 10 non-sensitive string fields + 1 nested key;
// innermost level has 10 non-sensitive strings + 1 sensitive key
const buildDeepNestedManySafe = (): object => {
  let inner: Record<string, unknown> = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 10 }, (_, i) => [
      `description_${i}`,
      `safe leaf value ${i}`,
    ]),
  ]);
  for (let d = 0; d < 5; d++) {
    inner = Object.fromEntries([
      ...Array.from({ length: 10 }, (_, i) => [
        `safe_str_${i}`,
        `level ${d} field ${i} safe text`,
      ]),
      ['nested', inner],
    ]);
  }
  return inner;
};
const DEEP_NESTED_MANY_SAFE = buildDeepNestedManySafe();

const STACK_TRACE_WITH_SECRETS = [
  `Error: upstream auth failed — api_key=${SENSITIVE_STRING_VALUE}`,
  '    at authenticate (/app/src/auth/service.js:89:15)',
  '    at processRequest (/app/src/handlers/api.js:134:20)',
  '    at middleware (/app/src/middleware/auth.js:57:11)',
  '    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)',
  '    at next (/app/node_modules/express/lib/router/route.js:137:13)',
  '    at Route.dispatch (/app/node_modules/express/lib/router/route.js:112:3)',
].join('\n');

const STACK_TRACE_CLEAN = [
  'Error: upstream auth failed — connection timeout',
  '    at authenticate (/app/src/auth/service.js:89:15)',
  '    at processRequest (/app/src/handlers/api.js:134:20)',
  '    at middleware (/app/src/middleware/auth.js:57:11)',
  '    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)',
  '    at next (/app/node_modules/express/lib/router/route.js:137:13)',
  '    at Route.dispatch (/app/node_modules/express/lib/router/route.js:112:3)',
].join('\n');

// ---------------------------------------------------------------------------
// Shallow object (4 fields)
// ---------------------------------------------------------------------------

describe('sanitizeData — shallow object, 1 sensitive key', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    email: 'user@example.com',
    region: 'us-east-1',
    username: 'mark',
  };

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — shallow object, 4 sensitive keys', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    password: SENSITIVE_STRING_VALUE,
    secret: SENSITIVE_STRING_VALUE,
    token: SENSITIVE_STRING_VALUE,
  };

  bench('default', () => {
    sanitizeData(input);
  });
});

// ---------------------------------------------------------------------------
// Deeply nested object (5 levels, multiple sensitive keys)
// ---------------------------------------------------------------------------

describe('sanitizeData — deeply nested object (5 levels)', () => {
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

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Log object — embedded credentials
// ---------------------------------------------------------------------------

describe('sanitizeData — log object, embedded credential in string value', () => {
  const input = {
    log_message: `request failed: api_key=${SENSITIVE_STRING_VALUE}`,
    request_id: 'req-abc-123',
    user_id: 'usr-456',
  };

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — log object, stack trace containing credentials', () => {
  const input = {
    environment: 'production',
    requestId: 'req-abc-123',
    service: 'auth-service',
    stack: STACK_TRACE_WITH_SECRETS,
    userId: 'usr-456',
  };

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — log object, clean stack trace', () => {
  const input = {
    environment: 'production',
    requestId: 'req-abc-123',
    service: 'auth-service',
    stack: STACK_TRACE_CLEAN,
    userId: 'usr-456',
  };

  bench('default (pre-filter fast-exit)', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Many embedded matches
// ---------------------------------------------------------------------------

describe('sanitizeData — many embedded matches (21 fields)', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 20 }, (_, i) => [
      `log_${i}`,
      `api_key=${SENSITIVE_STRING_VALUE}`,
    ]),
  ]) as Record<string, unknown>;

  bench('default', () => {
    sanitizeData(input);
  });
});

// ---------------------------------------------------------------------------
// Large flat object (50 fields)
// ---------------------------------------------------------------------------

describe('sanitizeData — large flat object, 1 sensitive key', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — large flat object, 5 sensitive keys', () => {
  const input = Object.fromEntries([
    ...Array.from({ length: 5 }, (_, i) => [
      `password_${i}`,
      SENSITIVE_STRING_VALUE,
    ]),
    ...Array.from({ length: 45 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Array — simple items (3 fields: id, token, username; 1 sensitive key)
// Sizes: 1k / 10k / 100k / 1M
// ---------------------------------------------------------------------------

describe('sanitizeData — array, simple items (1 sensitive), 1,000 items', () => {
  const input = Array.from({ length: 1_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, simple items (1 sensitive), 10,000 items', () => {
  const input = Array.from({ length: 10_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, simple items (1 sensitive), 100,000 items', () => {
  const input = Array.from({ length: 100_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, simple items (1 sensitive), 1,000,000 items', () => {
  const input = Array.from({ length: 1_000_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench.skip('default', () => {
    sanitizeData(input);
  });
  bench.skip('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Array — complex items (10 fields: 5 sensitive + 5 non-sensitive)
// Sizes: 1k / 10k / 100k / 1M
// ---------------------------------------------------------------------------

describe('sanitizeData — array, complex items (5 sensitive), 1,000 items', () => {
  const input = Array.from({ length: 1_000 }, (_, i) =>
    Object.fromEntries([
      ...Array.from({ length: 5 }, (_k, j) => [
        `password_${j}`,
        SENSITIVE_STRING_VALUE,
      ]),
      ['email', `user-${i}@example.com`],
      ['id', i],
      ['region', 'us-east-1'],
      ['status', 'active'],
      ['username', `user-${i}`],
    ]),
  );

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, complex items (5 sensitive), 10,000 items', () => {
  const input = Array.from({ length: 10_000 }, (_, i) =>
    Object.fromEntries([
      ...Array.from({ length: 5 }, (_k, j) => [
        `password_${j}`,
        SENSITIVE_STRING_VALUE,
      ]),
      ['email', `user-${i}@example.com`],
      ['id', i],
      ['region', 'us-east-1'],
      ['status', 'active'],
      ['username', `user-${i}`],
    ]),
  );

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, complex items (5 sensitive), 100,000 items', () => {
  const input = Array.from({ length: 100_000 }, (_, i) =>
    Object.fromEntries([
      ...Array.from({ length: 5 }, (_k, j) => [
        `password_${j}`,
        SENSITIVE_STRING_VALUE,
      ]),
      ['email', `user-${i}@example.com`],
      ['id', i],
      ['region', 'us-east-1'],
      ['status', 'active'],
      ['username', `user-${i}`],
    ]),
  );

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — array, complex items (5 sensitive), 1,000,000 items', () => {
  const input = Array.from({ length: 1_000_000 }, (_, i) =>
    Object.fromEntries([
      ...Array.from({ length: 5 }, (_k, j) => [
        `password_${j}`,
        SENSITIVE_STRING_VALUE,
      ]),
      ['email', `user-${i}@example.com`],
      ['id', i],
      ['region', 'us-east-1'],
      ['status', 'active'],
      ['username', `user-${i}`],
    ]),
  );

  bench.skip('default', () => {
    sanitizeData(input);
  });
  bench.skip('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Long JSON string (string input; scanStringValues has no effect)
// ---------------------------------------------------------------------------

describe('sanitizeData — long JSON string', () => {
  const pair = (i: number) =>
    `"password_${i}":"${SENSITIVE_STRING_VALUE}","safe_${i}":"value"`;
  const input = `{${Array.from({ length: 50 }, (_, i) => pair(i)).join(',')}}`;

  bench('default', () => {
    sanitizeData(input);
  });
});

// ---------------------------------------------------------------------------
// High pattern counts (50 custom patterns, default patterns disabled)
// ---------------------------------------------------------------------------

describe('sanitizeData — 50 custom patterns, 50-field object', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = Object.fromEntries([
    ['custom_0', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('default', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});

describe('sanitizeData — 50 custom patterns, 3-field object (no string match)', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    region: 'us-east-1',
    username: 'mark',
  };

  bench('default', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});

describe('sanitizeData — 50 custom patterns, 3-field object (string value hit)', () => {
  const customPatterns = Array.from({ length: 50 }, (_, i) => `custom_${i}`);
  const input = {
    log: 'custom_0=hunter2&other=safe',
    username: 'mark',
  };

  bench('default', () => {
    sanitizeData(input, { customPatterns, useDefaultPatterns: false });
  });
});

// ---------------------------------------------------------------------------
// Cold start vs warm cache
// ---------------------------------------------------------------------------

describe('sanitizeData — cold start vs warm cache (3-field object)', () => {
  let n = 0;
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    region: 'us-east-1',
    username: 'mark',
  };

  bench('warm cache (same options each call)', () => {
    sanitizeData(input);
  });
  // Each call uses a unique customPattern, forcing a fresh regex compile and
  // cache insertion — measures first-call overhead with no warmup benefit.
  bench('cold start (unique options per call)', () => {
    sanitizeData(input, { customPatterns: [`__cold_${n++}`] });
  });
});

// ---------------------------------------------------------------------------
// removeMatches: mask vs remove
// ---------------------------------------------------------------------------

describe('sanitizeData — removeMatches, shallow object (4 fields)', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    email: 'user@example.com',
    region: 'us-east-1',
    username: 'mark',
  };

  bench('mask (default)', () => {
    sanitizeData(input);
  });
  bench('remove', () => {
    sanitizeData(input, { removeMatches: true });
  });
});

describe('sanitizeData — removeMatches, large flat object (50 fields)', () => {
  const input = Object.fromEntries([
    ['api_key', SENSITIVE_STRING_VALUE],
    ...Array.from({ length: 49 }, (_, i) => [`field_${i}`, `value_${i}`]),
  ]) as Record<string, unknown>;

  bench('mask (default)', () => {
    sanitizeData(input);
  });
  bench('remove', () => {
    sanitizeData(input, { removeMatches: true });
  });
});

describe('sanitizeData — removeMatches, array (1,000 items, 1 sensitive)', () => {
  const input = Array.from({ length: 1_000 }, (_, i) => ({
    id: i,
    token: SENSITIVE_STRING_VALUE,
    username: `user-${i}`,
  }));

  bench('mask (default)', () => {
    sanitizeData(input);
  });
  bench('remove', () => {
    sanitizeData(input, { removeMatches: true });
  });
});

describe('sanitizeData — removeMatches, form-encoded string', () => {
  bench('mask (default)', () => {
    sanitizeData(FORM_ENCODED_STRING);
  });
  bench('remove', () => {
    sanitizeData(FORM_ENCODED_STRING, { removeMatches: true });
  });
});

// ---------------------------------------------------------------------------
// Large non-sensitive string value (~10KB)
// ---------------------------------------------------------------------------

describe('sanitizeData — large non-sensitive string value (10KB)', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    report: LARGE_CLEAN_STRING,
  };

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Object with array-of-strings field (100 log lines)
// ---------------------------------------------------------------------------

describe('sanitizeData — object with array-of-strings, 100 clean log lines', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    logs: LOGS_CLEAN,
  };

  bench('default', () => {
    sanitizeData(input);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(input, { scanStringValues: false });
  });
});

describe('sanitizeData — object with array-of-strings, 1 match in 100 log lines', () => {
  const input = {
    api_key: SENSITIVE_STRING_VALUE,
    logs: LOGS_WITH_MATCH,
  };

  bench('default', () => {
    sanitizeData(input);
  });
});

// ---------------------------------------------------------------------------
// String input variants (form-encoded, escaped JSON)
// ---------------------------------------------------------------------------

describe('sanitizeData — form-encoded string input', () => {
  bench('mask (default)', () => {
    sanitizeData(FORM_ENCODED_STRING);
  });
  bench('remove', () => {
    sanitizeData(FORM_ENCODED_STRING, { removeMatches: true });
  });
});

describe('sanitizeData — escaped JSON string input', () => {
  bench('mask (default)', () => {
    sanitizeData(ESCAPED_JSON_STRING);
  });
  bench('remove', () => {
    sanitizeData(ESCAPED_JSON_STRING, { removeMatches: true });
  });
});

// ---------------------------------------------------------------------------
// Deeply nested, 5 levels × 10 non-sensitive string fields per level
// ---------------------------------------------------------------------------

describe('sanitizeData — deeply nested, many non-sensitive strings (5 × 10 fields)', () => {
  bench('default', () => {
    sanitizeData(DEEP_NESTED_MANY_SAFE);
  });
  bench('scanStringValues disabled', () => {
    sanitizeData(DEEP_NESTED_MANY_SAFE, { scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Map — shallow (1 sensitive key, 3 safe keys)
// Comparable to the shallow object benchmark above.
// ---------------------------------------------------------------------------

describe('sanitizeData — Map, shallow (1 sensitive key)', () => {
  const input = {
    session: new Map([
      ['api_key', SENSITIVE_STRING_VALUE],
      ['email', 'user@example.com'],
      ['region', 'us-east-1'],
      ['username', 'mark'],
    ]),
  };

  bench('sanitizeCollections enabled', () => {
    sanitizeData(input, { sanitizeCollections: true });
  });
  bench('sanitizeCollections enabled, scanStringValues disabled', () => {
    sanitizeData(input, { sanitizeCollections: true, scanStringValues: false });
  });
});

// ---------------------------------------------------------------------------
// Set — small (1 embedded-pattern string, 2 clean strings)
// Comparable to the array-of-strings benchmark above.
// ---------------------------------------------------------------------------

describe('sanitizeData — Set, small string values (1 embedded pattern)', () => {
  const input = {
    tags: new Set([
      `api_key=${SENSITIVE_STRING_VALUE}`,
      'env=production',
      'region=us-east-1',
    ]),
  };

  bench('sanitizeCollections enabled', () => {
    sanitizeData(input, { sanitizeCollections: true });
  });
});

// ---------------------------------------------------------------------------
// parseJsonStrings: true vs false — string input containing JSON
// ---------------------------------------------------------------------------

describe('sanitizeData — JSON string, small (parseJsonStrings)', () => {
  const input = JSON.stringify({
    api_key: SENSITIVE_STRING_VALUE,
    email: 'user@example.com',
    region: 'us-east-1',
    requestId: 'req-abc-123',
    username: 'mark',
  });

  bench('parseJsonStrings disabled', () => {
    sanitizeData(input);
  });
  bench('parseJsonStrings enabled', () => {
    sanitizeData(input, { parseJsonStrings: true });
  });
});

describe('sanitizeData — JSON string, large (parseJsonStrings)', () => {
  const input = JSON.stringify(
    Object.fromEntries([
      ...Array.from({ length: 40 }, (_, i) => [`field_${i}`, `value ${i}`]),
      ...Array.from({ length: 5 }, (_, i) => [
        `secret_${i}`,
        SENSITIVE_STRING_VALUE,
      ]),
      ...Array.from({ length: 5 }, (_, i) => [`token_${i}`, i * 1000]),
    ]),
  );

  bench('parseJsonStrings disabled', () => {
    sanitizeData(input);
  });
  bench('parseJsonStrings enabled', () => {
    sanitizeData(input, { parseJsonStrings: true });
  });
});

// ---------------------------------------------------------------------------
// Option interaction: parseJsonStrings × scanStringValues
// Representative log payload: 15 fields, 6 sensitive keys, 1 embedded
// credential in a non-sensitive field, 1 stack trace, 7 safe fields.
// ---------------------------------------------------------------------------

describe('sanitizeData — option interaction (parseJsonStrings × scanStringValues)', () => {
  const input = JSON.stringify({
    api_key: SENSITIVE_STRING_VALUE,
    api_secret: SENSITIVE_STRING_VALUE,
    auth_token: SENSITIVE_STRING_VALUE,
    environment: 'production',
    message: `request failed: api_key=${SENSITIVE_STRING_VALUE}`,
    method: 'POST',
    password: SENSITIVE_STRING_VALUE,
    path: '/api/v1/users',
    region: 'us-east-1',
    requestId: 'req-abc-123',
    secret: SENSITIVE_STRING_VALUE,
    service: 'api-gateway',
    stack:
      'Error: Connection refused\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1148:16)\n    at Object.onceWrapper (events.js:422:26)\n    at TCPConnectWrap.emit (events.js:400:28)',
    token: SENSITIVE_STRING_VALUE,
    username: 'mark',
  });

  bench('parseJsonStrings off, scanStringValues on (default)', () => {
    sanitizeData(input);
  });
  bench('parseJsonStrings off, scanStringValues off', () => {
    sanitizeData(input, { scanStringValues: false });
  });
  bench('parseJsonStrings on, scanStringValues on', () => {
    sanitizeData(input, { parseJsonStrings: true });
  });
  bench('parseJsonStrings on, scanStringValues off', () => {
    sanitizeData(input, { parseJsonStrings: true, scanStringValues: false });
  });
});
