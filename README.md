# data-sanitization

Pattern-based sanitization for sensitive data in objects and strings. Masks or removes fields matching configurable patterns, making data safe for logging or external exposure.

Works with both JavaScript and TypeScript — ships with compiled JS, TypeScript declarations, and source maps.

## Table of Contents

- [data-sanitization](#data-sanitization)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Sanitize an object](#sanitize-an-object)
    - [Sanitize a string](#sanitize-a-string)
    - [Remove fields instead of masking](#remove-fields-instead-of-masking)
  - [Options](#options)
  - [Default patterns](#default-patterns)
  - [Default matchers](#default-matchers)
  - [Custom patterns and matchers](#custom-patterns-and-matchers)
  - [Error handling](#error-handling)
  - [How it works](#how-it-works)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

```bash
npm install data-sanitization
```

```bash
yarn add data-sanitization
```

## Usage

### Sanitize an object

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

Works with JSON strings and form-encoded strings:

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

## Options

| Option               | Type                        | Default      | Description                                       |
| -------------------- | --------------------------- | ------------ | ------------------------------------------------- |
| `patternMask`        | `string`                    | `**********` | String used to replace matched field values       |
| `removeMatches`      | `boolean`                   | `false`      | Remove matched fields entirely instead of masking |
| `customPatterns`     | `string[]`                  |              | Additional field name patterns to match           |
| `customMatchers`     | `DataSanitizationMatcher[]` |              | Additional regex matchers for custom data formats |
| `useDefaultPatterns` | `boolean`                   | `true`       | Whether to include the built-in default patterns  |
| `useDefaultMatchers` | `boolean`                   | `true`       | Whether to include the built-in default matchers  |

## Default patterns

The following field name patterns are matched by default (case-insensitive, substring match):

- `apikey`
- `api_key`
- `password`
- `secret`
- `token`

A field named `db_password` or `client_secret_key` would also match because
these patterns match as substrings.

## Default matchers

Two matchers are included by default:

- **JSON matcher** — matches `"fieldName":"value"` patterns in JSON and JSON-like strings
- **Form-encoded matcher** — matches `fieldName=value` and `fieldName:value` patterns in URL-encoded and similarly delimited strings

## Custom patterns and matchers

```typescript
import { sanitizeData } from 'data-sanitization';

// Add a custom pattern alongside defaults
sanitizeData(data, {
  customPatterns: ['ssn', 'credit_card'],
});

// Use only custom patterns, no defaults
sanitizeData(data, {
  customPatterns: ['ssn'],
  useDefaultPatterns: false,
});

// Use a custom mask
sanitizeData(data, {
  patternMask: '[REDACTED]',
});
```

For custom data formats, provide a `DataSanitizationMatcher` — a function that
takes a pattern string and returns a global, case-insensitive `RegExp`. The
regex must use capture groups `$1` and `$2` to preserve the field name and
trailing delimiter while replacing the value.

## Error handling

`sanitizeData` throws a `DataSanitizationError` when:

- The input is not a `string` or `object` (e.g., `number`, `boolean`, `undefined`)
- An unexpected error occurs during sanitization (e.g., malformed JSON that cannot be re-parsed)

```typescript
import { sanitizeData } from 'data-sanitization';
import { DataSanitizationError } from 'data-sanitization/errors';

try {
  sanitizeData(123 as any);
} catch (error) {
  if (error instanceof DataSanitizationError) {
    console.error(error.message); // 'Invalid data type'
    console.error(error.details); // { originalData: 123 }
  }
}
```

## How it works

1. **String input** is sanitized directly via regex replacement.
2. **Object input** is converted to a JSON string via `JSON.stringify`, sanitized, then parsed back with `JSON.parse`.
3. Each configured pattern is tested against each matcher to produce regex instances that find and replace sensitive field values.

## Contributing

For development setup, testing, and release process, see [docs/development.md](docs/development.md).

## License

[MIT](LICENSE)
