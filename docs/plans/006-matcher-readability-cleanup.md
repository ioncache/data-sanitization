# Matcher Readability Cleanup

## Approach

Refactor matcher regular expression construction so the current field, value,
and removal fragments are named and easier to review. This preserves matcher
exports, function signatures, capture groups, flags, and matching behavior while
making later parser-first exploration less risky.

## Pre-implementation

Create branch `refactor/matcher-readability-cleanup` from `main` after merging
the hardening regression coverage branch.

## Steps

1. `docs/plans/006-matcher-readability-cleanup.md` - add this plan for the
   behavior-preserving matcher cleanup.
2. `src/matchers.ts` - name local regex fragments for form-encoded, JSON-like,
   and escaped JSON-like matchers without changing exported APIs or regex
   behavior.

## Relevant Files

- `docs/plans/006-matcher-readability-cleanup.md` - new plan for this refactor
  slice.
- `src/matchers.ts` - updated matcher construction with named local fragments.

## Verification

1. Run `yarn test`.
2. Run `yarn test:coverage`.
3. Run `yarn lint`.
4. Run `yarn format:check`.
5. Run `yarn build`.
6. Re-run workspace diagnostics for touched plan and source files.

## Decisions

**Behavior-preserving only** - this branch keeps current regex semantics, even
where future work may choose a parser-first approach, so existing consumers see
no compatibility change.

**Preserve capture groups** - masking relies on `$1` and `$2` replacement groups
in `stringReplacer`, so local fragment extraction must keep group ordering
intact.

**Keep regex assembly local** - each matcher keeps its format-specific regex
pieces near the final `RegExp` construction so reviewers can inspect behavior
without jumping through a helper layer.

**Keep parser-first work separate** - JSON parsing can affect whitespace,
serialization, and malformed string handling, so it remains a later exploration
rather than part of this readability refactor.
