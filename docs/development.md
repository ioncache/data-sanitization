# Development

## Setup

This repository uses Yarn 4 Plug'n'Play, Husky hooks, and Volta-pinned tool versions.
Install Volta or use a Corepack-compatible environment before installing
dependencies. Yarn cache and install state are not committed, and generated PnP
files such as `.pnp.cjs` are local.

VS Code uses the Yarn-generated TypeScript SDK in `.yarn/sdks/` so editor
diagnostics resolve dependencies the same way package scripts do.

```bash
yarn install --immutable
```

Common package scripts:

```bash
yarn build
yarn format
yarn format:check
yarn lint
yarn test
yarn test:coverage
```

## Browser Compatibility

The library uses no Node.js-specific globals or APIs and is intentionally
browser-compatible. Do not add production dependencies or use runtime APIs that
are not available in browsers.

## Build

Build artifacts are emitted to `dist/`:

```bash
yarn build
```

The build emits compiled JavaScript, TypeScript declarations, and source maps.
`prepack` runs the build automatically to ensure published packages use compiled
output.

## Testing

Tests are run with Vitest. Coverage thresholds are enforced at 100% for statements,
branches, functions, and lines.

```bash
yarn test
yarn test:coverage
```

## Planning

Before starting any non-trivial change, write a plan document in `docs/plans/`.
Plans are named sequentially (`NNN-short-description.md`) and committed
alongside the implementation. See [docs/plans/README.md](plans/README.md) for
the full convention.

To create a plan with Copilot, use the `plan-writing` skill in
`.github/skills/plan-writing/SKILL.md`.

## Pull Requests

PR titles follow conventional commit format with the issue number in scope:

```text
<type>(<issue-number>): <description>
```

Example: `chore(272): add plan documentation system`

The PR body uses three sections — **Overview**, **Details**, and **Related
Tickets and/or Pull Requests** — with issue/PR links under the tickets section
(e.g. `Closes #N`, `Fixes #N`, `Relates to #N`).

## Commit Policy

Commit messages are validated with commitlint using conventional commits.

- `pre-commit`: runs `lint-staged`
- `commit-msg`: runs `commitlint`

Examples:

- `feat: add custom sanitizer option`
- `fix: handle non-string input safely`
- `chore: upgrade lint dependencies`

## Release Process

Releases are driven by a custom interactive script that detects unreleased
commits per workspace package, suggests a semver bump, previews release notes,
and creates the git tag and GitHub release. npm publishing is a separate manual
step done after the script finishes.

### Step 1 — Validate

```bash
yarn format:check
yarn lint:ci
yarn build
yarn test:coverage
```

### Step 2 — Run the release script

```bash
yarn release
```

The script is interactive:

1. **Summary** — shows each package, how many commits since its last release,
   how many are user-facing, and the suggested semver bump.
2. **Select packages** — checkbox to choose which packages to release
   (pre-checked for packages that have user-facing changes).
3. **Bump type** — for each selected package, choose `patch`, `minor`, or
   `major` (the suggestion is pre-selected).
4. **Preview** — shows the release notes that will be published to GitHub.
5. **Confirm** — proceed or abort.

On confirmation the script:

- Bumps the version in each package's `package.json`
- Commits as `chore: release <name>@<version>`
- Creates an annotated git tag `<name>@<version>` (e.g. `data-sanitization@1.5.0`)
- Creates a GitHub release with the generated release notes
- Pushes the commit and tag to `origin main`

### Step 3 — Publish to npm (manual)

The script prints the publish command at the end. Run it to publish each
released package:

```bash
yarn workspace data-sanitization npm publish
```

This publishes only the package whose version was just bumped. The `prepack`
script runs `yarn build` automatically.

### Release notes format

Release notes are generated from conventional commits since the last release
tag for that package. Only user-facing commit types are included:

- `feat` → Features
- `fix` → Bug Fixes
- `perf` → Performance
- `revert` → Reverts

Commits of type `chore`, `docs`, `ci`, `test`, `build`, and `style` are
omitted. Breaking changes (`feat!`, `fix!`, or a `BREAKING CHANGE:` footer)
appear in a dedicated **⚠️ Breaking Changes** section at the top and are
also listed under their normal section.

### Git tag scheme

Tags use the format `<package-name>@<version>` (e.g. `data-sanitization@1.5.0`).
The release script falls back to `v*` tags when looking for the previous release
of a package that predates the prefixed scheme.
