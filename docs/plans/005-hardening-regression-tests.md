# Hardening Regression Tests

## Approach

Add behavior-preserving regression coverage for edge cases identified in the
post-v1 roadmap before changing matcher or traversal internals. This branch
documents the current v1 behavior for sensitive Unicode values, deeper object
graphs, repeated sensitive keys, large arrays, non-plain objects, and symbol
keys.

## Pre-implementation

Create branch `test/hardening-regression-coverage` from `main` after merging the
README release-polish branch.

## Steps

1. `docs/plans/005-hardening-regression-tests.md` - add this plan for the
   hardening regression coverage work.
2. `test/replacers.test.ts` - add object and string replacer edge-case coverage
   for recursion, repeated sensitive keys, arrays, symbols, non-plain objects,
   and Unicode sensitive values.

## Relevant Files

- `docs/plans/005-hardening-regression-tests.md` - new plan for this test-only
  hardening slice.
- `test/replacers.test.ts` - updated replacer regression coverage.

## Verification

1. Run `yarn test`.
2. Run `yarn test:coverage`.
3. Run `yarn lint`.
4. Run `yarn format:check`.
5. Re-run workspace diagnostics for touched test and plan files.

## Decisions

**Test-only branch** - this work documents existing v1 behavior and avoids
runtime implementation changes so later hardening or matcher cleanup work has a
clear safety net.

**Prefer observable behavior over internals** - tests should assert public
sanitization results and documented helper behavior rather than private
implementation details.

**No new API options** - depth limits, non-plain object traversal changes, and
structured string parsing remain future implementation work after the current
behavior is covered.

**Existing coverage boundaries** - current public API and matcher tests already
cover custom matcher error wrapping and JSON removal edge positions, so this
branch keeps new assertions at the replacer boundary.
