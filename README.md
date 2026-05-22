# data-sanitization

[![Node CI](https://github.com/ioncache/data-sanitization/actions/workflows/ci.yml/badge.svg)](https://github.com/ioncache/data-sanitization/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/ioncache/e2afdd1c4942b8c99362ceb3853a331e/raw/coverage.json)](https://gist.github.com/ioncache/e2afdd1c4942b8c99362ceb3853a331e)

Pattern-based sanitization for sensitive data in objects and strings. Use it to
mask or remove fields before logging, debugging, or sending data to systems that
should not receive sensitive values such as secrets, PII, PHI, credentials, or
other private data.

Works in Node.js and browsers with JavaScript and TypeScript. The package ships
compiled JavaScript, TypeScript declarations, and source maps, with no runtime
dependencies.

## Table of Contents

- [data-sanitization](#data-sanitization)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [npm](#npm)
    - [Yarn](#yarn)
    - [pnpm](#pnpm)
    - [Bun](#bun)
  - [Importing](#importing)
  - [Usage](#usage)
    - [Quick start](#quick-start)
    - [Sanitize a string](#sanitize-a-string)
    - [Remove fields instead of masking](#remove-fields-instead-of-masking)
    - [Sanitize PII and PHI with custom patterns](#sanitize-pii-and-phi-with-custom-patterns)
  - [Options](#options)
  - [Default patterns](#default-patterns)
  - [Default matchers](#default-matchers)
  - [Custom patterns and matchers](#custom-patterns-and-matchers)
  - [Error handling](#error-handling)
  - [How it works](#how-it-works)
  - [Performance](#performance)
    - [Object workloads](#object-workloads)
    - [String workloads](#string-workloads)
    - [High pattern counts](#high-pattern-counts)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

Install with the package manager used by your project.

### npm

```bash
npm install data-sanitization
```

### Yarn

```bash
yarn add data-sanitization
```

### pnpm

```bash
pnpm add data-sanitization
```

### Bun

```bash
bun add data-sanitization
```

## Importing

The named export is recommended:

```typescript
import { sanitizeData, DataSanitizationError } from 'data-sanitization';
```

The sanitizer is also available as the default export:

```typescript
import sanitizeData from 'data-sanitization';
```

CommonJS consumers can require the compiled package:

```javascript
const { sanitizeData } = require('data-sanitization');
```

## Usage

### Quick start

```typescript
import { sanitizeData } from 'data-sanitization';

const input = {
  username: 'mark',
  password: 'super-secret',
  api_key: 'sk_live_abc123',
};

const result = sanitizeData(input);
// => { username: 'mark', password: '**********', api_key: '**********' }
```

### Sanitize a string

String sanitization works with JSON-like strings, escaped JSON-like strings, and
form-encoded strings:

```typescript
sanitizeData('{"password":"secret","username":"mark"}');
// => '{"password":"**********","username":"mark"}'

sanitizeData('password=secret&username=mark');
// => 'password=**********&username=mark'
```

### Remove fields instead of masking

```typescript
sanitizeData(
  { password: 'secret', token: 'abc', username: 'mark' },
  { removeMatches: true },
);
// => { username: 'mark' }
```

### Sanitize PII and PHI with custom patterns

Use `customPatterns` to mask fields that are sensitive for your domain, such as
PII or PHI fields.

```typescript
import { sanitizeData } from 'data-sanitization';

const sensitivePatterns = [
  'address',
  'date_of_birth',
  'email',
  'emergency_contact',
  'full_name',
  'health_card',
  'ip_address',
  'medications',
  'phone',
  'postal_code',
  'ssn',
];

const patient = {
  accountId: 'acct_123',
  full_name: 'Avery Example',
  email: 'avery@example.com',
  phone: '+1-555-0100',
  date_of_birth: '1989-04-12',
  health_card: 'HC-1234-5678',
  medications: ['example-medication'],
};

sanitizeData(patient, {
  customPatterns: sensitivePatterns,
  useDefaultPatterns: false,
});
// => {
//   accountId: 'acct_123',
//   full_name: '**********',
//   email: '**********',
//   phone: '**********',
//   date_of_birth: '**********',
//   health_card: '**********',
//   medications: '**********',
// }
```

Use `removeMatches` with the same patterns to remove those fields instead of
masking them.

```typescript
sanitizeData(patient, {
  customPatterns: sensitivePatterns,
  useDefaultPatterns: false,
  removeMatches: true,
});
// => { accountId: 'acct_123' }
```

## Options

| Option               | Type                        | Default      | Description                                                                        |
| -------------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `patternMask`        | `string`                    | `**********` | String used to replace matched string field values                                 |
| `numericMask`        | `number`                    | `9999999999` | Number used to replace matched number field values                                 |
| `removeMatches`      | `boolean`                   | `false`      | Remove matched fields entirely instead of masking                                  |
| `scanStringValues`   | `boolean`                   | `true`       | Scan string values on non-sensitive keys for embedded patterns (object input only) |
| `customPatterns`     | `string[]`                  | `[]`         | Additional field name patterns to match                                            |
| `customMatchers`     | `DataSanitizationMatcher[]` | `[]`         | Additional regex matchers for custom string formats                                |
| `useDefaultPatterns` | `boolean`                   | `true`       | Whether to include the built-in default patterns                                   |
| `useDefaultMatchers` | `boolean`                   | `true`       | Whether to include the built-in default matchers                                   |

## Default patterns

The following field name patterns are matched by default using a
case-insensitive substring match:

- `apikey`
- `api_key`
- `password`
- `secret`
- `token`

A field named `db_password` or `client_secret_key` would also match because
these patterns match as substrings.

## Default matchers

Three matchers are included by default:

- **JSON matcher** — matches `"fieldName":"value"` patterns in JSON and
  JSON-like strings
- **Escaped JSON matcher** — matches `\"fieldName\":\"value\"` patterns in
  JSON embedded inside JSON string values
- **Form-encoded matcher** — matches `fieldName=value` and `fieldName:value`
  patterns in URL-encoded and similarly delimited strings

## Custom patterns and matchers

```typescript
import { sanitizeData } from 'data-sanitization';

const data = {
  username: 'mark',
  ssn: '123-45-6789',
  credit_card: '4111111111111111',
};

sanitizeData(data, {
  customPatterns: ['ssn', 'credit_card'],
});

sanitizeData(data, {
  customPatterns: ['ssn'],
  useDefaultPatterns: false,
});

sanitizeData(data, {
  patternMask: '[REDACTED]',
});
```

Number-typed sensitive values are masked with `numericMask` to preserve the
field's type:

```typescript
sanitizeData({ password: 12345, username: 'mark' });
// => { password: 9999999999, username: 'mark' }

sanitizeData({ password: 12345, username: 'mark' }, { numericMask: 0 });
// => { password: 0, username: 'mark' }
```

For custom data formats, provide a `DataSanitizationMatcher` — a function that
takes a pattern string and returns a global, case-insensitive `RegExp`. The
regex must use capture groups `$1` and `$2` to preserve the field name and
trailing delimiter while replacing the value.

```typescript
const headerMatcher = (pattern: string) =>
  new RegExp(`(${pattern}:\\s*).+?(\\n|$)`, 'gi');

sanitizeData('authorization: Bearer abc123\nuser: mark', {
  customPatterns: ['authorization'],
  customMatchers: [headerMatcher],
  useDefaultMatchers: false,
});
// => 'authorization: **********\nuser: mark'
```

## Error handling

`sanitizeData` throws a `DataSanitizationError` when:

- The input is not a `string`, `object`, or `null`.
- An unexpected error occurs during sanitization.

```typescript
import { sanitizeData, DataSanitizationError } from 'data-sanitization';

try {
  sanitizeData(123 as any);
} catch (error) {
  if (error instanceof DataSanitizationError) {
    console.error(error.message); // 'Invalid data type'
    console.error(error.details); // { inputType: 'number' }
  }
}
```

Error details are limited to safe diagnostic metadata and do not include the
original input payload.

## How it works

1. **String input** is sanitized directly via regex replacement with the configured matchers.
2. **Object input** is sanitized recursively by key name without JSON
   serialization. Sensitive keys are masked or removed regardless of whether
   their values are strings, numbers, arrays, objects, or other primitives.
3. **Plain nested objects and arrays** are cloned as they are sanitized.
   Non-plain object instances are preserved without modification to avoid
   corrupting their prototypes.
4. **Null input** is accepted and returns `null`.
5. **For object input**, each configured pattern is matched case-insensitively
   against keys. String values on non-sensitive keys are also scanned for
   embedded patterns by default (`scanStringValues: true`), which catches
   credentials embedded in log messages or other free-text fields. **For string
   input**, each pattern is tested against each matcher to produce regex
   instances that find and replace sensitive values in the string directly.

## Performance

`sanitizeData` is designed for in-process sanitization of log payloads,
request/response objects, and similar data before they leave your application.
It is not designed for streaming pipelines or bulk batch processing of large
files.

### Object workloads

String-value scanning (`scanStringValues: true`, the default) checks every
non-sensitive string field for embedded patterns. This is the recommended
setting — it catches credentials embedded in log messages and similar
free-text fields. It does carry a performance cost on object workloads.

Rough throughput on a modern laptop (Apple M-series, Node.js 22):

| Workload                                                         | `scanStringValues: true` | `scanStringValues: false` |
| ---------------------------------------------------------------- | ------------------------ | ------------------------- |
| Shallow object (4 fields, 1 sensitive key)                       | ~249,000 ops/s           | ~558,000 ops/s            |
| Deeply nested object (sensitive key × 5 levels)                  | ~208,000 ops/s           | ~389,000 ops/s            |
| Object with embedded credential in string value                  | ~106,000 ops/s           | ~399,000 ops/s            |
| Many embedded matches (20 fields, all strings contain a pattern) | ~13,000 ops/s            | —                         |
| Large flat object (50 fields, 1 sensitive key)                   | ~72,000 ops/s            | ~91,000 ops/s             |
| Large array (1,000 objects, 1 sensitive key each)                | ~2,200 ops/s             | ~2,400 ops/s              |
| Very large array (100,000 objects, 1 sensitive key)              | ~19 ops/s                | ~21 ops/s                 |

The "Many embedded matches" row shows the worst case: every scanned string
value actually contains a sensitive pattern and runs the full regex suite.

Set `scanStringValues: false` to recover the pre-scanning performance when
you control your data structure and know sensitive values only appear on
sensitive-named keys.

### String workloads

String input always scans the full string regardless of `scanStringValues`.
The option only affects the object traversal path.

| Workload                                        | Throughput   |
| ----------------------------------------------- | ------------ |
| Long JSON string (50 sensitive key/value pairs) | ~7,100 ops/s |

### High pattern counts

Pattern count affects object workloads proportionally when
`scanStringValues: true`. With default patterns disabled:

| Workload                                               | Throughput    |
| ------------------------------------------------------ | ------------- |
| 50-field object, 50 custom patterns (no string match)  | ~23,000 ops/s |
| 3-field object, 50 custom patterns (no string match)   | ~55,000 ops/s |
| 3-field object, 50 custom patterns (string value hits) | ~18,000 ops/s |

To run the benchmark suite:

```bash
yarn bench
```

Benchmarks live in `bench/sanitize-data.bench.ts`.

## Contributing

For development setup, testing, and release process, see
[docs/development.md](docs/development.md). For future direction, see
[docs/ROADMAP.md](docs/ROADMAP.md).

## License

[MIT](LICENSE)
