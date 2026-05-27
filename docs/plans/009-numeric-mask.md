# Numeric Mask for Number-Typed Sensitive Values

## Approach

Add a `numericMask` option (default `9999999999`) applied by `objectReplacer`
when a sensitive key holds a `number`-typed value. Without this, masking a
numeric value with the string `patternMask` silently changes the field's type.
`numericMask` is overridable via options, parallel to how `patternMask` works
for strings.

This change is additive and contained to constants, types, and `objectReplacer`.
`stringReplacer` is unaffected: in string input, everything is already a string,
so there is no type to preserve.

## Pre-implementation

Create branch `feat/numeric-mask` from `main`.

## Steps

1. `docs/plans/009-numeric-mask.md`: add this plan.
2. `src/constants.ts`: add `DEFAULT_NUMERIC_MASK = 9999999999` and include it
   in the named export.
3. `src/types.ts`: add `numericMask?: number` to
   `DataSanitizationReplacerOptions` with a TSDoc comment parallel to the
   existing `patternMask` entry.
4. `test/replacers.test.ts`: before touching the implementation, add tests that
   assert the **current** string-mask behavior for number-typed values. These
   tests must pass before the implementation step and will go red after it:
   - `{ password: 123 }` → `password` is `DEFAULT_PATTERN_MASK`
   - `{ token: 42, username: 'mark' }` → `token` is `DEFAULT_PATTERN_MASK`,
     `username` is `'mark'`

   Note: the existing test `'should mask sensitive object keys with non-string
values'` (test/replacers.test.ts:320) also asserts `password: 123` →
   `DEFAULT_PATTERN_MASK` and will go red at the same time.

   Run `yarn test` to confirm all new and existing tests pass before proceeding.

5. `src/replacers.ts`: update `objectReplacer`:
   - destructure `numericMask` from options
   - when `isSensitiveKey` is true and `removeMatches` is false, apply
     `numericMask ?? DEFAULT_NUMERIC_MASK` if `typeof item === 'number'`,
     otherwise apply `mask` (the existing string mask)
6. `test/replacers.test.ts`: the tests from step 4 and the existing test at
   line 320 will now be failing. Update them to assert the new behavior, and add
   the remaining cases:
   - `{ password: 123 }` → `password` is `DEFAULT_NUMERIC_MASK` (`9999999999`)
   - `{ token: 42 }` → `token` is `DEFAULT_NUMERIC_MASK`
   - custom `numericMask`: `{ password: 99 }` with `numericMask: 0` → `password`
     is `0`
   - non-number values under sensitive keys still use `patternMask`: `secret:
false`, `api_key: ['a', 'b']`, `apikey: { nested: true }`, `token: null`
     all remain `DEFAULT_PATTERN_MASK`
   - non-sensitive key with a number value is untouched: `{ count: 5 }` → `{ count: 5 }`
   - `removeMatches: true` with number-valued sensitive key still removes the
     field entirely (no mask of either type applied)

   Run `yarn test` to confirm all tests pass.

7. `README.md`: add a `numericMask` row to the Options table directly below
   `patternMask`, and add a short example showing a number-valued sensitive key
   being masked.

## Relevant Files

- `docs/plans/009-numeric-mask.md`: new plan for this slice.
- `src/constants.ts`: add `DEFAULT_NUMERIC_MASK`.
- `src/types.ts`: add `numericMask` option.
- `src/replacers.ts`: apply `numericMask` in `objectReplacer`.
- `test/replacers.test.ts`: new and updated tests for numeric masking behavior.
- `README.md`: document `numericMask` in the Options table and examples.

## Verification

1. Run `yarn test`: all tests including the new numeric mask cases pass.
2. Run `yarn test:coverage`: coverage remains at 100%.
3. Run `yarn lint`.
4. Run `yarn format:check`.
5. Run `yarn build`: compiled output includes the new option and constant.

## Decisions

**`numericMask` is `number`-typed, not `string`.** The point is to preserve
the field's type after sanitization. A string mask would defeat the purpose.

**Default is `9999999999`.** Ten nines, the same character-count as the default
string mask (`**********`), making the two defaults visually consistent and
easy to explain.

**`objectReplacer` only, not `stringReplacer`.** String input has no concept
of value type; everything in a string is already a string. The type-preservation
concern only applies to object traversal.

**`removeMatches` behavior is unchanged.** When removal is requested the field
is omitted entirely, regardless of value type. No mask (string or numeric) is
applied.

**Non-number values keep `patternMask`.** `numericMask` is only applied when
`typeof item === 'number'`. Boolean, object, array, and string values under a
sensitive key continue to use the string mask as before.
