# Map and Set Sanitization

## Approach

Add opt-in sanitization support for `Map` and `Set` instances via a new
`sanitizeCollections` option (default `false`). When enabled, `objectReplacer`
traverses each collection and returns a new sanitized copy rather than passing
the original through unchanged. For `Map`, string keys are matched against the
active field-name patterns and their values are masked or removed accordingly;
object keys are recursed into and sanitized like any other nested object. String
keys themselves are not sanitized, matching the existing behaviour for plain
object property names. For `Set`, each value is recursed into and sanitized.
Defaulting to `false` preserves the current pass-through behaviour for all
non-plain object instances.

## Steps

1. Add `sanitizeCollections?: boolean` to `DataSanitizationReplacerOptions` in
   `src/types.ts`, between `removeMatches` and `scanStringValues`.

2. Destructure `sanitizeCollections = false` in `objectReplacer` in
   `src/replacers.ts` and add a `Map` branch in `sanitizeValue` between the
   array check and the non-plain-object pass-through. The branch builds a new
   `Map` from sanitized entries: string keys are tested against `keyMatchers` to
   decide masking; object keys are sanitized recursively via `sanitizeValue`.

3. Add a `Set` branch in `sanitizeValue` in `src/replacers.ts`, immediately
   after the `Map` branch. The branch iterates each item through `sanitizeValue`
   and returns a new `Set`.

4. Add `describe('Map sanitization')` and `describe('Set sanitization')` blocks
   inside the `objectReplacer` describe block in `test/replacers.test.ts`.
   Cover: pass-through when option is off, new instance returned, string-key
   masking, numeric masking, `removeMatches`, embedded-pattern scanning, nested
   object value recursion, object key recursion, nested `Map`-in-`Map`, and
   `Map`-in-`Set`.

5. Add `sanitizeCollections` to the options table in `README.md`, add a
   dedicated "Sanitize Maps and Sets" usage subsection with a serialization tip,
   and update the "How it works" section to document the key-sanitization
   limitation (string keys and object property names used for matching only, not
   sanitized themselves; Map object keys are recursed into).

6. Add Map and Set benchmark cases to `bench/sanitize-data.bench.ts`.

7. Update the Map and Set rows in `docs/ROADMAP.md` to reflect implemented
   status.

## Relevant Files

- `src/types.ts` — updated; adds `sanitizeCollections` option
- `src/replacers.ts` — updated; adds Map and Set branches in `sanitizeValue`
- `test/replacers.test.ts` — updated; adds Map and Set sanitization tests
- `bench/sanitize-data.bench.ts` — updated; adds Map and Set benchmark cases
- `README.md` — updated; adds option to table, usage section, and How it works note
- `docs/ROADMAP.md` — updated; marks Map/Set as implemented

## Verification

Run `yarn test:coverage` and confirm 100% coverage is maintained and all tests
pass.

## Decisions

**Option B — new copy rather than in-place mutation:** Mutating the caller's
original `Map` or `Set` would be a surprising side-effect and could corrupt
data the caller still holds a reference to. Returning a new sanitized copy is
consistent with how `objectReplacer` already handles plain objects and arrays.

**`sanitizeCollections` defaults to `false`:** The current behaviour for
non-plain object instances is pass-through. Changing that default would be a
breaking change for callers whose Maps or Sets contain data that would be
altered. An opt-in flag lets callers adopt the feature without risk.

**String Map keys are used for matching but not sanitized:** Plain object
property names are never sanitized today — only their values are. Map string
keys follow the same rule for consistency. Keys that are objects, however, are
recursed into and sanitized because they carry real structured data that could
contain sensitive fields.

**WeakMap and WeakSet are not supported:** These types are not iterable by
design and cannot be traversed. They continue to pass through unchanged.
