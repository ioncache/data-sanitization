# Adversarial String Edge Case Tests

## Approach

Add tests that directly probe known and suspected edge cases in the regex-based
string sanitization path. Some tests confirm the library handles tricky inputs
correctly; others deliberately assert the documented limitation that the regex
path cannot reliably mask all sensitive values (numeric fields, escaped-quote
edge cases, etc.). Together they harden the test suite and make the "best
effort" contract explicit and stable in code — regressions in either direction
(unexpected masking or unexpected non-masking) will surface immediately.

## Steps

1. `docs/plans/016-adversarial-string-tests.md` — add this plan.

2. `packages/data-sanitization/test/replacers.test.ts` — add a new `describe`
   block for adversarial raw string inputs under the `stringReplacer` suite.
   Cover:
   - **Escaped quotes inside JSON string values** — e.g.
     `"password":"sec\\\"ret"`. Assert that the value is masked or, if the
     regex path cannot handle it, assert the current behavior explicitly so any
     future regression is caught.
   - **Numeric values without `parseJsonStrings`** — e.g.
     `{"password":12345}`. Assert the value is _not_ masked (confirmed known
     limitation on the regex path) and add a companion test with
     `parseJsonStrings: true` that asserts it _is_ masked.
   - **Boolean and null values** — e.g. `{"password":true}`,
     `{"password":null}`. Assert current behavior on both paths.
   - **Arrays as sensitive values** — e.g. `{"token":["a","b"]}`. Assert
     current behavior.
   - **Deeply nested JSON strings** — a JSON string whose value is itself a
     JSON string (double-encoded). Assert both the outer and inner paths.
   - **Multiline string values** — a sensitive field value that spans multiple
     lines inside a JSON string. Assert current behavior.
   - **Very long string values** — a sensitive field whose value is 10 KB of
     random text. Assert masking still applies and does not time out or corrupt
     surrounding content.
   - **Malformed JSON fragments** — e.g. `{"password":` (truncated),
     `password":"secret"` (no opening brace). Assert the regex path does or
     does not mask and that no exception is thrown.

3. `packages/data-sanitization/test/matchers.test.ts` — add tests that pass
   the adversarial strings directly through each individual matcher
   (`jsonMatcher`, `escapedJsonMatcher`, `formEncodedMatcher`) so failures can
   be isolated to specific matchers rather than the full pipeline.

## Relevant Files

- `docs/plans/016-adversarial-string-tests.md` — new, this plan.
- `packages/data-sanitization/test/replacers.test.ts` — updated with
  adversarial string suite.
- `packages/data-sanitization/test/matchers.test.ts` — updated with per-matcher
  adversarial cases.

## Verification

1. Run `yarn workspace data-sanitization test` — all tests pass.
2. Run `yarn workspace data-sanitization test:coverage` — coverage remains at
   100% or all uncovered lines have an existing `/* istanbul ignore next */`
   comment with justification.
3. Manually review each new test to confirm it tests exactly what the comment
   says and uses the correct `it('should ...')` title.

## Decisions

**Assert current behavior for known limitations, not desired behavior** — tests
for the numeric/boolean/null cases on the regex path should assert that masking
does _not_ occur, matching the documented "best effort" contract. This makes the
tests honest and catches future regressions in both directions.

**`parseJsonStrings` companion tests** — for each regex-path limitation, a
companion test with `parseJsonStrings: true` confirms the parser-first path
handles the case correctly. This reinforces the option's purpose without
changing the default behavior.

**Per-matcher tests in `matchers.test.ts`** — isolating adversarial inputs to
individual matchers makes failures easier to diagnose than pipeline-level tests
alone.

**No new source code changes** — this plan is test-only. If a test reveals an
actual bug (behavior that does not match the documented contract), that fix
warrants its own plan.
