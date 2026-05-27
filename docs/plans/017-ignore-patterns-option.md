# `ignorePatterns` Option

## Approach

Add an `ignorePatterns` option that lets callers exclude specific key names from
sanitization. Substring matching is intentional and useful — `resetPasswordToken`
and `db_password` are correctly caught — but it can also produce false positives:
a field legitimately named `tokenizer_config` or `has_secrets_manager_access`
gets masked when it should not. `ignorePatterns` addresses this without changing
any default behavior.

The option works at the pattern-resolution level: after the full set of active
patterns is assembled (defaults plus any `customPatterns`), any pattern that
appears in `ignorePatterns` is removed from the set before regexes are built.
This applies consistently to both the object and string sanitization paths.

## Steps

1. `docs/plans/017-ignore-patterns-option.md` — add this plan.

2. `packages/data-sanitization/src/types.ts` — add `ignorePatterns?: string[]`
   to `DataSanitizationReplacerOptions`. Add TSDoc: description, `@param` note
   that matching uses the same case-insensitive substring logic as
   `customPatterns`, and an `@example`.

3. `packages/data-sanitization/src/replacers.ts` — in the shared option
   resolution step (where defaults and custom patterns are merged), filter out
   any resolved pattern whose value appears in `ignorePatterns` before the regex
   set is built. This single change applies to both `objectReplacer` and
   `stringReplacer` via the shared resolver.

4. `packages/data-sanitization/test/replacers.test.ts` — add tests covering:
   - A key that matches a default pattern is not masked when its pattern is in
     `ignorePatterns` (`tokenizer_config` with `ignorePatterns: ['token']`).
   - A key that matches a `customPattern` is not masked when its pattern is in
     `ignorePatterns`.
   - Multiple patterns can be ignored simultaneously.
   - `ignorePatterns: []` (default) has no effect on existing behavior.
   - Ignoring a pattern does not affect other patterns — other sensitive keys
     are still masked.
   - Interaction with `removeMatches: true`.
   - String input: a pattern in `ignorePatterns` is not applied by the string
     replacer.

5. `packages/data-sanitization/README.md` — add `ignorePatterns` row to the
   options table and a short usage example showing `tokenizer_config` passing
   through unmasked.

## Relevant Files

- `docs/plans/017-ignore-patterns-option.md` — new, this plan.
- `packages/data-sanitization/src/types.ts` — updated with new option.
- `packages/data-sanitization/src/replacers.ts` — updated option resolution
  logic.
- `packages/data-sanitization/test/replacers.test.ts` — updated with
  `ignorePatterns` test suite.
- `packages/data-sanitization/README.md` — updated options table and example.

## Verification

1. Run `yarn workspace data-sanitization test` — all tests pass.
2. Run `yarn workspace data-sanitization test:coverage` — coverage remains at
   100%.
3. Run `yarn workspace data-sanitization build` — no TypeScript errors.
4. Run `yarn workspace data-sanitization lint:ci`.
5. Manually confirm the README example is accurate against the implemented
   behavior.

## Decisions

**Pattern-level filtering, not key-level** — `ignorePatterns` filters the
resolved pattern set, not individual key names. This means `ignorePatterns:
['token']` suppresses the entire `token` substring match, not just the literal
key `token`. This is consistent with how `customPatterns` works and is simpler
to reason about. If per-key exclusion is needed in the future, it can be a
separate `ignorePaths` option.

**Applied before regex compilation** — removing ignored patterns before building
regexes means the cache fingerprint reflects the effective pattern set, not the
raw options. Two calls with different `ignorePatterns` values that resolve to
the same active set will correctly share a cache entry.

**Default is `[]`** — no existing behavior changes. The option is purely
additive.

**Interaction with `useDefaultPatterns: false`** — if `useDefaultPatterns` is
false, the default patterns are not in the resolved set to begin with, so
listing them in `ignorePatterns` has no effect. This is the expected and
least-surprising behavior; no special handling needed.
