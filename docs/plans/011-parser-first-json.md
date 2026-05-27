# Parser-First JSON String Handling

## Approach

When `sanitizeData` receives a string, it currently runs regex matchers across
the raw text. This works for string-valued fields but has two meaningful gaps:
numeric-valued sensitive fields (e.g. `{"password":12345}`) are invisible to the
regex matchers, and the string and object paths can produce different results for
the same logical data depending on how it arrives.

This plan adds a `parseJsonStrings: boolean` option (default `false`). When
enabled and the string is valid JSON containing an object or array, `stringReplacer`
parses it, delegates to `objectReplacer`, and serializes the result back with
`JSON.stringify`. If parsing fails or yields a primitive, it falls through to the
existing regex path so non-JSON strings continue to work unchanged.

The option is opt-in because `JSON.stringify` does not preserve whitespace
formatting or key order, which would be a visible change for callers that pass
pre-formatted JSON logs. Callers who enable it accept that tradeoff in exchange
for consistent, type-aware sanitization.

## Pre-implementation

Create branch `feat/parser-first-json` from `main`.

## Steps

1. `docs/plans/011-parser-first-json.md`: add this plan.

2. `src/types.ts`: add `parseJsonStrings?: boolean` to
   `DataSanitizationReplacerOptions` with a TSDoc comment below `scanStringValues`:

   ```typescript
   /**
    * Whether to parse string input as JSON and sanitize via the object
    * path. When the input is valid JSON containing an object or array,
    * the sanitized result is re-serialized with JSON.stringify. Falls
    * back to regex-based sanitization when the input is not valid JSON
    * or parses to a primitive. Has no effect on non-string input.
    *
    * Note: JSON.stringify does not preserve original whitespace or
    * indentation. Enable this option only when formatting fidelity is
    * not required.
    *
    * Default: false
    */
   parseJsonStrings?: boolean;
   ```

3. `test/replacers.test.ts`: add a `describe('parseJsonStrings option')` block
   inside the existing `describe('stringReplacer')` block. Write all tests before
   touching the implementation. They should fail (the option is parsed but
   currently ignored). Cover:
   - **Default is false / numeric fields unmasked without the option:**
     `stringReplacer('{"password":12345,"username":"mark"}')`: `password` is
     still `12345` in the parsed result (current behavior baseline).

   - **Numeric sensitive field is masked:**
     `stringReplacer('{"password":12345,"username":"mark"}', { parseJsonStrings: true })`
     → `JSON.parse(result).password === DEFAULT_NUMERIC_MASK`.

   - **String sensitive field is masked:**
     `stringReplacer('{"password":"secret","username":"mark"}', { parseJsonStrings: true })`
     → `JSON.parse(result).password === DEFAULT_PATTERN_MASK`.

   - **Nested object is sanitized at all depths:**
     `'{"user":{"password":"secret","email":"mark@example.com"},"id":1}'` with
     `parseJsonStrings: true` → `JSON.parse(result).user.password === DEFAULT_PATTERN_MASK`,
     `id === 1`, `email` unchanged.

   - **`removeMatches: true` removes numeric fields:**
     `'{"password":12345,"username":"mark"}'` with `{ parseJsonStrings: true, removeMatches: true }`
     → `JSON.parse(result)` equals `{ username: 'mark' }` with no `password` key.

   - **Custom `numericMask` is applied:**
     `'{"password":12345}'` with `{ parseJsonStrings: true, numericMask: 0 }`
     → `JSON.parse(result).password === 0`.

   - **Top-level JSON array is sanitized:**
     `'[{"password":"secret"},{"username":"mark"}]'` with `{ parseJsonStrings: true }`
     → `JSON.parse(result)[0].password === DEFAULT_PATTERN_MASK`.

   - **Falls back to regex for non-JSON strings:**
     `'password=secret&username=mark'` with `{ parseJsonStrings: true }`
     → result contains `password=${DEFAULT_PATTERN_MASK}` (regex path runs).

   - **Falls back to regex for invalid JSON:**
     `'{"password":"secret"'` (missing closing brace) with `{ parseJsonStrings: true }`
     → result contains `"password":"${DEFAULT_PATTERN_MASK}"` (regex path runs).

   - **Falls back to regex when JSON is a primitive:**
     `'"hello world"'` (valid JSON string literal) with `{ parseJsonStrings: true }`
     → result is `'"hello world"'` unchanged.

   - **Result is always valid JSON when parse-first path is taken:**
     Build a 12-field object with 2 sensitive string keys and 1 sensitive numeric
     key; stringify it; call `stringReplacer` with `parseJsonStrings: true`;
     assert `JSON.parse` does not throw, sensitive keys are masked, safe keys
     are unchanged.

   Run `yarn vitest run test/replacers.test.ts`: all new tests should fail
   (option not yet implemented), existing tests should pass.

4. `src/replacers.ts`: add `parseJsonStrings = false` to the destructuring in
   `stringReplacer`, and insert the parse-first branch immediately after the
   `typeof data !== 'string'` guard:

   ```typescript
   const {
     customMatchers,
     customPatterns,
     parseJsonStrings = false,
     patternMask,
     removeMatches = false,
     useDefaultMatchers = true,
     useDefaultPatterns = true,
   } = options;

   if (typeof data !== 'string') {
     return data;
   }

   if (parseJsonStrings) {
     try {
       const parsed = JSON.parse(data);
       if (parsed !== null && typeof parsed === 'object') {
         return JSON.stringify(objectReplacer(parsed, options));
       }
     } catch {
       // not valid JSON or not an object/array; fall through to regex path
     }
   }
   ```

   `objectReplacer` is defined later in the same module; this is safe because
   the function body only executes at call time, after the module has fully
   evaluated. No import or reordering needed.

   Run `yarn vitest run test/replacers.test.ts`: all tests should now pass.
   Run `yarn test` to confirm no regressions across the full suite.

5. `bench/sanitize-data.bench.ts`: add two new `describe` groups at the end of
   the file, before the closing comment (if any). Each group pairs a
   `parseJsonStrings: false` (default) bench against a `parseJsonStrings: true`
   bench on the same input so the overhead difference is visible side-by-side.

   **Group 1: small JSON string (overhead case):** A 5-field object, 1 sensitive
   string key. This is the case where parse+stringify overhead is expected to
   dominate and `parseJsonStrings: true` should be slower:

   ```typescript
   describe('sanitizeData: JSON string, small (parseJsonStrings)', () => {
     const input = JSON.stringify({
       api_key: SENSITIVE_STRING_VALUE,
       email: 'user@example.com',
       region: 'us-east-1',
       requestId: 'req-abc-123',
       username: 'mark',
     });

     bench('parseJsonStrings disabled', () => {
       sanitizeData(input);
     });
     bench('parseJsonStrings enabled', () => {
       sanitizeData(input, { parseJsonStrings: true });
     });
   });
   ```

   **Group 2: large JSON string (throughput case):** A 50-field object with 5
   sensitive string keys and 5 sensitive numeric keys. This is the case where
   avoiding 15 regex passes on a long string should make `parseJsonStrings: true`
   competitive or faster, and it also demonstrates correct masking of numeric
   fields which the default path cannot do:

   ```typescript
   describe('sanitizeData: JSON string, large (parseJsonStrings)', () => {
     const input = JSON.stringify(
       Object.fromEntries([
         ...Array.from({ length: 40 }, (_, i) => [`field_${i}`, `value ${i}`]),
         ...Array.from({ length: 5 }, (_, i) => [
           `secret_${i}`,
           SENSITIVE_STRING_VALUE,
         ]),
         ...Array.from({ length: 5 }, (_, i) => [`token_${i}`, i * 1000]),
       ]),
     );

     bench('parseJsonStrings disabled', () => {
       sanitizeData(input);
     });
     bench('parseJsonStrings enabled', () => {
       sanitizeData(input, { parseJsonStrings: true });
     });
   });
   ```

   Run `yarn bench` and record both results in `docs/performance.md` under a new
   "Parser-first JSON strings" section (see step 7).

6. `src/index.ts`: update the TSDoc on `sanitizeData` to add a
   `parseJsonStrings` example below the existing `scanStringValues` example:

   ```typescript
   * @example
   * // Parse JSON string and mask numeric sensitive fields
   * sanitizeData('{"password":12345,"username":"mark"}', { parseJsonStrings: true })
   * // => '{"password":9999999999,"username":"mark"}'
   ```

   Also update the prose description in the function's main comment to mention
   that when `parseJsonStrings` is enabled, valid JSON object/array strings are
   sanitized via `objectReplacer` and re-serialized.

7. `docs/performance.md`: add a "Parser-first JSON strings" section after the
   existing "String workloads" section. Include:
   - A brief explanation of the tradeoff (parse+stringify overhead vs. fewer regex
     passes; correctness for numeric fields)
   - A table with the benchmark results from step 5 (small input: `parseJsonStrings`
     disabled vs enabled; large input: same pair)
   - A note that the large input case also masks numeric fields correctly, which
     the default path cannot do regardless of performance

8. `README.md`: two changes:
   - Add a `parseJsonStrings` row to the Options table directly below
     `scanStringValues`:
     `| \`parseJsonStrings\` | \`boolean\` | \`false\` | Parse string input as JSON and sanitize via the object path when valid. Note: re-serializes with \`JSON.stringify\`, which does not preserve original whitespace or indentation. |`
   - Add a short example under a new "Parse JSON strings" subsection in Usage,
     showing that a numeric sensitive field is correctly masked:

     ```typescript
     sanitizeData('{"password":12345,"username":"mark"}', {
       parseJsonStrings: true,
     });
     // => '{"password":9999999999,"username":"mark"}'
     ```

## Relevant Files

- `docs/plans/011-parser-first-json.md`: this plan (new).
- `src/types.ts`: add `parseJsonStrings` option.
- `src/replacers.ts`: add parse-first branch in `stringReplacer`.
- `src/index.ts`: TSDoc update on `sanitizeData`.
- `test/replacers.test.ts`: new `parseJsonStrings` test block in `stringReplacer` suite.
- `bench/sanitize-data.bench.ts`: two new benchmark describe groups.
- `docs/performance.md`: parser-first section with benchmark results.
- `README.md`: options table row and usage example.

## Verification

1. `yarn test`: 100% pass, no regressions.
2. `yarn test:coverage`: coverage stays at 100%.
3. `yarn lint`: no violations.
4. `yarn format:check`: clean.
5. `yarn build`: compiled output includes `parseJsonStrings` in the type declarations.
6. Manual spot-check: `sanitizeData('{"password":12345}', { parseJsonStrings: true })`
   returns `'{"password":9999999999}'`; without the option returns the original
   string with the number still present (current regex path cannot mask it).
7. Manual spot-check: `sanitizeData('password=secret&username=mark', { parseJsonStrings: true })`
   returns `'password=**********&username=mark'` (regex fallback works).

## Decisions

**Opt-in (`parseJsonStrings: false` default):** `JSON.stringify` does not
preserve whitespace or key order. Callers passing pre-formatted JSON logs would
see their formatting silently altered, which is a breaking change for existing
users. Defaulting to `false` keeps the current behavior stable and lets callers
choose the tradeoff explicitly.

**Fall through to regex when JSON parses to a primitive:** A JSON string like
`'"hello"'` or `'42'` parses successfully but contains no key-value structure to
sanitize. Running `objectReplacer` on a primitive returns it unchanged; serializing
back to a string via `JSON.stringify` would produce `'"hello"'` again. Falling
through to regex is correct behavior and avoids a no-op round-trip.

**`objectReplacer` called with the full `options` object:** This means
`numericMask`, `customPatterns`, `customMatchers`, `removeMatches`,
`scanStringValues`, and all other options apply consistently. No option
translation layer is needed.

**`parseJsonStrings` has no effect on object input:** `objectReplacer` ignores
the option (it doesn't destructure it). The option is meaningless on the object
path and silently ignored, which is the correct behavior.

**No explicit `JSON.stringify` error handling in `stringReplacer`:** If
`objectReplacer` somehow produced an unserializable result, the `JSON.stringify`
call would throw. That error bubbles up to `sanitizeData`'s existing catch block,
which converts it to a `DataSanitizationError` with safe metadata. No additional
handling is needed in `stringReplacer`.

**Forward reference to `objectReplacer` is safe:** `stringReplacer` and
`objectReplacer` are both `const` function expressions in the same module.
`stringReplacer`'s function body references `objectReplacer` by closure, but the
body only executes when the function is called, by which point `objectReplacer`
has been assigned. No hoisting issue exists.
