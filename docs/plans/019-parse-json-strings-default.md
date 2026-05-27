# Plan 019: Change `parseJsonStrings` Default to `true`

## Overview

Flip the `parseJsonStrings` default from `false` to `true`. This is a breaking
change (v2) committed with `feat!:` to signal a semver major bump.

The regex path only matches string-quoted values; non-string JSON values such
as booleans, `null`, arrays, and nested objects are invisible to it. Defaulting
to `true` routes valid JSON object/array strings through `objectReplacer`, which
handles all value types correctly and is 3–4× faster for typical JSON payloads.

Non-JSON strings continue to fall back to the regex path automatically.

## Branch

`feat/019-parse-json-strings-default`

## Files to Change

- `packages/data-sanitization/src/replacers.ts`
- `packages/data-sanitization/src/types.ts`
- `packages/data-sanitization/test/replacers.test.ts`
- `packages/data-sanitization/README.md`
- `docs/ROADMAP.md`

---

## Tasks

### Task 1: Update `replacers.ts` default

**File:** `packages/data-sanitization/src/replacers.ts`

Change the default destructuring value:

```diff
-  parseJsonStrings = false,
+  parseJsonStrings = true,
```

No other logic changes are needed; the branch that checks `if (parseJsonStrings)` already handles the object/array parse-and-sanitize path, and the regex fallback path continues to handle non-JSON strings.

**Verification:** `yarn workspace data-sanitization test test/replacers.test.ts`
(will fail before test updates; that is expected)

---

### Task 2: Update `types.ts` JSDoc

**File:** `packages/data-sanitization/src/types.ts`

In the `parseJsonStrings` property doc block, change the default note:

```diff
- * Default: false
+ * Default: true
```

---

### Task 3: Rework `test/replacers.test.ts` paired tests

**File:** `packages/data-sanitization/test/replacers.test.ts`

The "with edge case string inputs" describe block (currently lines ~539–716)
contains 5 pairs of tests. Each pair documents:

1. Default path: value left unchanged (regex path, `parseJsonStrings: false`)
2. Explicit path: value masked (`parseJsonStrings: true`)

With the new default, the pairs swap roles. Update each pair as follows:

**Pattern for each pair:**

- First test (formerly "default unchanged"): add explicit `parseJsonStrings: false`
  and update the `it()` title to describe the regex-path behavior.
  Example: `'should leave a boolean sensitive field value unchanged'`
  → `'should leave a boolean sensitive field value unchanged when JSON string parsing is disabled'`

- Second test (formerly "parseJsonStrings: true"): remove the explicit
  `parseJsonStrings: true` option (now tests the new default) and update the
  `it()` title to drop "when JSON string parsing is enabled".
  Example: `'should mask a sensitive field whose value is a boolean when JSON string parsing is enabled'`
  → `'should mask a sensitive field whose value is a boolean'`

**Pairs to update (5 total):**

1. boolean sensitive field value
2. null sensitive field value
3. array sensitive field value
4. nested object sensitive field value
5. empty string sensitive field value

**Empty string test (line ~649):**

The first test only asserts valid JSON + non-sensitive field preserved. With the
new default, `password: ""` → masked via objectReplacer. The first test still
passes (valid JSON, username preserved). Strengthen it to also assert
`result.password === DEFAULT_PATTERN_MASK` when adding `parseJsonStrings: false`
Note: with `parseJsonStrings: false` the regex path DOES handle empty strings
(it matches `"password":""`). So:

- With `parseJsonStrings: false`: regex path masks empty string → `DEFAULT_PATTERN_MASK`
- With `parseJsonStrings: true` (new default): object path masks empty string → `DEFAULT_PATTERN_MASK`

So the first test with explicit `parseJsonStrings: false` can assert masking
too. The second test (default) can assert masking without the explicit option.

**Escaped quote test (line ~675):**

Both paths produce valid JSON with non-sensitive fields preserved. The second
test (default path) can drop `parseJsonStrings: true` and assert full masking.

**Update the comment:**

Replace the comment block at the start of the describe (lines 540–544) with:

```
// The regex path only matches string-quoted values. For each non-string value
// type below there are two paired tests: the parseJsonStrings: false path
// documents that the value is left unchanged on the regex path, and the default
// path documents that masking works correctly via objectReplacer.
```

**Verification:** `yarn workspace data-sanitization test test/replacers.test.ts`

---

### Task 4: Update README

**File:** `packages/data-sanitization/README.md`

1. In the options table, update the `parseJsonStrings` row default column:
   - `false` → `true`
   - Also update the description column to remove the "setting it to true" framing
     and describe it as the default behavior

2. In the "Parse JSON strings" subsection (currently says "Setting
   `parseJsonStrings: true`..."), update to describe the feature as the default.
   Add a note that callers can opt out with `parseJsonStrings: false` when
   formatting fidelity (original whitespace/indentation) is required.

**Verification:** `yarn workspace data-sanitization lint`

---

### Task 5: Update ROADMAP

**File:** `docs/ROADMAP.md`

Mark the "`parseJsonStrings: true` as the Default" v2 candidate as completed,
linking this PR.

---

### Task 6: Run full test suite and verify coverage

```bash
yarn workspace data-sanitization test
yarn workspace data-sanitization test --coverage
```

All tests must pass and coverage must be 100%.

---

### Task 7: Commit

```
feat!: change parseJsonStrings default to true

Route valid JSON object/array strings through objectReplacer by default.
This handles non-string sensitive values (boolean, null, array, nested
object) that the regex path cannot mask. Non-JSON strings fall back to
the regex path automatically.

Callers relying on the regex-path output for JSON strings (value format,
whitespace preservation) must now opt out with parseJsonStrings: false.
```

Commit both the plan file and all implementation changes in one commit.
