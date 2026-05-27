# CI and Script Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicate `npm` script suffixes (`:code`, `:src`) from all workspaces by
renaming root orchestrators to `:all`, then split the single `ci.yml` into three per-package
workflows with path filters so CI only runs for changed workspaces.

**Architecture:** Root gets `<script>:all` orchestrators that call `foreach -A -v run <script>`.
Each workspace (root + both packages) has one canonical set of scripts with no duplicates. Three
GitHub Actions workflows replace the single `ci.yml`, each triggered only by changes to its own
workspace files plus shared dependencies.

**Tech Stack:** Yarn 4 workspaces, GitHub Actions, oxlint, oxfmt, markdownlint-cli2, yaml-lint, vitest

---

## Current state (read before touching anything)

### Root `package.json` scripts today

Orchestrators (call `foreach`):

- `build` → `foreach -A run build`
- `clean` → `foreach -A run clean`
- `format` → `foreach -A -v run format:src`
- `format:check` → `foreach -A -v run format:check:src`
- `lint` → `foreach -A -v run lint:code`
- `lint:ci` → `foreach -A -v run lint:ci:code`
- `lint:fix` → `foreach -A -v run lint:fix:code`
- `test` → `foreach -A run test`
- `test:coverage` → `foreach -A run test:coverage`

Root-scoped work scripts (call tools directly):

- `format:src` → `oxfmt . '!packages/**'`
- `format:check:src` → `oxfmt --check . '!packages/**'`
- `lint:code` → `oxlint -f default --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml`
- `lint:ci:code` → `oxlint -f github --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml`
- `lint:fix:code` → `oxlint --fix --ignore-pattern 'packages/**'`
- `lint:md` → markdownlint scoped to root (excludes packages/\*\*)
- `lint:yaml` → yamllint on root yaml files

### Each package `package.json` scripts today (data-sanitization and data-sanitization-log-providers)

Duplicates (same command, two names; one called by foreach, one was developer shortcut):

- `format` / `format:src` → both `oxfmt`
- `format:check` / `format:check:src` → both `oxfmt --check`
- `lint:ci` / `lint:ci:code` → both `oxlint -f github && yarn lint:md`
- `lint:fix` / `lint:fix:code` → both `oxlint --fix && yarn lint:md --fix`

Near-duplicates:

- `lint` → `oxlint && yarn lint:md` (no -f flag)
- `lint:code` → `oxlint -f default && yarn lint:md`

### `ci.yml` today

Single job, no path filtering. Runs on every push/PR to main regardless of what changed:

```text
yarn format:check   ← calls foreach across all workspaces
yarn lint:ci        ← calls foreach across all workspaces
yarn build          ← calls foreach across all workspaces
yarn test:coverage  ← calls foreach across all workspaces
```

Coverage reporting inline for both packages.

---

## Target state

### Root `package.json` scripts after

Orchestrators renamed to `:all`:

- `build:all`, `clean:all`, `format:all`, `format:check:all`
- `lint:all`, `lint:ci:all`, `lint:fix:all`
- `test:all`, `test:coverage:all`

Each `:all` orchestrator calls `foreach -A -v run <same-name-without-all>`.

Root-scoped work scripts (no suffix, call tools directly):

- `format` → `oxfmt . '!packages/**'`
- `format:check` → `oxfmt --check . '!packages/**'`
- `lint` → `oxlint -f default --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml`
- `lint:ci` → `oxlint -f github --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml`
- `lint:fix` → `oxlint --fix --ignore-pattern 'packages/**'`
- `lint:md`, `lint:yaml`, `lint:actions` → unchanged
- `prepare`, `release`, `bench`, `test:watch` → unchanged

Removed from root: `format:src`, `format:check:src`, `lint:code`, `lint:ci:code`, `lint:fix:code`

### Each package `package.json` scripts after

One script per action, no duplicates:

- `format` → `oxfmt`
- `format:check` → `oxfmt --check`
- `lint` → `oxlint -f default && yarn lint:md`
- `lint:ci` → `oxlint -f github && yarn lint:md`
- `lint:fix` → `oxlint --fix && yarn lint:md --fix`
- `lint:md` → markdownlint (unchanged)
- `build`, `clean`, `prepack`, `test`, `test:coverage`, `test:watch` → unchanged

Removed from each package: `format:src`, `format:check:src`, `lint:code`, `lint:ci:code`, `lint:fix:code`

### CI after

Three workflow files, each with path filters:

**`ci-root.yml`**: triggers when root files change (no build/test, root has no code):

```text
yarn format:check    ← root-scoped only
yarn lint:ci         ← root-scoped only
```

**`ci-data-sanitization.yml`**: triggers when data-sanitization or shared files change:

```text
yarn workspace data-sanitization format:check
yarn workspace data-sanitization lint:ci
yarn workspace data-sanitization build
yarn workspace data-sanitization test:coverage
+ coverage reporting steps
```

**`ci-data-sanitization-log-providers.yml`**: triggers when log-providers, data-sanitization
(peer dep), or shared files change:

```text
yarn workspace data-sanitization-log-providers format:check
yarn workspace data-sanitization-log-providers lint:ci
yarn workspace data-sanitization-log-providers build
yarn workspace data-sanitization-log-providers test:coverage
+ coverage reporting steps
```

---

## Files

| Action | File                                                       |
| ------ | ---------------------------------------------------------- |
| Modify | `package.json`                                             |
| Modify | `packages/data-sanitization/package.json`                  |
| Modify | `packages/data-sanitization-log-providers/package.json`    |
| Create | `.github/workflows/ci-root.yml`                            |
| Create | `.github/workflows/ci-data-sanitization.yml`               |
| Create | `.github/workflows/ci-data-sanitization-log-providers.yml` |
| Delete | `.github/workflows/ci.yml`                                 |

---

## Task 1: Update root `package.json` scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Replace root scripts**

  Open `package.json`. Replace the entire `"scripts"` block with:

  ```json
  "scripts": {
    "bench": "yarn workspace data-sanitization bench",
    "build:all": "yarn workspaces foreach -A run build",
    "clean:all": "yarn workspaces foreach -A run clean",
    "format": "oxfmt . '!packages/**'",
    "format:all": "yarn workspaces foreach -A -v run format",
    "format:check": "oxfmt --check . '!packages/**'",
    "format:check:all": "yarn workspaces foreach -A -v run format:check",
    "lint": "oxlint -f default --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml",
    "lint:actions": "github-actionlint",
    "lint:all": "yarn workspaces foreach -A -v run lint",
    "lint:ci": "oxlint -f github --ignore-pattern 'packages/**' && yarn lint:md && yarn lint:yaml",
    "lint:ci:all": "yarn workspaces foreach -A -v run lint:ci",
    "lint:fix": "oxlint --fix --ignore-pattern 'packages/**'",
    "lint:fix:all": "yarn workspaces foreach -A -v run lint:fix",
    "lint:md": "markdownlint-cli2 \"**/*.md\" \"!.yarn/**\" \"!node_modules/**\" \"!packages/**\" \"!CLAUDE.md\" \"!docs/plans/**\" \"!docs/superpowers/**\" \"!.ai/**\" \"!.remember/**\" \"!.agents/**\" \"!.claude/**\" \"!.github/instructions/**\" \"!.github/skills/**\" \"!.github/prompts/**\"",
    "lint:yaml": "yamllint \".github/**/*.yml\" \".github/**/*.yaml\" \".yarnrc.yml\"",
    "prepare": "husky || true",
    "release": "node scripts/release.mjs",
    "test:all": "yarn workspaces foreach -A run test",
    "test:coverage:all": "yarn workspaces foreach -A run test:coverage",
    "test:watch": "yarn workspace data-sanitization test:watch"
  }
  ```

- [ ] **Step 2: Verify root scripts work**

  Run each of these and confirm they pass (0 errors):

  ```shell
  yarn lint
  yarn lint:ci
  yarn format:check
  ```

  Then verify orchestrators still work:

  ```shell
  yarn lint:all
  yarn format:check:all
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add package.json
  git commit -m "refactor: rename root script orchestrators to :all suffix"
  ```

---

## Task 2: Update `packages/data-sanitization/package.json` scripts

**Files:**

- Modify: `packages/data-sanitization/package.json`

- [ ] **Step 1: Replace scripts block**

  Open `packages/data-sanitization/package.json`. Replace the entire `"scripts"` block with:

  ```json
  "scripts": {
    "bench": "vitest bench",
    "build": "yarn clean && tsc -p tsconfig.build.json",
    "clean": "rm -rf dist coverage && find . -maxdepth 1 -name '*.tsbuildinfo' -delete",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "lint": "oxlint -f default && yarn lint:md",
    "lint:ci": "oxlint -f github && yarn lint:md",
    "lint:fix": "oxlint --fix && yarn lint:md --fix",
    "lint:md": "markdownlint-cli2 --config ../../.markdownlint.json \"**/*.md\" \"!node_modules/**\" \"!dist/**\" \"!coverage/**\"",
    "prepack": "yarn build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
  ```

- [ ] **Step 2: Verify package scripts work**

  ```shell
  yarn workspace data-sanitization lint
  yarn workspace data-sanitization lint:ci
  yarn workspace data-sanitization format:check
  yarn workspace data-sanitization build
  yarn workspace data-sanitization test
  ```

  All should pass.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/data-sanitization/package.json
  git commit -m "refactor: remove duplicate script aliases from data-sanitization"
  ```

---

## Task 3: Update `packages/data-sanitization-log-providers/package.json` scripts

**Files:**

- Modify: `packages/data-sanitization-log-providers/package.json`

- [ ] **Step 1: Replace scripts block**

  Open `packages/data-sanitization-log-providers/package.json`. Replace the entire `"scripts"` block with:

  ```json
  "scripts": {
    "build": "yarn clean && tsc -p tsconfig.build.json",
    "clean": "rm -rf dist coverage && find . -maxdepth 1 -name '*.tsbuildinfo' -delete",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "lint": "oxlint -f default && yarn lint:md",
    "lint:ci": "oxlint -f github && yarn lint:md",
    "lint:fix": "oxlint --fix && yarn lint:md --fix",
    "lint:md": "markdownlint-cli2 --config ../../.markdownlint.json \"**/*.md\" \"!node_modules/**\" \"!dist/**\" \"!coverage/**\"",
    "prepack": "yarn build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
  ```

- [ ] **Step 2: Verify package scripts work**

  ```shell
  yarn workspace data-sanitization-log-providers lint
  yarn workspace data-sanitization-log-providers lint:ci
  yarn workspace data-sanitization-log-providers format:check
  yarn workspace data-sanitization-log-providers build
  yarn workspace data-sanitization-log-providers test
  ```

  All should pass.

- [ ] **Step 3: Run full lint:all and format:check:all from root to verify the whole picture**

  ```shell
  yarn lint:all
  yarn format:check:all
  ```

  Expected: labeled output per workspace, all pass.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/data-sanitization-log-providers/package.json
  git commit -m "refactor: remove duplicate script aliases from data-sanitization-log-providers"
  ```

---

## Task 4: Create `ci-root.yml`

**Files:**

- Create: `.github/workflows/ci-root.yml`

Root has no code to build or test. This workflow only checks format and lint for root-level files.

- [ ] **Step 1: Create the file**

  ```yaml
  name: CI (root)

  on:
    push:
      branches: [main]
      paths:
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.markdownlint.json'
        - '.markdownlintignore'
        - 'lint-staged.config.mjs'
        - '*.md'
        - 'docs/**'
        - '.github/**'
        - '!.github/workflows/ci-data-sanitization.yml'
        - '!.github/workflows/ci-data-sanitization-log-providers.yml'
    pull_request:
      branches: [main]
      paths:
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.markdownlint.json'
        - '.markdownlintignore'
        - 'lint-staged.config.mjs'
        - '*.md'
        - 'docs/**'
        - '.github/**'
        - '!.github/workflows/ci-data-sanitization.yml'
        - '!.github/workflows/ci-data-sanitization-log-providers.yml'

  jobs:
    ci-root:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        pull-requests: write
      steps:
        - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
          with:
            persist-credentials: false
        - run: corepack enable
        - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6
          with:
            node-version: 22
            cache: yarn
        - run: yarn install --immutable
        - run: yarn format:check
        - run: yarn lint:ci
  ```

- [ ] **Step 2: Validate YAML syntax**

  ```shell
  yarn lint:actions
  ```

  Expected: no errors.

---

## Task 5: Create `ci-data-sanitization.yml`

**Files:**

- Create: `.github/workflows/ci-data-sanitization.yml`

Path triggers include shared files that affect this package. Shared files: `package.json`,
`yarn.lock`, `.yarnrc.yml`, `tsconfig.json` (root base config that packages extend).

- [ ] **Step 1: Create the file**

  ```yaml
  name: CI (data-sanitization)

  on:
    push:
      branches: [main]
      paths:
        - 'packages/data-sanitization/**'
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.github/workflows/ci-data-sanitization.yml'
    pull_request:
      branches: [main]
      paths:
        - 'packages/data-sanitization/**'
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.github/workflows/ci-data-sanitization.yml'

  jobs:
    ci:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        pull-requests: write
      strategy:
        fail-fast: false
        matrix:
          node-version: [22, 24]
      steps:
        - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
          with:
            persist-credentials: false
        - run: corepack enable
        - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6
          with:
            node-version: ${{ matrix.node-version }}
            cache: yarn
        - run: |
            git config --global user.name "CI"
            git config --global user.email "ci@localhost"
            git config --global init.defaultBranch main
        - run: yarn install --immutable
        - run: yarn workspace data-sanitization format:check
        - run: yarn workspace data-sanitization lint:ci
        - run: yarn workspace data-sanitization build
        - run: yarn workspace data-sanitization test:coverage
        - name: Report coverage
          if: matrix.node-version == 24
          uses: davelosert/vitest-coverage-report-action@02f3c2e641286b7fa308cd3e430783103ce6103b # v2
          with:
            json-summary-path: coverage/coverage-summary.json
            json-final-path: coverage/coverage-final.json
            working-directory: packages/data-sanitization
        - name: Extract coverage percentage
          id: coverage
          if: matrix.node-version == 24 && github.event_name == 'push'
          run: echo "percentage=$(jq '.total.lines.pct' packages/data-sanitization/coverage/coverage-summary.json)" >> "$GITHUB_OUTPUT"
        - name: Update coverage badge
          if: matrix.node-version == 24 && github.event_name == 'push'
          uses: schneegans/dynamic-badges-action@0e50b8bad39e7e1afd3e4e9c2b7dd145fad07501 # v1.8.0
          with:
            auth: ${{ secrets.GIST_SECRET }}
            gistID: ${{ vars.COVERAGE_GIST_ID }}
            filename: data-sanitization-coverage-badge-config.json
            label: coverage
            message: ${{ steps.coverage.outputs.percentage }}%
            valColorRange: ${{ steps.coverage.outputs.percentage }}
            maxColorRange: 100
            minColorRange: 0
        - name: Update coverage report in Gist
          if: matrix.node-version == 24 && github.event_name == 'push'
          env:
            COVERAGE_GIST_ID: ${{ vars.COVERAGE_GIST_ID }}
            GIST_SECRET: ${{ secrets.GIST_SECRET }}
          run: yarn workspace data-sanitization node scripts/update-coverage-gist.mjs --package-name data-sanitization
  ```

- [ ] **Step 2: Validate YAML syntax**

  ```shell
  yarn lint:actions
  ```

  Expected: no errors.

---

## Task 6: Create `ci-data-sanitization-log-providers.yml`

**Files:**

- Create: `.github/workflows/ci-data-sanitization-log-providers.yml`

Path triggers include `packages/data-sanitization/**` because log-providers has
`"data-sanitization": "workspace:*"` as a peer dependency; changes to the core package can
break log-providers.

- [ ] **Step 1: Create the file**

  ```yaml
  name: CI (data-sanitization-log-providers)

  on:
    push:
      branches: [main]
      paths:
        - 'packages/data-sanitization-log-providers/**'
        - 'packages/data-sanitization/**'
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.github/workflows/ci-data-sanitization-log-providers.yml'
    pull_request:
      branches: [main]
      paths:
        - 'packages/data-sanitization-log-providers/**'
        - 'packages/data-sanitization/**'
        - 'package.json'
        - 'yarn.lock'
        - '.yarnrc.yml'
        - 'tsconfig.json'
        - '.github/workflows/ci-data-sanitization-log-providers.yml'

  jobs:
    ci:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        pull-requests: write
      strategy:
        fail-fast: false
        matrix:
          node-version: [22, 24]
      steps:
        - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
          with:
            persist-credentials: false
        - run: corepack enable
        - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6
          with:
            node-version: ${{ matrix.node-version }}
            cache: yarn
        - run: |
            git config --global user.name "CI"
            git config --global user.email "ci@localhost"
            git config --global init.defaultBranch main
        - run: yarn install --immutable
        - run: yarn workspace data-sanitization-log-providers format:check
        - run: yarn workspace data-sanitization-log-providers lint:ci
        - run: yarn workspace data-sanitization-log-providers build
        - run: yarn workspace data-sanitization-log-providers test:coverage
        - name: Report coverage
          if: matrix.node-version == 24
          uses: davelosert/vitest-coverage-report-action@02f3c2e641286b7fa308cd3e430783103ce6103b # v2
          with:
            json-summary-path: coverage/coverage-summary.json
            json-final-path: coverage/coverage-final.json
            working-directory: packages/data-sanitization-log-providers
        - name: Extract coverage percentage
          id: coverage
          if: matrix.node-version == 24 && github.event_name == 'push'
          run: echo "percentage=$(jq '.total.lines.pct' packages/data-sanitization-log-providers/coverage/coverage-summary.json)" >> "$GITHUB_OUTPUT"
        - name: Update coverage badge
          if: matrix.node-version == 24 && github.event_name == 'push'
          uses: schneegans/dynamic-badges-action@0e50b8bad39e7e1afd3e4e9c2b7dd145fad07501 # v1.8.0
          with:
            auth: ${{ secrets.GIST_SECRET }}
            gistID: ${{ vars.COVERAGE_GIST_ID }}
            filename: data-sanitization-log-providers-coverage-badge-config.json
            label: coverage
            message: ${{ steps.coverage.outputs.percentage }}%
            valColorRange: ${{ steps.coverage.outputs.percentage }}
            maxColorRange: 100
            minColorRange: 0
        - name: Update coverage report in Gist
          if: matrix.node-version == 24 && github.event_name == 'push'
          env:
            COVERAGE_GIST_ID: ${{ vars.COVERAGE_GIST_ID }}
            GIST_SECRET: ${{ secrets.GIST_SECRET }}
          run: yarn workspace data-sanitization-log-providers node ../data-sanitization/scripts/update-coverage-gist.mjs --package-name data-sanitization-log-providers
  ```

- [ ] **Step 2: Validate YAML syntax**

  ```shell
  yarn lint:actions
  ```

  Expected: no errors.

---

## Task 7: Delete old `ci.yml` and final verification

**Files:**

- Delete: `.github/workflows/ci.yml`

- [ ] **Step 1: Delete old workflow**

  ```bash
  git rm .github/workflows/ci.yml
  ```

- [ ] **Step 2: Run full local verification**

  ```shell
  yarn lint:all
  yarn format:check:all
  yarn build:all
  yarn test:all
  ```

  All should pass with labeled per-workspace output.

- [ ] **Step 3: Run lint:actions to validate all three new workflow files**

  ```shell
  yarn lint:actions
  ```

  Expected: no errors on the three new workflow files.

- [ ] **Step 4: Commit everything**

  ```bash
  git add .github/workflows/
  git commit -m "ci: split into per-workspace workflows with path filtering"
  ```
