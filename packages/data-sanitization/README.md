# data-sanitization: protect credentials and personal data from accidental exposure

> Sensitive data (credentials, PII, PHI, and other private information) ends up in logs more often than it should.

<!-- markdownlint-disable MD013 -->

[![Node CI](https://github.com/ioncache/data-sanitization/actions/workflows/ci-data-sanitization.yml/badge.svg)](https://github.com/ioncache/data-sanitization/actions/workflows/ci-data-sanitization.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/ioncache/e2afdd1c4942b8c99362ceb3853a331e/raw/data-sanitization-coverage-badge-config.json&style=flat)](https://gist.github.com/ioncache/e2afdd1c4942b8c99362ceb3853a331e)
[![npm](https://img.shields.io/npm/v/data-sanitization.svg?style=flat)](https://www.npmjs.com/package/data-sanitization)
[![Bundle size](https://img.shields.io/bundlejs/size/data-sanitization?style=flat)](https://bundlejs.com/?q=data-sanitization)
[![CodeRabbit PR Reviews](https://img.shields.io/coderabbit/prs/github/ioncache/data-sanitization?utm_source=oss&utm_medium=github&utm_campaign=ioncache%2Fdata-sanitization&labelColor=171717&color=FF570A&label=CodeRabbit+Reviews)](https://coderabbit.ai)

[npm](https://www.npmjs.com/package/data-sanitization) &nbsp;•&nbsp; [Changelog](https://github.com/ioncache/data-sanitization/releases) &nbsp;•&nbsp; [GitHub](https://github.com/ioncache/data-sanitization)

<!-- markdownlint-enable MD013 -->

---

`data-sanitization` masks or removes sensitive field values before they leave your application.

Use it in log pipelines, request handlers, and error reporters to catch what might otherwise slip through.

It matches field names across objects, arrays, and strings, and lets you extend the built-in
defaults with your own patterns for PII, PHI, or any domain-specific fields.

## Before / After

```ts
const input = {
  username: 'mark',
  password: 'super-secret',
  api_key: 'sk_live_abc123',
};

sanitizeData(input);
// => { username: 'mark', password: '**********', api_key: '**********' }
```

## Highlights

- Zero runtime dependencies, with compiled JS and full TypeScript declarations
- Sanitizes nested structures at any depth, preserving types and class instances
- Matches sensitive field names across any data shape without requiring exact path declarations
- Handles circular references safely
- Sanitization errors never expose the original input payload
- Drop-in adapters for pino and winston via [`data-sanitization-log-providers`](https://www.npmjs.com/package/data-sanitization-log-providers)

## Why not fast-redact or pino-redact?

Tools like [fast-redact](https://github.com/davidmarkclements/fast-redact) and
[pino's built-in redaction](https://getpino.io/#/docs/redaction) are excellent choices when
you control your data shape. They require you to declare the exact paths to
redact upfront — `user.password`, `req.headers.authorization` — and compile
those paths into a specialized function at initialization, achieving near-zero
overhead.

The tradeoff is that **you must know the shape of your data ahead of time**.
That works well for application-level logging where you own the data models,
but falls short when sanitizing third-party library payloads, error objects
with arbitrary attached metadata, or log entries assembled from sources you
don't control.

`data-sanitization` takes a pattern-based approach instead. A single
`'password'` entry matches `password`, `db_password`, `resetPasswordToken`,
and any other key containing that substring — at any depth, in any structure,
without path declarations. The cost is a small per-call overhead versus
path-based tools; the benefit is that it works on data whose shape you don't
fully know.

If you control your data shape exactly and need maximum throughput, reach for
[fast-redact](https://github.com/davidmarkclements/fast-redact). If you need to sanitize data you don't fully control,
`data-sanitization` is the right tool.

> [!NOTE]
> **Best-effort by design.** `data-sanitization` is a defensive layer that reduces accidental
> leakage — it is not a compliance guarantee. Pattern-based sanitization will miss sensitive values
> when key names don't match the configured patterns, values appear in unsupported formats (such as
> numeric fields in unparsed JSON strings), or content is embedded in ways no configured matcher
> recognizes. Use it to catch what might otherwise slip through, not as a substitute for access
> controls or data-handling policies.

## Log provider integrations

[`data-sanitization-log-providers`](https://www.npmjs.com/package/data-sanitization-log-providers)
is a companion package with pre-built adapters that wire `data-sanitization` directly into your
logging pipeline:

<!-- markdownlint-disable MD013 -->

| Adapter               | Import path                                      | How it works                                                                            |
| --------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Pino hook**         | `data-sanitization-log-providers/pino-hook`      | Registers a `pino.hooks.logMethod` hook that sanitizes arguments before they reach pino |
| **Pino transport**    | `data-sanitization-log-providers/pino-transport` | A `pino-abstract-transport` stream you can pass to `pino({ transport: ... })`           |
| **Winston transport** | `data-sanitization-log-providers/winston`        | A `winston-transport` subclass that sanitizes each log entry before forwarding it       |

<!-- markdownlint-enable MD013 -->

Install the companion package alongside your logger:

```bash
npm install data-sanitization-log-providers
```

See the [data-sanitization-log-providers README](https://github.com/ioncache/data-sanitization/tree/main/packages/data-sanitization-log-providers)
for usage examples and configuration options.

## Table of Contents

- [data-sanitization: protect credentials and personal data from accidental exposure](#data-sanitization-protect-credentials-and-personal-data-from-accidental-exposure)
  - [Before / After](#before--after)
  - [Highlights](#highlights)
  - [Why not fast-redact or pino-redact?](#why-not-fast-redact-or-pino-redact)
  - [Log provider integrations](#log-provider-integrations)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Importing](#importing)
  - [Usage](#usage)
    - [Quick start](#quick-start)
    - [Sanitize a string](#sanitize-a-string)
    - [Parse JSON strings](#parse-json-strings)
    - [Remove fields instead of masking](#remove-fields-instead-of-masking)
    - [Sanitize PII and PHI with custom patterns](#sanitize-pii-and-phi-with-custom-patterns)
    - [Sanitize Maps and Sets](#sanitize-maps-and-sets)
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

```bash
npm install data-sanitization
```

```bash
yarn add data-sanitization
```

```bash
pnpm add data-sanitization
```

```bash
bun add data-sanitization
```

## Importing

```typescript
import { sanitizeData, DataSanitizationError } from 'data-sanitization';
```

```typescript
import sanitizeData from 'data-sanitization';
```

```javascript
const { sanitizeData } = require('data-sanitization');
```

Utility helpers for log middleware are available on a separate subpath —
see [docs/utils.md](docs/utils.md).

```typescript
import {
  diffSanitizedFields,
  buildSanitizedWarning,
} from 'data-sanitization/utils';
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

Pass a string directly and it will be sanitized in place. This is useful for
sanitizing serialized data before logging. For example, a raw request body,
a form-encoded payload, or a JSON string you have not yet parsed:

```typescript
sanitizeData('{"password":"secret","username":"mark"}');
// => '{"password":"**********","username":"mark"}'

sanitizeData('password=secret&username=mark');
// => 'password=**********&username=mark'
```

### Parse JSON strings

By default, string inputs are sanitized using text-based pattern matching.
This works for most cases, but it cannot detect numeric-valued sensitive fields:

```typescript
sanitizeData('{"password":12345,"username":"mark"}');
// => '{"password":12345,"username":"mark"}' (numeric value not masked)
```

Setting `parseJsonStrings: true` parses the JSON first and sanitizes it the
same way an object would be, which handles numeric values correctly:

```typescript
sanitizeData('{"password":12345,"username":"mark"}', {
  parseJsonStrings: true,
});
// => '{"password":9999999999,"username":"mark"}'
```

> [!TIP]
> `parseJsonStrings: true` is also 3–4× faster for JSON string inputs than the
> default text-based approach. The tradeoff is that output is re-serialized with
> `JSON.stringify`, which does not preserve original whitespace or formatting.

If the string cannot be parsed as JSON, `sanitizeData` silently falls back to
text-based pattern matching. Numeric-valued sensitive fields will not be masked
in that case. If you need strict behavior (fail or redact on parse failure),
[open an issue](https://github.com/ioncache/data-sanitization/issues/306) — this is tracked for a future release.

### Remove fields instead of masking

```typescript
sanitizeData(
  { password: 'secret', token: 'abc', username: 'mark' },
  { removeMatches: true },
);
// => { username: 'mark' }
```

### Sanitize PII and PHI with custom patterns

Use the exported `piiPatterns` and `phiPatterns` constants — or build your own
list — and pass them via `customPatterns`.

```typescript
import { sanitizeData, piiPatterns, phiPatterns } from 'data-sanitization';

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
  customPatterns: [...piiPatterns, ...phiPatterns],
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
  customPatterns: [...piiPatterns, ...phiPatterns],
  removeMatches: true,
  useDefaultPatterns: false,
});
// => { accountId: 'acct_123' }
```

### Sanitize Maps and Sets

Enable `sanitizeCollections: true` to traverse `Map` and `Set` instances.
Each collection is sanitized and returned as a new instance — the original
is never mutated.

```typescript
const session = new Map([
  ['token', 'abc123'],
  ['username', 'mark'],
]);

sanitizeData({ session }, { sanitizeCollections: true });
// => { session: Map { 'token' => '**********', 'username' => 'mark' } }
```

```typescript
const tags = new Set(['api_key=hunter2', 'env=production']);

sanitizeData({ tags }, { sanitizeCollections: true });
// => { tags: Set { 'api_key=**********', 'env=production' } }
```

> [!TIP]
> `Map` and `Set` are not JSON-serializable by default — `JSON.stringify` turns
> them into `{}` and `[]`. To include them in structured logs, spread them first:
>
> ```typescript
> // Map with string keys → plain object
> JSON.stringify(Object.fromEntries(sanitizedMap));
>
> // Map with mixed or object keys → entries array
> JSON.stringify([...sanitizedMap.entries()]);
>
> // Set → array
> JSON.stringify([...sanitizedSet]);
> ```

## Options

| Option                | Type                        | Default      | Description                                                                                                                                                                        |
| --------------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patternMask`         | `string`                    | `**********` | String used to replace matched string field values                                                                                                                                 |
| `numericMask`         | `number`                    | `9999999999` | Number used to replace matched number field values                                                                                                                                 |
| `removeMatches`       | `boolean`                   | `false`      | Remove matched fields entirely instead of masking                                                                                                                                  |
| `sanitizeCollections` | `boolean`                   | `false`      | Sanitize `Map` and `Set` instances by traversing their entries and returning a new sanitized copy. When false, these pass through unchanged like other non-plain object instances. |
| `scanStringValues`    | `boolean`                   | `true`       | Scan string values on non-sensitive keys for embedded patterns. Applies to object input and to string input when `parseJsonStrings` is enabled; has no effect on raw string input. |
| `parseJsonStrings`    | `boolean`                   | `false`      | Parse valid JSON string inputs as structured data and sanitize by field name. Re-serializes with `JSON.stringify`, discarding original whitespace.                                 |
| `customPatterns`      | `PatternEntry[]`            | `[]`         | Additional field name patterns to match. Each entry is a pattern string (substring match) or `{ match: string; strict?: boolean }` for an exact match.                             |
| `customMatchers`      | `DataSanitizationMatcher[]` | `[]`         | Additional regex matchers for custom string formats                                                                                                                                |
| `useDefaultPatterns`  | `boolean`                   | `true`       | Set to `false` to use only your custom patterns, ignoring the built-in defaults.                                                                                                   |
| `useDefaultMatchers`  | `boolean`                   | `true`       | Set to `false` to use only your custom matchers, ignoring the built-in defaults.                                                                                                   |
| `ignorePatterns`      | `string[]`                  | `[]`         | Patterns to exclude from the active set. Applied after defaults and `customPatterns` are merged. Use to prevent false positives from built-in substring matching.                  |

## Default patterns

The following field name patterns are matched by default. All use
case-insensitive substring matching unless noted as exact.

**Credentials** (`credentialPatterns`):

- `apikey`
- `api_key`
- `password`
- `secret`
- `token`

**HTTP authentication headers** (`headerPatterns`):

- `authorization`
- `api-key`

A field named `db_password` or `x-authorization` would also match because
these patterns match as substrings.

Two additional pattern groups are exported but not included by default:

- **`piiPatterns`** — Personally Identifiable Information: names, contact
  details, government IDs, and digital identifiers. Ambiguous single-word
  terms such as `address`, `city`, `state`, and `zip` use exact matching to
  avoid false positives (e.g. `email_address` is not masked when only `address`
  is in `piiPatterns`).
- **`phiPatterns`** — Protected Health Information under HIPAA: medical record
  identifiers, healthcare dates, clinical data, and biometrics.

Use them via `customPatterns`:

```typescript
import { sanitizeData, piiPatterns, phiPatterns } from 'data-sanitization';

sanitizeData(patient, {
  customPatterns: [...piiPatterns, ...phiPatterns],
});
```

### Exact vs. substring matching

Each pattern in `customPatterns` is a `PatternEntry`: either a plain string
(substring match) or an object with `strict: true` for an exact field-name
match.

```typescript
// Substring: matches 'token', 'access_token', 'session_token', ...
sanitizeData(data, { customPatterns: ['token'] });

// Exact: matches only 'token', not 'access_token'
sanitizeData(data, { customPatterns: [{ match: 'token', strict: true }] });
```

Use exact matching when a pattern is a common English word that would produce
false positives as a substring — for example, `state` would otherwise mask
`statement` or `stateCode`.

> **`ignorePatterns` and exact matching:** `ignorePatterns` is a `string[]`
> matched against the `match` string of each active pattern. To suppress an
> exact-match entry such as `{ match: 'state', strict: true }`, pass
> `ignorePatterns: ['state']`.

## Default matchers

Three matchers are included by default:

- **JSON matcher**: matches `"fieldName":"value"` patterns in JSON and
  JSON-like strings
- **Escaped JSON matcher**: matches `\"fieldName\":\"value\"` patterns in
  JSON embedded inside JSON string values
- **Cookie and form-encoded matcher**: matches `fieldName=value` and
  `fieldName:value` patterns in URL form-encoded strings and HTTP Cookie
  headers. Values stop at `&`, `;`, `\r`, or `\n` so neither format's
  separator is consumed as part of a value.

## Custom patterns and matchers

Use `customPatterns` to add field names on top of the defaults, or use
`useDefaultPatterns: false` to replace the defaults entirely:

```typescript
import { sanitizeData } from 'data-sanitization';

const data = {
  username: 'mark',
  ssn: '123-45-6789',
  credit_card: '4111111111111111',
};

// Add to the built-in defaults
sanitizeData(data, {
  customPatterns: ['ssn', 'credit_card'],
});
// => { username: 'mark', ssn: '**********', credit_card: '**********' }

// Use only specific patterns, ignoring the defaults
sanitizeData(data, {
  customPatterns: ['ssn'],
  useDefaultPatterns: false,
});
// => { username: 'mark', ssn: '**********', credit_card: '4111111111111111' }

// Use a different mask string
sanitizeData(data, {
  customPatterns: ['ssn', 'credit_card'],
  patternMask: '[REDACTED]',
});
// => { username: 'mark', ssn: '[REDACTED]', credit_card: '[REDACTED]' }
```

Use `ignorePatterns` to prevent a built-in pattern from matching field names
that are not sensitive in your application. The default `token` pattern, for
example, would also match `tokenizer_config`:

```typescript
const data = {
  tokenizer_config: 'bert-base-uncased',
  api_key: 'sk-abc123',
  username: 'mark',
};

// Without ignorePatterns: tokenizer_config is incorrectly masked
sanitizeData(data);
// => { tokenizer_config: '**********', api_key: '**********', username: 'mark' }

// With ignorePatterns: token pattern suppressed, other patterns still active
sanitizeData(data, { ignorePatterns: ['token'] });
// => { tokenizer_config: 'bert-base-uncased', api_key: '**********', username: 'mark' }
```

Note that `ignorePatterns` suppresses the entire substring pattern — any field
whose name matches the pattern will pass through unmasked. If you have a field
named `token` alongside `tokenizer_config`, both will be unmasked when `token`
is ignored. Use `useDefaultPatterns: false` with explicit `customPatterns` for
fine-grained per-field control.

Number-typed sensitive values are masked with `numericMask` to preserve the
field's type:

```typescript
sanitizeData({ password: 12345, username: 'mark' });
// => { password: 9999999999, username: 'mark' }

sanitizeData({ password: 12345, username: 'mark' }, { numericMask: 0 });
// => { password: 0, username: 'mark' }
```

For custom data formats, provide a `DataSanitizationMatcher`, a function that
takes a pattern string and returns a global, case-insensitive `RegExp`. The
regex must use capture groups `$1` and `$2` to preserve the field name and
trailing delimiter while replacing the value.

```typescript
import type { DataSanitizationMatcher } from 'data-sanitization';

const headerMatcher: DataSanitizationMatcher = (pattern) =>
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

`sanitizeData` dispatches on the input type and applies the configured patterns and matchers accordingly:

1. **String input** is sanitized directly via regex replacement with the configured matchers.
2. **Object input** is sanitized recursively by key name without JSON
   serialization. Sensitive keys are masked or removed regardless of whether
   their values are strings, numbers, arrays, objects, or other primitives.
3. **Plain nested objects and arrays** are cloned as they are sanitized.
   Non-plain object instances are preserved without modification to avoid
   corrupting their prototypes. Enable `sanitizeCollections: true` to instead
   traverse `Map` and `Set` instances, producing a new sanitized copy.
4. **Object property names and Map string keys** are used for pattern matching
   but are not themselves sanitized. If a property name or string Map key
   happens to contain sensitive data it will appear unsanitized in the output.
   Map keys that are objects are recursed into and sanitized like any other
   nested object.
5. **Null input** is accepted and returns `null`.
6. **For object input**, each pattern is matched case-insensitively against key
   names. By default (`scanStringValues: true`), string values on non-sensitive
   keys are also scanned, which catches credentials embedded in log messages or
   other free-text fields.
7. **For string input**, each pattern is tested against each matcher to find and
   replace sensitive values in the raw string directly.

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

Array workloads pay ~3–5% overhead regardless of size. The per-item
pre-filter cost is negligible. The cost is most visible on individual objects
with long non-sensitive string values such as stack traces or large text
fields; a single 10KB non-sensitive string value incurs ~68% overhead.

> [!TIP]
> Set `scanStringValues: false` when you control your data structure and know
> sensitive values only appear on sensitive-named keys. This recovers full pre-scanning throughput.
>
> Set `parseJsonStrings: true` when your string inputs are JSON. It is 3–4× faster
> than the default regex path and correctly masks numeric-valued sensitive fields.

On first call with a given set of options, `sanitizeData` compiles its regex
set and caches the result by option fingerprint. Subsequent calls with the same
options reuse the cache at no extra cost. This applies whether options are
passed inline or as a variable, as long as the content is the same.

> [!WARNING]
> Building `customPatterns` dynamically per call from variable data causes a cache
> miss on every call, so compilation runs on each request instead of being reused.

```typescript
// Anti-pattern: patterns differ on every call, cache never hits
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

If dynamic options are unavoidable, set `scanStringValues: false`. This skips
the string-scanning cache and avoids the fingerprinting overhead on every call.

When options must genuinely vary per call, each call pays the first-call
compilation cost (~32× slower than a cached call).

For full benchmark tables, charts, and scaling analysis see
[docs/performance.md](docs/performance.md). To run the benchmarks:

```bash
yarn bench
```

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## License

[MIT](LICENSE)
