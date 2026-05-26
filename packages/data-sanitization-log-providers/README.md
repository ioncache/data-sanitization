# data-sanitization-log-providers

Pre-built log provider adapters for [`data-sanitization`](https://github.com/ioncache/data-sanitization).
Each adapter wires `sanitizeData` into the logger's native hook or transport API so you don't
have to write the glue yourself.

## Installation

```bash
npm install data-sanitization data-sanitization-log-providers
```

npm is used as an example — yarn, pnpm, and bun work the same way.

Install only the peer dependency for the logger you use:

```bash
npm install pino                          # for /pino-hook
npm install pino pino-abstract-transport  # for /pino-transport
npm install winston                       # for /winston
```

## Pino — stream write hook (`/pino-hook`)

Runs synchronously in the main thread. Sanitizes each log line and optionally prepends a
structured warning entry when sensitive fields are found.

```typescript
import pino from 'pino';
import { createSanitizeLogLine } from 'data-sanitization-log-providers/pino-hook';

const logger = pino({
  hooks: {
    streamWrite: createSanitizeLogLine({
      // Any DataSanitizationReplacerOptions:
      customPatterns: ['email', 'health_card'],
      // Fields to carry into the warning entry (default: ['time', 'pid', 'hostname']):
      allowedFields: ['time', 'pid', 'hostname'],
    }),
  },
});
```

The hook function signature is `(s: string) => string`, matching pino's `hooks.streamWrite`
contract. When a field is sanitized, a `level: 40` warning line is prepended:

```json
{"time":1716667200000,"pid":1234,"hostname":"api-1","level":40,"msg":"sensitive data found in log entry","fields":["password"]}
{"time":1716667200000,"pid":1234,"hostname":"api-1","level":30,"msg":"user login","password":"**********"}
```

### Error handling

When `sanitizeData` throws, the default behaviour is to emit an error-level (50) JSON
placeholder preserving `time`, `pid`, and `hostname` — the original line is not emitted.
Override this with `onError`:

```typescript
createSanitizeLogLine({
  onError: (err, original) => {
    myErrorTracker.capture(err);
    return '{"level":50,"msg":"sanitization failed"}\n';
  },
});
```

## Pino — worker thread transport (`/pino-transport`)

Runs in a `pino.transport()` worker thread via `pino-abstract-transport`. Use this when you
want process isolation or need to fan out to multiple destinations.

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'data-sanitization-log-providers/pino-transport',
    options: {
      customPatterns: ['email'],
      allowedFields: ['time', 'pid', 'hostname'],
    },
  },
});
```

**Note:** `customMatchers` (custom matcher functions) is not supported via the transport
because functions cannot be serialized across the worker-thread boundary. Use the
`/pino-hook` adapter when custom matcher functions are required.

## Winston (`/winston`)

A `TransportStream` subclass that sanitizes each log entry before writing. Compose it with
`winston.format.json()` (or equivalent) so that `info[Symbol.for('message')]` is populated
before the transport runs.

```typescript
import winston from 'winston';
import { createSanitizingTransport } from 'data-sanitization-log-providers/winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    createSanitizingTransport({
      sanitize: { customPatterns: ['email'] },
    }),
  ],
});
```

### Warning lines (`emitWarning`)

The `emitWarning` option is disabled by default. When enabled, a structured warning entry is
written to the output stream immediately before the sanitized line:

```typescript
createSanitizingTransport({
  emitWarning: true,
  allowedFields: ['timestamp', 'service'],
});
```

**Why `emitWarning` is opt-in:** Winston formats are 1-to-1 — one `info` object produces one
serialized `MESSAGE` string. There is no built-in way to emit a second log line from a format
transform. This transport subclass owns the write path directly, which makes the two-line
pattern possible. However, structured log aggregators that expect exactly one JSON object per
write call may not handle the extra line correctly. Enable this option only when writing to a
file or stream where embedded newlines are safe.

### Error handling (`onError`)

When `sanitizeData` throws, an error-level placeholder is written in place of the original
line. Provide `onError` to be notified:

```typescript
createSanitizingTransport({
  onError: (err) => myErrorTracker.capture(err),
});
```
