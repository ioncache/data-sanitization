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
    - [Parse JSON strings](#parse-json-strings)
    - [Remove fields instead of masking](#remove-fields-instead-of-masking)
    - [Sanitize PII and PHI with custom patterns](#sanitize-pii-and-phi-with-custom-patterns)
  - [Options](#options)
  - [Default patterns](#default-patterns)
  - [Default matchers](#default-matchers)
  - [Custom patterns and matchers](#custom-patterns-and-matchers)
  - [Error handling](#error-handling)
  - [How it works](#how-it-works)
  - [Performance](#performance)
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

### Parse JSON strings

When a string input is valid JSON containing an object or array, set
`parseJsonStrings: true` to sanitize it via the object path. This also correctly
masks numeric-valued sensitive fields, which the default regex path cannot do:

```typescript
sanitizeData('{"password":12345,"username":"mark"}', {
  parseJsonStrings: true,
});
// => '{"password":9999999999,"username":"mark"}'
```

Note: the result is re-serialized with `JSON.stringify`, which does not preserve
original whitespace or indentation. Enable this option when formatting fidelity
is not required — it is faster and more correct than the default regex path.

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
  removeMatches: true,
  useDefaultPatterns: false,
});
// => { accountId: 'acct_123' }
```

## Options

| Option               | Type                        | Default      | Description                                                                                                                                                                        |
| -------------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patternMask`        | `string`                    | `**********` | String used to replace matched string field values                                                                                                                                 |
| `numericMask`        | `number`                    | `9999999999` | Number used to replace matched number field values                                                                                                                                 |
| `removeMatches`      | `boolean`                   | `false`      | Remove matched fields entirely instead of masking                                                                                                                                  |
| `scanStringValues`   | `boolean`                   | `true`       | Scan string values on non-sensitive keys for embedded patterns. Applies to object input and to string input when `parseJsonStrings` is enabled; has no effect on raw string input. |
| `parseJsonStrings`   | `boolean`                   | `false`      | Parse valid JSON strings via the object path. Recommended unless formatting fidelity is required; re-serializes with `JSON.stringify`, discarding original whitespace.             |
| `customPatterns`     | `string[]`                  | `[]`         | Additional field name patterns to match                                                                                                                                            |
| `customMatchers`     | `DataSanitizationMatcher[]` | `[]`         | Additional regex matchers for custom string formats                                                                                                                                |
| `useDefaultPatterns` | `boolean`                   | `true`       | Whether to include the built-in default patterns                                                                                                                                   |
| `useDefaultMatchers` | `boolean`                   | `true`       | Whether to include the built-in default matchers                                                                                                                                   |

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
  customMatchers: [headerMatcher],
  customPatterns: ['authorization'],
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

String-value scanning (`scanStringValues: true`, the default) adds overhead
on object workloads. The cost depends on how many non-sensitive string fields
the input has and how long they are. Rough throughput on a modern laptop
(Apple M-series, Node.js 22):

| Workload                                       | ops/s    | ms/call | scan overhead |
| ---------------------------------------------- | -------- | ------- | ------------- |
| Shallow object (1 sensitive key)               | ~464,000 | ~0.002  | ~18%          |
| Log object, stack trace with credentials       | ~46,000  | ~0.022  | ~88%          |
| Log object, clean stack trace                  | ~318,000 | ~0.003  | ~18%          |
| Object with 10KB non-sensitive string          | ~200,000 | ~0.005  | ~68%          |
| Large flat object (50 fields, 1 sensitive key) | ~82,000  | ~0.012  | ~10%          |
| Array (1,000 items, 1 sensitive key each)      | ~2,161   | ~0.46   | ~5%           |
| Array (1,000,000 items, 1 sensitive key each)  | ~1.7     | ~574    | ~4%           |

Array workloads pay ~3–5% overhead regardless of size — the per-item
pre-filter cost is negligible. The cost is most visible on individual objects
with long non-sensitive string values such as stack traces or large text
fields; a single 10KB non-sensitive string value incurs ~68% overhead.

**`scanStringValues: false`** — Disables string-value scanning on the object
path. Use this when you control your data structure and know sensitive values
only appear on sensitive-named keys. Recovers the full pre-scanning throughput.

**`parseJsonStrings: true`** — When your string inputs are JSON, this routes
them through the object path instead of regex: 3–4× faster and correctly masks
numeric-valued sensitive fields that the regex path cannot detect. The tradeoff
is that the result is re-serialized with `JSON.stringify`, which does not
preserve original whitespace or indentation.

On first call with a given set of options, `sanitizeData` compiles its regex
set and caches the result by option fingerprint. Subsequent calls with the same
options reuse the cache at no extra cost — this applies whether options are
passed inline or as a variable, as long as the content is the same.

The one pattern to avoid is building `customPatterns` dynamically per call from
variable data, such as from a request or database record:

```typescript
// Anti-pattern: patterns differ on every call — cache never hits
app.post('/log', (req) => {
  sanitizeData(req.body, {
    customPatterns: [...basePatterns, ...req.user.sensitiveFields],
  });
});

// Correct: build options once at startup (or per stable configuration)
const sanitizerOptions = {
  customPatterns: [...basePatterns, ...knownSensitiveFields],
};

app.post('/log', (req) => {
  sanitizeData(req.body, sanitizerOptions);
});
```

If dynamic options are unavoidable, set `scanStringValues: false` — this skips
the string-scanning cache and avoids the fingerprinting overhead on every call.

When options must genuinely vary per call, each call pays the first-call
compilation cost (~32× slower than a cached call). For full benchmark tables,
charts, and scaling analysis see
[docs/performance.md](docs/performance.md). To run the suite:

```bash
yarn bench
```

## Contributing

See the repository on GitHub for development setup, testing, release process,
and project roadmap.

## License

[MIT](LICENSE)
