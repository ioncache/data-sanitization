# Pattern and Matcher Additions

## Approach

Extend the library in three related areas identified during adversarial string
testing (plan 016):

1. **`cookieMatcher`**: a new built-in matcher for the `key=value; key=value`
   cookie string format, which uses semicolons as field separators rather than
   ampersands. Added to `defaultMatchers`.

2. **Pattern constant reorganization**: split the flat `DEFAULT_PATTERNS`
   array into named sub-arrays (`credentialPatterns`, `headerPatterns`,
   `piiPatterns`, `phiPatterns`) that are combined into the exported
   `defaultPatterns`. This keeps each group's rationale visible in the code
   while keeping the public API backward compatible.

3. **Strict pattern matching**: a new `{ match, strict }` object form for
   pattern entries that produces an exact whole-name match rather than a
   substring match. This allows safe inclusion of common single-word PII field
   names (`address`, `city`, `state`) that would produce false positives as
   substring patterns.

4. **Non-string JSON value matching (deferred)**: the `jsonMatcher` regex
   only matches string-quoted values and currently cannot match boolean, null,
   number, array, or object values without `parseJsonStrings: true`. Nine
   intentionally failing tests in `test/matchers.test.ts` and
   `test/replacers.test.ts` document this gap. Resolution options are captured
   in the Decisions section; implementation is deferred pending the outcome of
   plan 017 (`ignorePatterns`) which may influence the approach.

## Pre-implementation

Create branch and worktree from main after plans 016 and 017 are merged.

## Steps

### Part 1: `cookieMatcher`

1. **`packages/data-sanitization/src/matchers.ts`**: add `cookieMatcher`
   factory. Structurally mirrors `formEncodedMatcher` with two differences:
   - Field separator is `;` (and optionally `; `) instead of `&`
   - Value stop character set: `[^\r\n;]*` instead of `[^\r\n&]*`

   The remove path mirrors `formEncodedMatcher`'s remove path adapted for `;`
   delimiters.

   Add `cookieMatcher` to `defaultMatchers` and export it alongside the
   existing three.

2. **`packages/data-sanitization/test/matchers.test.ts`**: add a
   `describe('cookieMatcher')` block with tests covering:
   - Basic `key=value; key=value` matching
   - Case-insensitive key matching
   - Substring key matching (e.g. `auth_token` matches pattern `token`)
   - Masking: preserves non-sensitive cookie pairs
   - Removal: leaves remaining pairs intact
   - Multi-pair strings with the sensitive field in various positions
   - Field with empty value
   - Field at end of string (no trailing `;`)

### Part 2: Strict pattern matching

3. **`packages/data-sanitization/src/types.ts`**: add `PatternEntry` type:

   ```ts
   type PatternEntry = string | { match: string; strict?: boolean };
   ```

   Update `DataSanitizationMatcher` to accept an optional third `strict`
   parameter:

   ```ts
   type DataSanitizationMatcher = (
     pattern: string,
     remove?: boolean,
     strict?: boolean,
   ) => RegExp;
   ```

   Update any consumer types that reference `DataSanitizationMatcher` or
   accept patterns (e.g. `DataSanitizationReplacerOptions.customPatterns`
   should accept `PatternEntry[]`).

4. **`packages/data-sanitization/src/matchers.ts`**: update all three
   built-in matchers plus the new `cookieMatcher` to accept and respect the
   `strict` parameter:

   ```ts
   const fieldName = strict ? escaped : `[\\w-]*${escaped}[\\w-]*`;
   ```

5. **`packages/data-sanitization/src/replacers.ts`**: update the point where
   patterns are iterated and passed to matchers. Normalize `PatternEntry` to
   `{ match, strict }` before calling each matcher factory, passing `strict`
   as the third argument.

6. **`packages/data-sanitization/test/matchers.test.ts`**: add tests for
   strict mode in each matcher:
   - Strict: exact field name matches
   - Strict: does not match when pattern appears only as a substring
   - Non-strict (default): substring behavior unchanged

### Part 3: Pattern constant reorganization

7. **`packages/data-sanitization/src/constants.ts`**: replace the current
   `DEFAULT_PATTERNS` array with named sub-arrays and compose `defaultPatterns`
   from them:

   ```ts
   const credentialPatterns: PatternEntry[] = [
     'apikey',
     'api_key',
     'password',
     'secret',
     'token',
   ];

   const headerPatterns: PatternEntry[] = [
     'authorization', // covers Authorization, Proxy-Authorization, x-authorization
     'api-key', // covers X-API-Key, x-api-key
   ];

   const piiPatterns: PatternEntry[] = [
     // Names
     'first_name',
     'last_name',
     'middle_name',
     'full_name',
     'date_of_birth',
     'dob',
     'birth_date',
     // Contact
     'email',
     'phone',
     'mobile',
     // Address: single-word terms use strict to avoid email_address / ip_address
     { match: 'address', strict: true },
     'street_address',
     'address_line',
     'postal_code',
     { match: 'city', strict: true },
     { match: 'state', strict: true },
     { match: 'zip', strict: true },
     // Government IDs
     'ssn',
     'social_security',
     'social_insurance_number',
     'national_id',
     'passport',
     'drivers_license',
     'tax_id',
     // Digital identifiers (GDPR-relevant)
     'ip_address',
   ];

   const phiPatterns: PatternEntry[] = [
     // Medical record identifiers (HIPAA)
     'mrn',
     'medical_record_number',
     'patient_id',
     'chart_number',
     'member_id',
     'beneficiary_id',
     'subscriber_id',
     'insurance_id',
     'claim_number',
     'encounter_id',
     // Healthcare-specific dates
     'admission_date',
     'discharge_date',
     'service_date',
     'appointment_date',
     'death_date',
     // Clinical data
     'diagnosis_code',
     'diagnosis',
     'condition',
     'medication',
     'prescription',
     'procedure_code',
     // Provider / facility
     'provider_npi',
     'provider_id',
     // Biometrics
     'fingerprint',
     'biometric_id',
   ];

   // PII and PHI are opt-in; credentials + headers cover most applications
   const defaultPatterns: PatternEntry[] = [
     ...credentialPatterns,
     ...headerPatterns,
   ];
   ```

   Keep `DEFAULT_PATTERN_MASK` unchanged.

8. **`packages/data-sanitization/src/index.ts`**: export the new constants:
   `credentialPatterns`, `headerPatterns`, `piiPatterns`, `phiPatterns`,
   `defaultPatterns`. Remove the old `DEFAULT_PATTERNS` export or alias it to
   `defaultPatterns` for a one-version deprecation if it was public.

9. **`packages/data-sanitization/test/constants.test.ts`** (new): tests
   confirming the composition and that each sub-array is non-empty and
   contains no duplicates.

10. **`README.md`**: update the patterns section to document the sub-arrays,
    show how to compose them, and explain the strict/fuzzy distinction.

### Part 4: Non-string JSON value matching (deferred decision)

The nine failing tests in `test/matchers.test.ts` and `test/replacers.test.ts`
remain as documentation of the gap until the approach below is chosen and
implemented. Remove the `NOTE:` comment blocks added in plan 016 when this
work is done.

**Option A: Extend the `jsonMatcher` regex for primitives**

Add a second alternative to the masking pattern that handles unquoted
primitive values (number, boolean, null). The replacement is more complex
because there are no quote characters to use as `$1`/`$2` capture groups;
the key+colon would need to become group 1 and the replacement would emit
`$1"**********"` (converting the non-string value to a masked string).

Cannot handle arrays or objects; those require balanced bracket counting
which is beyond a single-pass regex.

**Option B: Auto-detect JSON and route through `objectReplacer`**

In `stringReplacer`, attempt `JSON.parse()` first. If successful, sanitize
via `objectReplacer` and re-serialize. Fall back to regex for non-JSON
strings. This handles all value types including arrays and nested objects, at
the cost of a behavior change (valid JSON strings are always object-path
sanitized rather than regex-path sanitized) and a performance cost for inputs
that aren't JSON.

**Option C: Accept the limitation; document `parseJsonStrings: true`**

The `parseJsonStrings: true` variants of all failing tests already pass. The
regex path is a "scan arbitrary text" path; the object path is a "sanitize
known JSON" path. Add a note to the README making this distinction explicit.
The failing tests would be deleted (they assert behavior that is explicitly
out of scope for the regex path) rather than implemented.

## Relevant Files

- `packages/data-sanitization/src/matchers.ts`: updated (cookieMatcher + strict)
- `packages/data-sanitization/src/types.ts`: updated (PatternEntry, matcher signature)
- `packages/data-sanitization/src/replacers.ts`: updated (PatternEntry normalization)
- `packages/data-sanitization/src/constants.ts`: updated (sub-arrays, composition)
- `packages/data-sanitization/src/index.ts`: updated (new exports)
- `packages/data-sanitization/test/matchers.test.ts`: updated (cookieMatcher + strict tests)
- `packages/data-sanitization/test/constants.test.ts`: new
- `README.md`: updated

## Verification

- All existing tests pass (no regressions)
- `cookieMatcher` tests pass with representative cookie strings
- Strict matching tests confirm substring exclusion and exact match
- `piiPatterns` and `phiPatterns` are exported and usable in `customPatterns`
- `defaultPatterns` still contains all former `DEFAULT_PATTERNS` entries
- `name` is not in `piiPatterns`; the word is too common as a substring
  (`filename`, `hostname`, `component_name`); `first_name` and `last_name`
  are the correct substitutes. This should be verified via code review.
- `social_insurance_number` is in `piiPatterns` but `sin` is not; the
  three-letter form matches too many unrelated fields.
- If Option A or B chosen for non-string values: all nine currently-failing
  tests pass with no regressions.

## Decisions

**`cookieMatcher` as its own matcher, not an extension of `formEncodedMatcher`:**

Cookie strings (`key=val; key=val`) and form-encoded strings (`key=val&key=val`)
are structurally the same format with different field separators. Making
`formEncodedMatcher` configurable with a `separator` option was considered but
rejected: it adds API complexity to a function that already has a clear scope,
and the distinct matcher names make logs and docs self-explaining.

**`defaultPatterns` does not include `piiPatterns` or `phiPatterns`:**

Credentials are an almost-universal concern across any application that logs.
PII and PHI are domain-specific. A metrics service or internal microservice
should not have field names like `city`, `state`, or `diagnosis` masked by
default. Users building healthcare or consumer-facing applications can opt in
with `customPatterns: [...defaultPatterns, ...piiPatterns, ...phiPatterns]`.

**`{ match, strict }` uses `strict` not `exact` or `whole`:**

`strict` mirrors the mental model of other tools (ESLint `strict` mode,
TypeScript `strict` flag) where the word means "less permissive". `exact`
would also be clear but reads oddly as `{ match: 'address', exact: true }`.
`whole` implies whole-word boundaries, which has a specific technical meaning
different from what we're doing (we're matching the entire field name, not
a word boundary within it).

**`name` excluded from `piiPatterns`:**

`[\w-]*name[\w-]*` as a pattern would match `filename`, `hostname`,
`service_name`, `component_name`, `display_name` and many others that are
not PII. The specific forms `first_name` and `last_name` cover the common
PII cases without the blast radius. Users with schemas that use bare `name`
for a person's name can add `{ match: 'name', strict: true }` themselves.

**`social_insurance_number` not `sin`:**

`sin` as a three-letter pattern (even strict) is too likely to collide with
unrelated fields in general-purpose schemas. The full form
`social_insurance_number` is specific enough to be safe. The Canadian
context is a real use case but `sin` is not a suitable default.
