# 013 — Yarn Workspace Monorepo Migration

> **For agentic workers:** Use `superpowers:using-git-worktrees` to create an
> isolated worktree before starting, then `superpowers:executing-plans` to
> execute tasks with checkpoints.
>
> **Note:** The Changesets tasks in this plan were superseded during
> implementation. The final release workflow uses a custom interactive script
> (`scripts/release.mjs`) instead of Changesets. See `docs/development.md` for
> the actual release process.

## Approach

Migrate the single-package repo into a Yarn workspace monorepo so that the
upcoming `data-sanitization-log-providers` companion package (#309) can live
alongside the core. The existing `data-sanitization` package moves to
`packages/data-sanitization/` with no API or publishing changes. The custom
`scripts/release.mjs` release workflow is replaced by
[Changesets](https://github.com/changesets/changesets), which handles
independent per-package versioning and publishing. Conventional commit
enforcement (commitlint + husky) remains unchanged. All tooling — TypeScript,
vitest, oxlint, oxfmt, markdownlint — continues to run from the repo root.

Closes #308.

## Pre-implementation

- Create a feature branch: `git checkout -b feat/monorepo-migration`
- Confirm npm publish access: `npm whoami` (must be logged in as `ioncache`)

## Steps

### Phase 1 — Move package source into `packages/`

1. Create the package directory and move source trees using `git mv` to
   preserve history:

   ```bash
   mkdir -p packages/data-sanitization/docs
   mkdir -p packages/data-sanitization/scripts
   git mv src packages/data-sanitization/src
   git mv test packages/data-sanitization/test
   git mv bench packages/data-sanitization/bench
   git mv vitest.config.ts packages/data-sanitization/vitest.config.ts
   git mv tsconfig.build.json packages/data-sanitization/tsconfig.build.json
   git mv LICENSE packages/data-sanitization/LICENSE
   git mv docs/performance.md packages/data-sanitization/docs/performance.md
   git mv scripts/coverage-file-report.mjs packages/data-sanitization/scripts/coverage-file-report.mjs
   git mv scripts/coverage-line-report.mjs packages/data-sanitization/scripts/coverage-line-report.mjs
   git mv scripts/coverage-report.mjs packages/data-sanitization/scripts/coverage-report.mjs
   git mv scripts/update-coverage-gist.mjs packages/data-sanitization/scripts/update-coverage-gist.mjs
   ```

   Note: `tsconfig.json` is NOT moved — it becomes the shared base config.
   `README.md` is NOT moved — it stays at root (GitHub landing page). A symlink
   is created at `packages/data-sanitization/README.md → ../../README.md` so
   GitHub renders it in the package folder and npm includes it on publish.
   `scripts/release.mjs` is NOT moved — it will be deleted in Phase 3.
   `scripts/shell_lint.sh` stays at root (referenced by `lint-staged.config.mjs`).

2. Create `packages/data-sanitization/package.json`:

   ```json
   {
     "name": "data-sanitization",
     "version": "1.4.1",
     "description": "Sanitization library for masking or removing sensitive data.",
     "keywords": [
       "data-sanitization",
       "logging",
       "mask",
       "masking",
       "phi",
       "pii",
       "redact",
       "redaction",
       "sanitization",
       "sanitize",
       "secrets",
       "sensitive-data",
       "typescript"
     ],
     "homepage": "https://github.com/ioncache/data-sanitization#readme",
     "bugs": {
       "url": "https://github.com/ioncache/data-sanitization/issues"
     },
     "license": "MIT",
     "author": "Mark Jubenville <ioncache@gmail.com>",
     "repository": {
       "type": "git",
       "url": "https://github.com/ioncache/data-sanitization.git"
     },
     "files": ["dist", "docs/performance.md", "README.md", "LICENSE"],
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "default": "./dist/index.js"
       }
     },
     "scripts": {
       "bench": "vitest bench",
       "build": "yarn clean && tsc -p tsconfig.build.json",
       "clean": "rm -rf dist coverage && find . -maxdepth 1 -name '*.tsbuildinfo' -delete",
       "prepack": "yarn build",
       "test": "vitest run",
       "test:coverage": "vitest run --coverage",
       "test:watch": "vitest"
     },
     "engines": {
       "node": ">=22.22.1"
     }
   }
   ```

3. Create `packages/data-sanitization/tsconfig.json` (extends the root base):

   ```json
   {
     "extends": "../../tsconfig.json",
     "include": ["./src/**/*", "./test/**/*"],
     "compilerOptions": {
       "incremental": true,
       "noEmit": true,
       "outDir": "./dist",
       "types": ["node"]
     }
   }
   ```

4. Update `packages/data-sanitization/tsconfig.build.json` to extend the
   package tsconfig instead of the old root one:

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["./src/**/*"],
     "exclude": ["./test/**/*", "./dist/**/*"],
     "compilerOptions": {
       "incremental": false,
       "noEmit": false,
       "outDir": "./dist",
       "rootDir": "./src",
       "types": ["node"]
     }
   }
   ```

5. Update `packages/data-sanitization/vitest.config.ts` — the `resolve.alias`
   path no longer refers to the repo root, it refers to the package root
   (which is the same relative structure, so no change needed). Verify it
   still reads:

   ```ts
   alias: {
     '~': resolve(import.meta.dirname, 'src'),
   },
   ```

   No change required if `import.meta.dirname` resolves to the package dir.

### Phase 2 — Restructure root `package.json` and `tsconfig.json`

6. Replace the root `tsconfig.json` with a base config that packages extend.
   Remove `include` (packages set their own), `noEmit`, `outDir`, and
   `incremental` — those are package-specific:

   ```json
   {
     "extends": "@tsconfig/node22/tsconfig.json",
     "compilerOptions": {
       "allowJs": false,
       "allowSyntheticDefaultImports": true,
       "declaration": true,
       "declarationMap": false,
       "noImplicitAny": true,
       "removeComments": false,
       "resolveJsonModule": true,
       "sourceMap": true,
       "strictNullChecks": true
     }
   }
   ```

7. Replace the root `package.json` with a workspace root configuration.
   Key changes: add `"private": true` and `"workspaces"`, convert scripts to
   delegate to workspace packages, remove `conventional-changelog` deps
   (replaced by Changesets), add `@changesets/cli`. Keep all other devDeps
   at root so they are hoisted and available to all packages:

   ```json
   {
     "private": true,
     "workspaces": ["packages/*"],
     "scripts": {
       "bench": "yarn workspace data-sanitization bench",
       "build": "yarn workspaces foreach -A run build",
       "changeset": "changeset",
       "changeset:publish": "changeset publish",
       "changeset:version": "changeset version",
       "clean": "yarn workspaces foreach -A run clean",
       "format": "oxfmt",
       "format:check": "oxfmt --check",
       "lint": "yarn lint:code && yarn lint:actions && yarn lint:yaml && yarn lint:md",
       "lint:actions": "github-actionlint",
       "lint:ci": "yarn lint:code --format=github && yarn lint:actions && yarn lint:yaml && yarn lint:md",
       "lint:code": "oxlint",
       "lint:fix": "oxlint --fix",
       "lint:md": "markdownlint-cli2 \"**/*.md\" \"!.yarn/**\" \"!node_modules/**\" \"!CLAUDE.md\" \"!docs/plans/**\" \"!docs/superpowers/**\" \"!.ai/**\" \"!.remember/**\" \"!.agents/**\" \"!.claude/**\" \"!.github/instructions/**\" \"!.github/skills/**\" \"!.github/prompts/**\"",
       "lint:yaml": "yamllint \".github/**/*.yml\" \".github/**/*.yaml\" \".yarnrc.yml\"",
       "prepare": "husky || true",
       "test": "yarn workspaces foreach -A run test",
       "test:coverage": "yarn workspace data-sanitization test:coverage",
       "test:watch": "yarn workspace data-sanitization test:watch"
     },
     "devDependencies": {
       "@changesets/cli": "^3.1.2",
       "@commitlint/cli": "^21.0.1",
       "@commitlint/config-conventional": "^21.0.0",
       "@tsconfig/node22": "^22.0.5",
       "@types/node": "^25.9.0",
       "@vitest/coverage-v8": "^4.1.6",
       "github-actionlint": "^1.7.12",
       "husky": "^9.1.7",
       "lint-staged": "^17.0.5",
       "markdownlint-cli2": "^0.22.1",
       "oxfmt": "^0.51.0",
       "oxlint": "^1.66.0",
       "query-string": "^9.3.1",
       "ts-node": "^10.9.2",
       "typescript": "^6.0.3",
       "vitest": "^4.1.6",
       "yaml-lint": "^1.7.0",
       "yargs": "^18.0.0"
     },
     "engines": {
       "node": ">=22.22.1"
     },
     "volta": {
       "node": "22.22.3",
       "yarn": "4.15.0"
     },
     "packageManager": "yarn@4.15.0"
   }
   ```

   Note: `conventional-changelog`, `conventional-changelog-conventionalcommits`,
   and `conventional-commits-filter` are intentionally removed — they were only
   used by `scripts/release.mjs` which is being replaced by Changesets.

### Phase 3 — Set up Changesets

8. Install `@changesets/cli` (already declared in devDeps in step 7):

   ```bash
   yarn install
   ```

9. Initialize Changesets. Rather than running `yarn changeset init` (which
   is interactive), create `.changeset/config.json` directly:

   ```json
   {
     "$schema": "https://unpkg.com/@changesets/config/schema.json",
     "changelog": "@changesets/cli/changelog",
     "commit": false,
     "fixed": [],
     "linked": [],
     "access": "public",
     "baseBranch": "main",
     "updateInternalDependencies": "patch",
     "ignore": []
   }
   ```

   Also create `.changeset/README.md` (Changesets adds this by default to
   explain the directory to contributors):

   ```markdown
   # Changesets

   Hello and welcome! This folder has been automatically generated by
   `@changesets/cli`, a build tool that works with multi-package repos, or
   single-package repos to help you version and publish your code. You can
   find the full documentation for it
   [in our repository](https://github.com/changesets/changesets)

   We have a quick list of common questions to get you started engaging with
   this project in
   [our documentation](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)
   ```

10. Delete the old release script — Changesets replaces it entirely:

    ```bash
    git rm scripts/release.mjs
    ```

### Phase 4 — Update tooling configs

11. Update `.oxlintrc.json` — change `dist/**` and `coverage/**` ignore
    patterns to `**/dist/**` and `**/coverage/**` so nested package build
    and coverage output is also excluded:

    In the `"ignorePatterns"` array, replace:

    ```json
    "dist/**",
    "coverage/**",
    ```

    with:

    ```json
    "**/dist/**",
    "**/coverage/**",
    ```

12. Create a minimal root `README.md` (the package README has moved to
    `packages/data-sanitization/README.md`):

    ```markdown
    # data-sanitization

    Monorepo for the `data-sanitization` npm package ecosystem.

    ## Packages

    - [`data-sanitization`](packages/data-sanitization) — core sanitization library
      ([npm](https://www.npmjs.com/package/data-sanitization))

    ## Contributing

    See [CONTRIBUTING.md](CONTRIBUTING.md).
    ```

13. Update `CLAUDE.md` — the Architecture section references `src/` paths and
    `test/`. Update every path to include `packages/data-sanitization/`:
    - `src/matchers.ts` → `packages/data-sanitization/src/matchers.ts`
    - `src/replacers.ts` → `packages/data-sanitization/src/replacers.ts`
    - `src/constants.ts` → `packages/data-sanitization/src/constants.ts`
    - `src/types.ts` → `packages/data-sanitization/src/types.ts`
    - `src/errors.ts` → `packages/data-sanitization/src/errors.ts`
    - `src/index.ts` → `packages/data-sanitization/src/index.ts`

    Also update the single-test-file example:

    ```
    yarn vitest run test/matchers.test.ts
    ```

    → either run from within the package directory, or from root:

    ```
    yarn workspace data-sanitization vitest run test/matchers.test.ts
    ```

14. Update `docs/development.md` — review for any paths or commands that
    reference root-level `src/`, `test/`, or `scripts/release.mjs` and
    update accordingly. Check the release workflow section in particular;
    replace the `yarn release` documentation with the Changesets workflow:

    ```
    # Adding a changeset (during a PR)
    yarn changeset

    # Releasing (after PRs are merged)
    yarn changeset:version   # bumps versions, updates changelogs
    yarn changeset:publish   # publishes to npm, creates git tags
    ```

### Phase 5 — Update GitHub Actions

15. Update `.github/workflows/ci.yml`. Three things change:

    a. The vitest coverage report action needs to know where coverage files
    now live (`packages/data-sanitization/coverage/`):

    ```yaml
    - name: Report coverage
      if: matrix.node-version == 24
      uses: davelosert/vitest-coverage-report-action@02f3c2e641286b7fa308cd3e430783103ce6103b # v2
      with:
        json-summary-coverage-filepath: packages/data-sanitization/coverage/coverage-summary.json
        json-final-coverage-filepath: packages/data-sanitization/coverage/coverage-final.json
    ```

    b. The coverage percentage extraction step needs the updated path:

    ```yaml
    - name: Extract coverage percentage
      id: coverage
      if: matrix.node-version == 24 && github.event_name == 'push'
      run: echo "percentage=$(jq '.total.lines.pct' packages/data-sanitization/coverage/coverage-summary.json)" >> "$GITHUB_OUTPUT"
    ```

    c. The coverage gist update script now lives in the package and must
    run via `yarn workspace`:

    ```yaml
    - name: Update coverage report in Gist
      if: matrix.node-version == 24 && github.event_name == 'push'
      env:
        COVERAGE_GIST_ID: ${{ vars.COVERAGE_GIST_ID }}
        GIST_SECRET: ${{ secrets.GIST_SECRET }}
      run: yarn workspace data-sanitization node scripts/update-coverage-gist.mjs
    ```

    All other steps (`yarn install`, `yarn format:check`, `yarn lint:ci`,
    `yarn test:coverage`) continue to work unchanged from the root since
    the root package.json delegates these to the workspace package.

### Phase 6 — Validate

16. Run `yarn install` from repo root. Confirm it completes without errors
    and that `packages/data-sanitization` is recognized as a workspace
    package:

    ```bash
    yarn install
    yarn workspaces list
    ```

    Expected output from `yarn workspaces list`:

    ```
    ➤ YN0000: .
    ➤ YN0000: packages/data-sanitization
    ➤ YN0000: Done
    ```

17. Run the build:

    ```bash
    yarn build
    ```

    Expected: `packages/data-sanitization/dist/` is created with `.js` and
    `.d.ts` files.

18. Run tests:

    ```bash
    yarn test
    ```

    Expected: all tests pass (same suite as before).

19. Run tests with coverage:

    ```bash
    yarn test:coverage
    ```

    Expected: passes with 100% coverage thresholds. Coverage output is at
    `packages/data-sanitization/coverage/`.

20. Run linting and formatting:

    ```bash
    yarn lint
    yarn format:check
    ```

    Expected: no errors.

21. Verify a changeset can be created (smoke test):

    ```bash
    yarn changeset --empty
    ```

    Expected: creates a `.changeset/<random-name>.md` file with
    `bump: none`. Delete it after confirming it works:

    ```bash
    git checkout .changeset
    ```

### Phase 7 — Commit

22. Stage and commit all changes as one commit (this is a structural
    migration with no behaviour change — a single commit is appropriate):

    ```bash
    git add -A
    git commit -m "chore: migrate to Yarn workspace monorepo with Changesets (#308)

    - Move data-sanitization package to packages/data-sanitization/
    - Restructure root package.json as private workspace root
    - Promote tsconfig.json to shared base; packages extend it
    - Replace scripts/release.mjs with @changesets/cli
    - Update GitHub Actions coverage paths for workspace layout
    - Update oxlint ignorePatterns to cover nested dist/ and coverage/"
    ```

23. Push and open a PR targeting `main`:

    ```bash
    git push -u origin feat/monorepo-migration
    gh pr create --title "chore: migrate to Yarn workspace monorepo with Changesets (#308)" \
      --body "Closes #308. Structural migration only — no API or publish changes."
    ```

## Relevant Files

**Moved (git mv — history preserved):**

- `src/` → `packages/data-sanitization/src/`
- `test/` → `packages/data-sanitization/test/`
- `bench/` → `packages/data-sanitization/bench/`
- `vitest.config.ts` → `packages/data-sanitization/vitest.config.ts`
- `tsconfig.build.json` → `packages/data-sanitization/tsconfig.build.json`
- `README.md` → `packages/data-sanitization/README.md`
- `LICENSE` → `packages/data-sanitization/LICENSE`
- `docs/performance.md` → `packages/data-sanitization/docs/performance.md`
- `scripts/coverage-*.mjs` → `packages/data-sanitization/scripts/coverage-*.mjs`
- `scripts/update-coverage-gist.mjs` → `packages/data-sanitization/scripts/update-coverage-gist.mjs`

**New:**

- `packages/data-sanitization/package.json`
- `packages/data-sanitization/tsconfig.json`
- `.changeset/config.json`
- `.changeset/README.md`
- `README.md` (root — new minimal monorepo overview)

**Updated:**

- `tsconfig.json` (root — stripped to base config)
- `package.json` (root — workspace root, Changesets scripts, removed conventional-changelog deps)
- `.oxlintrc.json` (ignore patterns updated to `**/dist/**`, `**/coverage/**`)
- `.github/workflows/ci.yml` (coverage file paths, gist script invocation)
- `CLAUDE.md` (path references updated)
- `docs/development.md` (release workflow section updated)

**Deleted:**

- `scripts/release.mjs`

## Verification

- `yarn workspaces list` shows both root and `packages/data-sanitization`
- `yarn build` compiles `packages/data-sanitization/dist/` successfully
- `yarn test` passes all tests with 100% coverage
- `yarn lint` and `yarn format:check` pass with no errors
- `yarn changeset --empty` creates a changeset file without error

## Decisions

**Stay on Yarn 4, not pnpm.** The repo is already on Yarn 4 with PnP. The
industry also recommends pnpm for new monorepos, but migrating package
managers mid-project adds risk and no benefit here.

**All devDeps stay at root.** With Yarn workspace hoisting, devDeps at root
are available to all packages. Moving tooling deps into each package's
`devDependencies` adds duplication for no gain. Published packages have zero
deps regardless.

**Single commit for the migration.** Moving files, restructuring configs, and
swapping the release tool are all part of one atomic structural change. A
single commit with a clear message is easier to understand and revert than
a sequence of partial states.

**`scripts/release.mjs` is deleted, not archived.** Changesets fully replaces
it. Keeping it would create confusion about which release process to use.
The git history preserves the old implementation if it's ever needed.

**`shell_lint.sh` stays at root.** It's referenced directly by path in
`lint-staged.config.mjs` as `'*.sh': './scripts/shell_lint.sh'`. It's not
package-specific tooling — it lints shell scripts anywhere in the repo.
