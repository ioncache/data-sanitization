# Roadmap

This roadmap records longer-term direction for `data-sanitization` after the
1.0 release. It is intentionally separate from `docs/plans/`: roadmap items
describe where the project may go, while numbered plans describe concrete work
that is ready to implement on a branch.

## Current State

Version 1.1.0 is a stable base for the library. The current API supports
sanitizing objects, arrays, strings, and `null`; masks or removes fields based
on configurable patterns; supports numeric masking, string-value scanning for
embedded credentials, and parser-first JSON string handling; ships TypeScript
declarations; and avoids exposing input payloads in sanitizer error details.

The project should continue to prioritize a small public API, predictable
behavior, sensitive-data sanitization for logging and debugging workflows, and
low-friction adoption in JavaScript and TypeScript projects.

## Near-Term v1.x Work

These items should preserve existing behavior unless a bug fix requires a
carefully documented change.

### Documentation and Release Polish — completed in [#284](https://github.com/ioncache/data-sanitization/pull/284)

- [x] Refresh the README opening and quick-start flow so the first successful use
      case is easy to scan.
- [x] Expand installation instructions for npm, yarn, pnpm, and bun.
- [x] Clarify import patterns, including named export, default export,
      `DataSanitizationError`, and TypeScript declaration support.
- [x] Improve examples for masking, removal, custom patterns, custom matchers, and
      safe error handling.
- [x] Add package metadata that improves registry discoverability, such as
      `homepage` and `bugs`.
- [x] Update contributor documentation with Volta, supported package scripts,
      build validation, and release validation notes.

### Hardening — completed in [#281](https://github.com/ioncache/data-sanitization/pull/281), [#282](https://github.com/ioncache/data-sanitization/pull/282), [#283](https://github.com/ioncache/data-sanitization/pull/283), [#285](https://github.com/ioncache/data-sanitization/pull/285)

- [x] Add regression coverage for Unicode sensitive values, deeply nested objects,
      larger arrays, repeated sensitive keys at different depths, custom matcher
      failures, symbol keys, non-plain objects, and JSON removal edge cases.
- [x] Document current object traversal behavior before widening support: plain
      objects and arrays are traversed, while non-plain objects should remain a
      deliberate compatibility decision.
- [x] Wrap custom matcher failures in sanitizer-specific errors with safe metadata
      only.
- [x] Review removal behavior for JSON-like strings and escaped JSON-like strings
      so ordinary inputs do not produce surprising malformed fragments.
- [x] Treat custom matchers as trusted code for now, and defer heavier regex safety
      tooling until there is a concrete need.

### Code Clarity and Quality — completed in [#280](https://github.com/ioncache/data-sanitization/pull/280), [#286](https://github.com/ioncache/data-sanitization/pull/286)

- [x] Extract shared option resolution so string and object sanitization do not
      drift in how they combine default and custom patterns.
- [x] Make matcher regex construction easier to read by using named pieces or
      focused builder helpers.
- [x] Keep object traversal helpers small if hardening work causes the replacer
      implementation to grow.
- [x] Preserve public JSDoc and type clarity when moving code.

## Upcoming v1.x Work

These items extend behavior without breaking existing contracts.

### Numeric Mask for Number-Typed Sensitive Values — completed in [#298](https://github.com/ioncache/data-sanitization/pull/298)

- [x] Add `DEFAULT_NUMERIC_MASK = 9999999999` to `src/constants.ts`.
- [x] Add `numericMask?: number` to `DataSanitizationReplacerOptions` in
      `src/types.ts`.
- [x] Update `objectReplacer` in `src/replacers.ts` to apply `numericMask` when
      the matched sensitive-key value is a `number`.
- [x] Add tests covering: number-valued sensitive keys masked with default
      `numericMask`, custom `numericMask` override, removal mode with
      number-valued keys, and non-number values unaffected.
- [x] Update TSDoc on `sanitizeData` and `objectReplacer` to document
      `numericMask` alongside `patternMask`.
- [x] Update README with a `numericMask` example.

### Performance Benchmarks — completed in [#299](https://github.com/ioncache/data-sanitization/pull/299)

Establish a performance baseline before the string-value scanning work lands,
since that change will meaningfully increase per-object work. Benchmarks also
document intended workload characteristics for library consumers.

- [x] Enable `vitest bench` in `vitest.config.ts`.
- [x] Create `bench/` with benchmark cases for: shallow objects, deeply nested
      objects, large arrays, and long strings with many pattern hits.
- [x] Add a `bench` script to `package.json`.
- [x] Add a performance section to the README covering intended use cases (log
      payloads and in-process sanitization, not streaming pipelines) and rough
      throughput characteristics.
- [x] Note in the benchmarks that string-value scanning and parser-first JSON
      changes should each update the suite as part of their implementation.

### String-Value Scanning in Object Traversal — completed in [#300](https://github.com/ioncache/data-sanitization/pull/300)

`objectReplacer` currently matches by key name only. A field like
`{ message: "api_key=hunter2" }` passes through untouched because `message` is
not a sensitive key, even though the string value contains sensitive content.
Apply the string replacer to each string-typed field value whose key did not
match the sensitive-key patterns.

- [x] Update `objectReplacer` to accept and build `customMatchers` and
      `useDefaultMatchers` options (currently only consumed by `stringReplacer`).
- [x] In `objectReplacer`'s inner traversal, apply the built matchers to each
      string-typed field value that did not match a sensitive key pattern.
- [x] Add tests covering: embedded credentials in free-text fields, nested
      objects with embedded strings, arrays of strings, interaction with
      `removeMatches`, and custom matchers passed to the object path.
- [x] Update TSDoc on `objectReplacer` and `sanitizeData` to describe the
      string-value scanning behavior.
- [x] Update README with an example showing embedded-credential detection in a
      non-sensitive-key field.
- [x] Run benchmarks before and after to document the per-object perf cost.

### Parser-First JSON String Handling — completed in #301

When `parseJsonStrings: true`, valid JSON object/array strings are parsed,
sanitized via `objectReplacer`, and re-serialized. Falls back to regex for
non-JSON or primitive strings. Fixes the gap where numeric-valued sensitive
fields are invisible to the regex path.

- [x] Add `parseJsonStrings?: boolean` to `DataSanitizationReplacerOptions`.
- [x] Add parse-first branch in `stringReplacer` after the non-string guard.
- [x] Add tests: numeric masking, string masking, nested objects, arrays,
      `removeMatches`, custom `numericMask`, fallback paths, integration.
- [x] Add benchmark groups for `parseJsonStrings` enabled vs disabled.
- [x] Update TSDoc on `sanitizeData` with `parseJsonStrings` example.
- [x] Update `docs/performance.md` with parser-first benchmark results.
- [x] Update README with options table row and "Parse JSON strings" usage
      subsection.

## Ecosystem Expansion

These items extend the library into companion packages and shared utilities.
They involve structural changes to the repository but do not affect the
existing `data-sanitization` public API.

### Utility Helpers (`/utils` subpath export) — completed in [#313](https://github.com/ioncache/data-sanitization/pull/313)

Export `diffSanitizedFields` and `buildSanitizedWarning` as named exports from
a `data-sanitization/utils` subpath. These helpers are useful in log middleware
implementations regardless of logger and are currently only available to
applications that inline them.

- [x] `diffSanitizedFields(original, sanitized)` — recursively diffs two parsed
      log objects and returns dot-notation paths for any keys whose values changed
- [x] `buildSanitizedWarning(originalStr, sanitizedStr)` — builds a structured
      warning log entry identifying which fields were sanitized, suitable for
      prepending to the sanitized log line

### Monorepo Migration — completed in [#310](https://github.com/ioncache/data-sanitization/pull/310)

Migrate the repository to a Yarn workspace monorepo to support companion
packages. Replace the current `conventional-changelog`-based release script
with [Changesets](https://github.com/changesets/changesets) for independent
per-package versioning. Conventional commit discipline and commitlint
enforcement remain unchanged.

### Log Provider Adapters (`data-sanitization-log-providers`) — completed in [#314](https://github.com/ioncache/data-sanitization/pull/314)

New `data-sanitization-log-providers` workspace package with subpath exports
for Pino (`/pino`), Winston (`/winston`), and Bunyan (`/bunyan`). Each adapter
wires `sanitizeData` into the logger's native hook or transport API. The
package lists `data-sanitization` as a peer dependency and each supported
logger as an optional peer dependency.

## Collect Usage Signals Before Implementing

### Strict `parseJsonStrings` Mode

When `parseJsonStrings: true` is set and the input string is not valid JSON,
`sanitizeData` silently falls back to text-based pattern matching. Numeric-valued
sensitive fields are not masked on the regex path, so callers who expect JSON
but receive malformed input may get incomplete sanitization without knowing it.

Proposed: a `parseJsonStringsStrict` option (or similar) that throws or fully
redacts the string when `JSON.parse` fails, rather than silently falling back.
Tracked in [#306](https://github.com/ioncache/data-sanitization/issues/306).

Signals to watch for:

- GitHub issues where users report unexpected incomplete masking with
  `parseJsonStrings: true`
- Questions about the fallback behavior or requests for a strict mode

To collect: monitor the GitHub Issues tracker; search for keywords like
`parseJsonStrings`, `strict`, `fallback`, or `parse failure`.

## Future v2 Candidates

These ideas may change behavior or public contracts, so they should be explored
separately from routine v1.x maintenance.

### Non-String JSON Value Matching on the Regex Path

`jsonMatcher` and `escapedJsonMatcher` only match string-quoted values
(`"field":"value"`). Sensitive fields whose values are `number`, `boolean`,
`null`, nested arrays, or nested objects produce no match on the raw regex
path. The existing workaround is `parseJsonStrings: true`, which routes valid
JSON through `objectReplacer` and handles all value types correctly.

Three approaches are documented in `docs/plans/018-pattern-and-matcher-additions.md`:

- **Option A** — Extend `jsonMatcher` regex with a second alternative for
  unquoted primitives. Cannot handle arrays or nested objects (balanced bracket
  counting is beyond a single-pass regex). Changes `$1`/`$2` capture group
  semantics for the new alternative.
- **Option B** — Auto-detect JSON in `stringReplacer` and route through
  `objectReplacer` unconditionally (effectively making `parseJsonStrings: true`
  the default). Handles all value types; changes behavior for all string inputs
  and has a parse-cost for non-JSON strings.
- **Option C** — Accept the limitation and document `parseJsonStrings: true`
  as the correct path for JSON strings. Remove the current "Group B" tests
  that document the gap; they would instead become "known out-of-scope" notes.

Tests in `test/matchers.test.ts` and `test/replacers.test.ts` already document
the current behavior; the comment in `replacers.test.ts` flags this as a v2
decision point.

### `parseJsonStrings: true` as the Default — completed in #322

Valid JSON object and array strings are now always sanitized via `objectReplacer`
by default (full type coverage, including numeric and boolean sensitive values),
with automatic fallback to text-based matching for non-JSON strings. Callers
relying on the regex-path output for JSON strings (e.g. value format, whitespace
preservation) must opt out with `parseJsonStrings: false`.

### Non-Plain Object Type Support

Current behavior: non-plain objects (custom prototypes) pass through untouched.

| Type              | Difficulty | Value  | Breaking Change       | Notes                                                |
| ----------------- | ---------- | ------ | --------------------- | ---------------------------------------------------- |
| Map               | —          | —      | No (additive, opt-in) | Implemented; enabled via `sanitizeCollections: true` |
| Set               | —          | —      | No (additive, opt-in) | Implemented; enabled via `sanitizeCollections: true` |
| Date              | None       | None   | No                    | Already preserved correctly; no work needed          |
| TypedArrays       | None       | None   | No                    | Already preserved correctly; no work needed          |
| Class instances   | High       | Medium | Yes (without opt-in)  | v2 candidate; needs opt-in flag and prototype safety |
| WeakMap / WeakSet | N/A        | N/A    | N/A                   | Not iterable by design; cannot be traversed          |

### Collect Usage Signals

Collect real-world signals before committing to class instance support.

Concrete evidence of user impact should drive timing. Signals to watch for:

- GitHub issues where users report class instance values passing through without
  sanitization unexpectedly
- Repeated questions about why non-plain objects are not sanitized

  To collect: monitor the GitHub Issues tracker; periodically search open and
  closed issues for keywords like `class`, `instance`, or `non-plain`. A cluster
  of independent requests is the clearest signal that the work is justified.

### Convenience Preset Helper

The four named pattern groups (`credentialPatterns`, `headerPatterns`, `piiPatterns`,
`phiPatterns`) are already exported. A future addition could export a pre-composed helper —
for example a `buildPreset` function or a `sensitiveDataPatterns` constant that combines
groups — to reduce configuration mistakes for common use cases (PII opt-in, strict privacy
removal). Collect signals before adding API surface: watch for repeated questions about how
to combine pattern groups or requests for a single "include everything" option.

### Additional Adversarial Test Coverage

The adversarial test suite (PR #319) covers key regex edge cases. Potential gaps to revisit
if user reports emerge:

- Large stack traces with embedded credentials (performance + correctness)
- `Map` and `Set` instances with sensitive object keys (`sanitizeCollections: true` path)
- Deeply nested JSON strings within JSON strings (escaped JSON path)

Track via GitHub Issues; add coverage when a concrete failure is reported rather than
speculatively.

## Planning Workflow

When a roadmap item becomes concrete implementation work, create a new numbered
plan in `docs/plans/` for that branch or pull request. The roadmap should stay
high level; implementation plans should name exact files, verification steps,
and decisions for the specific change.

Check off roadmap items as they ship, linking the completed PR.
