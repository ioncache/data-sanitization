# Sanitization Error Details

## Approach

Update `sanitizeData` so wrapped sanitization failures expose only safe
diagnostic metadata instead of retaining caller payloads. Keep the public
`DataSanitizationError` shape intact while replacing raw `originalData` entries
with input type and wrapped error metadata that callers can log without leaking
sensitive values.

## Pre-implementation

Create issue branch `fix/279/sanitization_error_details` for GitHub issue #279.

## Steps

1. Update `src/index.ts` to build safe error details for invalid input and
   wrapped failures.
2. Update `test/index-errors.test.ts` with regression coverage for malformed
   sanitized JSON and sensitive payload values.
3. Update `README.md` so the error handling example logs safe fields instead of
   raw details.

## Relevant Files

- `docs/plans/003-sanitization-error-details.md` - new plan for issue #279.
- `src/index.ts` - updated sanitizer error details.
- `test/index-errors.test.ts` - updated regression coverage for safe error
  details.
- `README.md` - updated error handling guidance.

## Verification

Run the full test suite, linting, and formatting checks through package scripts.

## Decisions

- Preserve `DataSanitizationError.details` as a structured object so existing
  callers keep a stable error shape.
- Use safe metadata instead of sanitized payload summaries because parse failures
  happen when the sanitized payload may be malformed, and summaries can still
  reveal application data shape or user content.
- Include the wrapped error name for debugging while excluding raw input, error
  objects, messages, and stack traces from public details.
