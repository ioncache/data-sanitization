# Roadmap

This roadmap records longer-term direction for `data-sanitization` after the
1.0 release. It is intentionally separate from `docs/plans/`: roadmap items
describe where the project may go, while numbered plans describe concrete work
that is ready to implement on a branch.

## Current State

Version 1.0.1 is a stable base for the library. The current API supports
sanitizing objects, arrays, strings, and `null`; masks or removes fields based
on configurable patterns; ships TypeScript declarations; and avoids exposing
input payloads in sanitizer error details.

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

### Numeric Mask for Number-Typed Sensitive Values

When a sensitive key holds a numeric value, the current `patternMask` string
(`**********`) replaces it, silently changing the value type. A dedicated
`numericMask` preserves the expectation that a number-typed field stays
number-typed after sanitization.

- [ ] Add `DEFAULT_NUMERIC_MASK = 9999999999` to `src/constants.ts`.
- [ ] Add `numericMask?: number` to `DataSanitizationReplacerOptions` in
      `src/types.ts`.
- [ ] Update `objectReplacer` in `src/replacers.ts` to apply `numericMask` when
      the matched sensitive-key value is a `number`.
- [ ] Add tests covering: number-valued sensitive keys masked with default
      `numericMask`, custom `numericMask` override, removal mode with
      number-valued keys, and non-number values unaffected.
- [ ] Update TSDoc on `sanitizeData` and `objectReplacer` to document
      `numericMask` alongside `patternMask`.
- [ ] Update README with a `numericMask` example.

### Performance Benchmarks

Establish a performance baseline before the string-value scanning work lands,
since that change will meaningfully increase per-object work. Benchmarks also
document intended workload characteristics for library consumers.

- [ ] Enable `vitest bench` in `vitest.config.ts`.
- [ ] Create `bench/` with benchmark cases for: shallow objects, deeply nested
      objects, large arrays, and long strings with many pattern hits.
- [ ] Add a `bench` script to `package.json`.
- [ ] Add a performance section to the README covering intended use cases (log
      payloads and in-process sanitization, not streaming pipelines) and rough
      throughput characteristics.
- [ ] Note in the benchmarks that string-value scanning and parser-first JSON
      changes should each update the suite as part of their implementation.

### String-Value Scanning in Object Traversal

`objectReplacer` currently matches by key name only. A field like
`{ message: "api_key=hunter2" }` passes through untouched because `message` is
not a sensitive key, even though the string value contains sensitive content.
Apply the string replacer to each string-typed field value whose key did not
match the sensitive-key patterns.

- [ ] Update `objectReplacer` to accept and build `customMatchers` and
      `useDefaultMatchers` options (currently only consumed by `stringReplacer`).
- [ ] In `objectReplacer`'s inner traversal, apply the built matchers to each
      string-typed field value that did not match a sensitive key pattern.
- [ ] Add tests covering: embedded credentials in free-text fields, nested
      objects with embedded strings, arrays of strings, interaction with
      `removeMatches`, and custom matchers passed to the object path.
- [ ] Update TSDoc on `objectReplacer` and `sanitizeData` to describe the
      string-value scanning behavior.
- [ ] Update README with an example showing embedded-credential detection in a
      non-sensitive-key field.
- [ ] Run benchmarks before and after to document the per-object perf cost.

## Future v2 Candidates

These ideas may change behavior or public contracts, so they should be explored
separately from routine v1.x maintenance.

- [ ] Add parser-first handling for valid JSON strings: parse, sanitize with the
      object traversal path, and serialize back only when parsing succeeds. Keep
      regex-based string matching as a fallback for non-JSON strings.
- [ ] Consider making parser-first string handling opt-in before changing any
      default behavior.
- [ ] Decide whether to explicitly support Map, Set, Date, class instances, typed
      arrays, or other non-plain objects.
- [ ] Collect real v1.x usage signals before planning breaking changes.

## Planning Workflow

When a roadmap item becomes concrete implementation work, create a new numbered
plan in `docs/plans/` for that branch or pull request. The roadmap should stay
high level; implementation plans should name exact files, verification steps,
and decisions for the specific change.

Check off roadmap items as they ship, linking the completed PR.
