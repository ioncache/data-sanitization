# Performance Benchmarks

## Approach

Add a `vitest bench` benchmark suite covering the four workload types called out
in the roadmap: shallow objects, deeply nested objects, large arrays, and long
strings with many pattern hits. Benchmarks run against the public `sanitizeData`
API so they measure the full call path. Add a `bench` script to `package.json`
and a performance section to the README documenting intended use cases and scale
limits.

No behavior changes. This is purely additive infrastructure.

## Pre-implementation

Create branch `perf/benchmarks` from `main`.

## Steps

1. `docs/plans/010-performance-benchmarks.md`: add this plan.
2. `vitest.config.ts`: add a `benchmark` section that includes
   `bench/**/*.bench.ts` so vitest bench picks up the suite explicitly.
3. `package.json`: add `"bench": "vitest bench"` to the `scripts` block.
4. `bench/sanitize-data.bench.ts`: create the benchmark file with cases for:
   - shallow object (few fields, one sensitive key)
   - deeply nested object (sensitive key at each of 5 levels)
   - large array (1 000 objects each with one sensitive field)
   - long string (JSON string with 50 repeated sensitive key/value pairs)
     Run `yarn bench` to confirm all four benchmarks execute and print results.
5. `README.md`: add a `## Performance` section after `## How it works` that
   documents intended workloads, scale limits, and how to run the suite. Include
   a note that the string-value scanning and parser-first JSON items should add
   their own benchmark cases when implemented.
6. `docs/ROADMAP.md`: check off all Performance Benchmarks items and add the
   completed PR reference.

## Relevant Files

- `docs/plans/010-performance-benchmarks.md`: new plan.
- `vitest.config.ts`: add `benchmark` include config.
- `package.json`: add `bench` script.
- `bench/sanitize-data.bench.ts`: new benchmark suite.
- `README.md`: new Performance section.
- `docs/ROADMAP.md`: check off completed items.

## Verification

1. Run `yarn bench`: all four benchmark groups run without errors and print
   throughput numbers.
2. Run `yarn test`: existing tests unaffected.
3. Run `yarn lint`.
4. Run `yarn format:check`.
5. Run `yarn build`.

## Decisions

**Public API only:** benchmarks call `sanitizeData`, not `stringReplacer` or
`objectReplacer` directly. The public API is the contract users depend on; its
performance is what matters.

**Four fixed workloads, not parameterized:** shallow, deep, large-array, and
long-string cover the practical cases without creating a combinatorial suite
that is hard to read or maintain.

**No assertion thresholds:** benchmark numbers vary too much across machines to
assert a minimum ops/sec in CI. The suite is for local profiling and for
comparing before/after on changes like string-value scanning.

**`bench/` at project root:** keeps benchmark files separate from `test/` and
`src/`, parallel to the established layout. Excluded from the coverage and test
runs by the existing `test.include` pattern.
