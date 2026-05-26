# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git worktrees

Worktrees for this repo are stored as a sibling directory: `../data-sanitization.worktrees/<branch-name>`.

## Development workflow

See [docs/development.md](docs/development.md) for setup, build, test, lint, planning, PR/commit
conventions, and the release process.

To run a single test file: `yarn workspace data-sanitization test test/matchers.test.ts`

## Architecture

This is a TypeScript library that sanitizes sensitive data in objects and strings. The public API is
a single function, `sanitizeData`, exported from `packages/data-sanitization/src/index.ts`.

**Data flow:**

- **String input** → `stringReplacer` applies regex matchers pattern-by-pattern across the string
- **Object/array input** → `objectReplacer` recursively walks the structure, matching keys by name
  (no JSON round-trip). Non-plain object instances (custom prototypes) are preserved without
  modification.
- **Null input** → returned as-is

**Key modules:**

- `packages/data-sanitization/src/matchers.ts` — Three built-in `DataSanitizationMatcher`
  factories (`jsonMatcher`, `escapedJsonMatcher`, `formEncodedMatcher`). Each takes a pattern string
  and optional `remove` flag and returns a `RegExp`. Custom matchers must produce a global,
  case-insensitive regex using capture groups `$1`/`$2` for value replacement.
- `packages/data-sanitization/src/replacers.ts` — `stringReplacer` and `objectReplacer`. String
  replacer iterates all (pattern × matcher) combinations. Object replacer builds `RegExp` key
  matchers once, then recurses with a `WeakSet` to detect circular references.
- `packages/data-sanitization/src/constants.ts` — Default field-name patterns (`apikey`,
  `api_key`, `password`, `secret`, `token`) and default mask (`**********`).
- `packages/data-sanitization/src/types.ts` — All exported TypeScript types
  (`DataSanitizationMatcher`, `DataSanitizationReplacer`, `DataSanitizationReplacerOptions`, etc.).
- `packages/data-sanitization/src/errors.ts` — `DataSanitizationError` with a `details` property;
  error details never include the original input payload.

## Conventions

@.ai/instructions/code-complexity.md
@.ai/instructions/comments.md
@.ai/instructions/jsdoc-tsdoc.md
@.ai/instructions/unit-tests.md
