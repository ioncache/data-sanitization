# `data-sanitization/utils`

Helper functions for log middleware. Import from the `data-sanitization/utils`
subpath — they are not included in the main `data-sanitization` export.

```typescript
import {
  diffSanitizedFields,
  buildSanitizedWarning,
} from 'data-sanitization/utils';
```

## Why these exist

When you use `sanitizeData` in a log transport or write hook, you often need
to do more than just mask values. You need to know **which fields changed** so
you can:

- Emit a warning log entry alongside the sanitized one, making the
  sanitization event visible in your log aggregator even after the raw data is
  gone.
- Increment a counter or fire an alert when sensitive data is found in a log
  entry (a signal that something upstream is leaking credentials or PII into
  logs).
- Record an audit trail of which fields were sanitized and when.

`diffSanitizedFields` answers "what changed?" and `buildSanitizedWarning`
turns that answer into a ready-to-emit warning log line.

## `diffSanitizedFields`

```typescript
diffSanitizedFields(original: object, sanitized: object): string[]
```

Recursively diffs two objects and returns the dot/bracket-notation paths of
every field whose value changed. Designed to be called with the original
payload and the output of `sanitizeData`.

- Object keys use **dot notation**: `user.email`
- Array indices use **bracket notation**: `tokens[0]`, `users[0].email`
- Keys present in `original` but absent in `sanitized` are included — this
  covers the `removeMatches: true` case where fields are deleted rather than
  masked.
- Keys present in `sanitized` but not in `original` are ignored — the diff
  is one-directional, walking `original`'s keys.

### Examples

```typescript
// Nested object field
diffSanitizedFields(
  { user: { email: 'a@b.com', id: 1 }, msg: 'login' },
  { user: { email: '**********', id: 1 }, msg: 'login' },
);
// => ['user.email']

// Array element values
diffSanitizedFields(
  { tokens: ['abc', 'def'] },
  { tokens: ['**********', '**********'] },
);
// => ['tokens[0]', 'tokens[1]']

// Nested field inside an array element
diffSanitizedFields(
  { users: [{ email: 'a@b.com', id: 1 }] },
  { users: [{ email: '**********', id: 1 }] },
);
// => ['users[0].email']

// Field removed by removeMatches: true
diffSanitizedFields(
  { password: 'secret', username: 'mark' },
  { username: 'mark' },
);
// => ['password']

// No changes
diffSanitizedFields({ msg: 'hello' }, { msg: 'hello' });
// => []
```

## `buildSanitizedWarning`

```typescript
buildSanitizedWarning(
  originalStr: string,
  sanitizedStr: string,
  options?: { allowedFields?: string[] },
): string | null
```

Parses two JSON log strings, diffs them, and builds a structured warning log
entry identifying which fields were sanitized. Returns `null` when no warning
is needed.

The warning entry:

- Carries all non-changed fields from the **sanitized** log object (safe
  values only — the changed fields are excluded from the warning body since
  they appear in the `fields` array).
- Overrides `level` to `40` (warn) and `msg` to
  `"sensitive data found in log entry"`.
- Adds a `fields` array with the dot/bracket-notation paths that changed.

Returns `null` when:

- Either string is not valid JSON.
- Either string parses to something other than a plain object (e.g. an array
  or `null`).
- No fields differ between the two inputs (nothing to warn about).

### `options.allowedFields`

By default, all non-changed fields from the sanitized object carry over into
the warning. Pass `allowedFields` to restrict the warning to a specific set
of context fields — useful in log-provider integrations where you want only
correlation metadata (e.g. `time`, `pid`, `hostname`) and nothing else.

### Usage examples

```typescript
const original =
  '{"level":30,"time":1716667200000,"pid":12345,"hostname":"api-1","email":"mark@example.com","msg":"user login"}';
const sanitized =
  '{"level":30,"time":1716667200000,"pid":12345,"hostname":"api-1","email":"**********","msg":"user login"}';

buildSanitizedWarning(original, sanitized);
// => '{"time":1716667200000,"pid":12345,"hostname":"api-1","level":40,"msg":"sensitive data found in log entry","fields":["email"]}'
```

```typescript
// Restrict which context fields appear in the warning
buildSanitizedWarning(original, sanitized, {
  allowedFields: ['time', 'pid', 'hostname'],
});
// => '{"time":1716667200000,"pid":12345,"hostname":"api-1","level":40,"msg":"sensitive data found in log entry","fields":["email"]}'
```

```typescript
// Returns null — nothing changed
buildSanitizedWarning(sanitized, sanitized);
// => null

// Returns null — not valid JSON
buildSanitizedWarning('plain text log line', sanitized);
// => null
```

### Typical log middleware pattern

```typescript
import { sanitizeData } from 'data-sanitization';
import { buildSanitizedWarning } from 'data-sanitization/utils';

function sanitizeLogLine(raw: string): string {
  const sanitized = sanitizeData(raw, { parseJsonStrings: true }) as string;

  // No change — emit as-is
  if (sanitized === raw) return raw;

  const warning = buildSanitizedWarning(raw, sanitized);

  // Prepend warning so the event is visible in log aggregators
  return warning ? warning + '\n' + sanitized : sanitized;
}
```

The `data-sanitization-log-providers` package (see
[ROADMAP.md](ROADMAP.md)) will ship ready-made adapters for pino, winston,
and bunyan that use this pattern internally.
