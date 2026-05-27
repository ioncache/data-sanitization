# Log Providers Package

## Approach

Add a new `data-sanitization-log-providers` workspace package that ships pre-built adapters
for pino and winston. Each adapter wires `sanitizeData` into the logger's native hook or
transport API so consumers don't have to write the glue themselves. The package depends on
`data-sanitization` as a peer and exposes three subpath exports: `/pino-hook` (the pino
`streamWrite` hook), `/pino-transport` (a `pino-abstract-transport` worker module), and
`/winston` (a `TransportStream` subclass). Pino's worker-thread transport model requires the
`.default` export to be the transport factory, so pino-hook and pino-transport are separate
subpaths rather than combined into one dual-purpose module.

## Pre-implementation

- Branch `worktree-feat+309-log-providers` created via worktree.
- Issues #307 (`/utils` subpath) and #308 (monorepo migration) have landed; prerequisites
  satisfied.

## Steps

1. **`packages/data-sanitization-log-providers/package.json`**: New package manifest.
   `pino`, `winston`, `pino-abstract-transport`, and `data-sanitization` as peer deps;
   workspace-protocol dev deps for those same packages plus tooling. Subpath exports for
   `/pino-hook`, `/pino-transport`, and `/winston`.

2. **`packages/data-sanitization-log-providers/tsconfig.json`**: Package-level tsconfig,
   mirrors the sibling; extends root `../../tsconfig.json`.

3. **`packages/data-sanitization-log-providers/tsconfig.build.json`**: Build tsconfig that
   emits to `dist/`; mirrors the sibling.

4. **`packages/data-sanitization-log-providers/vitest.config.ts`**: 100% coverage thresholds;
   excludes `src/types.ts` from coverage.

5. **`packages/data-sanitization-log-providers/src/types.ts`**: `PinoHookOptions` (extends
   `DataSanitizationReplacerOptions`, adds `allowedFields` and `onError`);
   `PinoTransportOptions` (same but omits `customMatchers`, which cannot be serialized over
   the worker-thread boundary); `WinstonSanitizationOptions` (extends
   `TransportStreamOptions`, adds `sanitize`, `allowedFields`, `emitWarning`, `onError`).

6. **`packages/data-sanitization-log-providers/src/shared.ts`**: `sanitizeLine` helper used
   by both pino adapters: sanitizes a string log line and returns the sanitized string plus
   an optional warning line. Extracts shared logic so pino-hook and pino-transport test the
   same code path.

7. **`packages/data-sanitization-log-providers/src/pino-hook.ts`**: Exports
   `createSanitizeLogLine(options?)`. Returns a `(s: string) => string` function suitable for
   `pino({ hooks: { streamWrite: ... } })`. On error, invokes `options.onError`; default
   handler emits an error-level (50) JSON placeholder preserving `time`, `pid`, and
   `hostname` for traceability. Default `allowedFields`: `['time', 'pid', 'hostname']`.

8. **`packages/data-sanitization-log-providers/src/pino-transport.ts`**: Default export is
   the async `pino-abstract-transport` factory. Accepts `PinoTransportOptions` via
   `workerData`. Does not accept `customMatchers` (functions are not serializable across the
   worker-thread boundary). Default `allowedFields`: `['time', 'pid', 'hostname']`.

9. **`packages/data-sanitization-log-providers/src/winston.ts`**: Exports
   `createSanitizingTransport(options?)` and `SanitizingTransport`. The class extends
   `TransportStream`, overrides `log(info, callback)`, sanitizes `info[Symbol.for('message')]`,
   and writes to `process.stdout` (or `options.stream`). Warning line emission is opt-in via
   `emitWarning: true`; when enabled, both warning and sanitized lines are written as separate
   `stream.write()` calls. Default `allowedFields`: `[]` (winston has no standardized
   correlation-field convention; callers opt in explicitly). Documentation explains that the
   1-to-1 winston format limitation makes the warning line non-trivial to emit from a format
   transform, which is why this package provides a `TransportStream` subclass instead.

10. **`packages/data-sanitization-log-providers/test/shared.test.ts`**: Tests for the shared
    sanitization helper.

11. **`packages/data-sanitization-log-providers/test/pino-hook.test.ts`**: Tests for
    `createSanitizeLogLine`: no-op fast path, sanitization, warning emission, error handling,
    custom `onError`, `allowedFields` override.

12. **`packages/data-sanitization-log-providers/test/pino-transport.test.ts`**: Tests for the
    transport default export: calls `build()` from `pino-abstract-transport` with the correct
    options; verifies the async source handler sanitizes lines correctly using a mock source
    iterable.

13. **`packages/data-sanitization-log-providers/test/winston.test.ts`**: Tests for
    `SanitizingTransport`: no-op, sanitization, `emitWarning` on/off, error handling, custom
    `onError`, `allowedFields`.

14. **`packages/data-sanitization-log-providers/README.md`**: Usage examples for all three
    adapters; explains `emitWarning` limitation for winston; notes `customMatchers` limitation
    for the pino transport.

15. **`packages/data-sanitization-log-providers/LICENSE`**: Copy of the MIT license from the
    sibling package.

16. **`.github/workflows/ci.yml`**: Add a separate coverage reporting block for
    `data-sanitization-log-providers` alongside the existing `data-sanitization` block.

17. **`docs/ROADMAP.md`**: Mark the log-providers item done once the PR is merged.

## Relevant Files

- `packages/data-sanitization-log-providers/package.json`: new
- `packages/data-sanitization-log-providers/tsconfig.json`: new
- `packages/data-sanitization-log-providers/tsconfig.build.json`: new
- `packages/data-sanitization-log-providers/vitest.config.ts`: new
- `packages/data-sanitization-log-providers/src/types.ts`: new
- `packages/data-sanitization-log-providers/src/shared.ts`: new
- `packages/data-sanitization-log-providers/src/pino-hook.ts`: new
- `packages/data-sanitization-log-providers/src/pino-transport.ts`: new
- `packages/data-sanitization-log-providers/src/winston.ts`: new
- `packages/data-sanitization-log-providers/test/shared.test.ts`: new
- `packages/data-sanitization-log-providers/test/pino-hook.test.ts`: new
- `packages/data-sanitization-log-providers/test/pino-transport.test.ts`: new
- `packages/data-sanitization-log-providers/test/winston.test.ts`: new
- `packages/data-sanitization-log-providers/README.md`: new
- `packages/data-sanitization-log-providers/LICENSE`: new
- `.github/workflows/ci.yml`: updated (add log-providers coverage steps)
- `docs/ROADMAP.md`: updated (mark item done)

## Verification

```bash
yarn install
yarn workspace data-sanitization-log-providers build
yarn workspace data-sanitization-log-providers test:coverage
yarn lint:ci
yarn format:check
```

All coverage thresholds must pass at 100%. No TypeScript errors. Lint clean.

## Decisions

**Separate `/pino-hook` and `/pino-transport` subpaths rather than a single `/pino`.**
Pino's worker loader resolves a transport by importing the module and unwrapping `.default`
twice. A dual-purpose module that exported both a named hook factory and a default transport
function from one file would work mechanically, but no current pino ecosystem package follows
this as a deliberate design. Separate subpaths make the intent explicit: `/pino-hook` is for
main-thread use, `/pino-transport` is a worker module. Users who want only the hook don't pay
for the `pino-abstract-transport` import.

**`customMatchers` excluded from `PinoTransportOptions`.**
Transport options are passed via `workerData`, which is structured-cloned across the
worker-thread boundary. Functions cannot be cloned. Omitting `customMatchers` prevents a
confusing silent failure. Users who need custom matchers must use the hook adapter instead,
which runs in the main thread.

**`allowedFields` defaults: `['time', 'pid', 'hostname']` for pino, `[]` for winston.**
Pino has a standardized core field set (`time`, `pid`, `hostname`) that is always present and
safe to include in a warning entry for log-aggregation correlation. Winston has no such
standard; defaults to empty so nothing leaks without an explicit opt-in.

**`emitWarning` opt-in for winston (default `false`) with documentation.**
Winston formats are 1-to-1 (one `info` object → one serialized `MESSAGE` string). There is no
built-in mechanism for a format to emit a second log line. The `SanitizingTransport` class
writes directly to a stream, giving it the ability to call `stream.write()` twice. However,
two consecutive JSON lines in a single `write` boundary may cause issues with structured log
aggregators that expect exactly one JSON object per write. The option is exposed with
documentation rather than hidden or silently broken.

**`SanitizingTransport` writes to `process.stdout` (or `options.stream`) directly.**
This follows the pattern of winston's built-in `Console` transport. Users who need file or
external-service output compose this transport with their existing pipeline or pass a custom
`stream`. A format-based alternative would be more composable but cannot emit the warning
line, which is the key differentiator this package provides.
