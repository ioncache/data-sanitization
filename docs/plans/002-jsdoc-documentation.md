# JSDoc Documentation

## Approach

Bring existing JavaScript and TypeScript functions into alignment with the repository JSDoc standards without changing runtime behavior. The cleanup focuses on documenting current public and internal function contracts, including return values, examples, and thrown error conditions where applicable.

## Steps

1. `docs/plans/002-jsdoc-documentation.md` - add this plan for the documentation cleanup.

2. `src/errors.ts` - document `DataSanitizationError` and its constructor parameters.

3. `src/matchers.ts` - complete JSDoc for matcher helpers and exported matcher functions.

4. `src/types.ts` - complete JSDoc for function type aliases.

5. `src/replacers.ts` - complete JSDoc for `stringReplacer` parameters, return behavior, and examples.

6. `src/index.ts` - complete JSDoc for `sanitizeData`, including return and throw conditions.

7. `scripts/update-coverage-gist.mjs` - adjust existing JSDoc to match repository style where needed.

## Relevant Files

- `docs/plans/002-jsdoc-documentation.md` - new, documents the cleanup plan.
- `src/errors.ts` - updated, custom error JSDoc.
- `src/matchers.ts` - updated, matcher function JSDoc.
- `src/types.ts` - updated, function type alias JSDoc.
- `src/replacers.ts` - updated, replacer function JSDoc.
- `src/index.ts` - updated, public API JSDoc.
- `scripts/update-coverage-gist.mjs` - updated, script helper JSDoc.

## Verification

- Run `yarn lint`.
- Run `yarn build`.
- Run `yarn test:coverage`.
- Run `yarn format:check`.

## Decisions

**Documentation-only branch** - this branch intentionally avoids behavior changes so the sanitizer fixes can remain scoped to their separate `type: fix` issues.

**No GitHub issue for the cleanup** - the work is repository hygiene rather than a user-visible bug fix, so the branch name and plan provide enough traceability.

**Keep implementation comments minimal** - the cleanup uses JSDoc for function contracts and avoids adding inline comments unless they explain a current non-obvious decision.
