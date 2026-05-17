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
behavior, safe logging use cases, and low-friction adoption in JavaScript and
TypeScript projects.

## Near-Term v1.x Work

These items should preserve existing behavior unless a bug fix requires a
carefully documented change.

### Documentation and Release Polish

1. Refresh the README opening and quick-start flow so the first successful use
   case is easy to scan.
2. Expand installation instructions for npm, yarn, pnpm, and bun.
3. Clarify import patterns, including named export, default export,
   `DataSanitizationError`, and TypeScript declaration support.
4. Improve examples for masking, removal, custom patterns, custom matchers, and
   safe error handling.
5. Add package metadata that improves registry discoverability, such as
   `homepage` and `bugs`.
6. Update contributor documentation with Volta, supported package scripts,
   build validation, and release validation notes.

### Hardening

1. Add regression coverage for Unicode sensitive values, deeply nested objects,
   larger arrays, repeated sensitive keys at different depths, custom matcher
   failures, symbol keys, non-plain objects, and JSON removal edge cases.
2. Document current object traversal behavior before widening support: plain
   objects and arrays are traversed, while non-plain objects should remain a
   deliberate compatibility decision.
3. Wrap custom matcher failures in sanitizer-specific errors with safe metadata
   only.
4. Review removal behavior for JSON-like strings and escaped JSON-like strings
   so ordinary inputs do not produce surprising malformed fragments.
5. Treat custom matchers as trusted code for now, and defer heavier regex safety
   tooling until there is a concrete need.

### Code Clarity and Quality

1. Extract shared option resolution so string and object sanitization do not
   drift in how they combine default and custom patterns.
2. Make matcher regex construction easier to read by using named pieces or
   focused builder helpers.
3. Keep object traversal helpers small if hardening work causes the replacer
   implementation to grow.
4. Preserve public JSDoc and type clarity when moving code.

## Future v2 Candidates

These ideas may change behavior or public contracts, so they should be explored
separately from routine v1.x maintenance.

1. Add parser-first handling for valid JSON strings: parse, sanitize with the
   object traversal path, and serialize back only when parsing succeeds. Keep
   regex-based string matching as a fallback for non-JSON strings.
2. Consider making parser-first string handling opt-in before changing any
   default behavior.
3. Evaluate separate matcher abstractions for object keys and string formats.
   The current matcher type is regex-oriented and primarily serves string
   matching.
4. Decide whether to explicitly support Map, Set, Date, class instances, typed
   arrays, or other non-plain objects.
5. Collect real v1.x usage signals before planning breaking changes.

## Planning Workflow

When a roadmap item becomes concrete implementation work, create a new numbered
plan in `docs/plans/` for that branch or pull request. The roadmap should stay
high level; implementation plans should name exact files, verification steps,
and decisions for the specific change.

Likely first implementation slices:

1. README and release polish.
2. Hardening regression tests.
3. Matcher readability cleanup.
4. Parser-first JSON string exploration.
