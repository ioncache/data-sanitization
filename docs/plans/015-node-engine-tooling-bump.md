# Node Engine and Tooling Bump

## Approach

Lower the published `engines.node` requirement from `>=22.22.1` to `>=20` to
reduce the adoption barrier for consumers running Node 20 LTS. At the same
time, upgrade the Volta-pinned development toolchain to Node 24 and update the
TypeScript base config to match. Add Node 20 to the CI test matrix so the
minimum supported version is actually exercised in CI.

The two concerns are independent: `engines` governs what consumers need at
runtime; `volta` and `@tsconfig/node2x` govern what contributors use locally.
Lowering one and raising the other simultaneously is the right move — the
library has zero runtime dependencies and uses no Node-specific platform APIs,
so it runs correctly on Node 20 regardless of what Node version is used to
build it.

## Steps

1. `docs/plans/015-node-engine-tooling-bump.md` — add this plan.

2. `package.json` (root) — change `engines.node` to `>=20`; change
   `volta.node` to the current Node 24 stable patch version.

3. `packages/data-sanitization/package.json` — same `engines` and `volta`
   changes as root.

4. `packages/data-sanitization-log-providers/package.json` — same `engines`
   and `volta` changes as root.

5. `package.json` (root) — update `@tsconfig/node22` devDependency to
   `@tsconfig/node24`; update `tsconfig.json` `extends` field to
   `@tsconfig/node24/tsconfig.json`.

6. `.github/workflows/ci-data-sanitization.yml` — add `20` to the
   `node-version` matrix: `[20, 22, 24]`.

7. `.github/workflows/ci-data-sanitization-log-providers.yml` — same matrix
   addition.

8. `.github/workflows/ci-root.yml` — change hardcoded `node-version: 22` to
   `node-version: 24` (format/lint only; no matrix needed).

## Relevant Files

- `docs/plans/015-node-engine-tooling-bump.md` — new, this plan.
- `package.json` — updated `engines.node`, `volta.node`, `@tsconfig/node22`
  devDependency.
- `tsconfig.json` — updated `extends` to `@tsconfig/node24`.
- `packages/data-sanitization/package.json` — updated `engines.node`,
  `volta.node`.
- `packages/data-sanitization-log-providers/package.json` — updated
  `engines.node`, `volta.node`.
- `.github/workflows/ci-data-sanitization.yml` — updated matrix.
- `.github/workflows/ci-data-sanitization-log-providers.yml` — updated matrix.
- `.github/workflows/ci-root.yml` — updated hardcoded node version.

## Verification

1. Run `yarn format:check` and `yarn lint:ci`.
2. Run `yarn build:all`.
3. Run `yarn test:coverage:all`.
4. Confirm the CI workflows parse correctly with `yarn lint:actions`.
5. After the PR merges, confirm CI runs green on Node 20, 22, and 24 in both
   package workflows.

## Decisions

**`engines.node: ">=20"` not `">=20.11.0"`** — Node 20.11.0 is the first
Node 20 LTS release with full stability, but since the library uses no
platform-specific APIs, `>=20` is sufficient and matches the simpler version
range consumers expect to see.

**Volta at Node 24, not Node 22** — Node 24 is the current active release.
Pinning it for local dev keeps contributors on a consistent modern toolchain
without forcing consumers onto it.

**`@tsconfig/node24` for dev** — The tsconfig base config is purely a dev
tooling choice; it is not shipped with the published package. Keeping it
aligned with the Volta-pinned Node version makes compiler target and local
runtime consistent for contributors. If `@tsconfig/node24` is not yet
published, fall back to `@tsconfig/node22` and manually set
`"target": "ES2024"` and `"lib": ["es2024"]` in `tsconfig.json`.

**CI root workflow stays single-node** — `ci-root.yml` only runs format and
lint checks against root-level files. These do not test runtime compatibility,
so a matrix adds cost without value. It is updated to Node 24 to match the
Volta pin.

**Coverage and badge steps remain gated on `node-version == 24`** — adding
Node 20 to the matrix does not require changes to the coverage reporting steps;
they correctly run only on the highest version.
