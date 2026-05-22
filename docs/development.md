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

Releases are script-driven and modeled after the reference repository workflow.

Dry run:

```bash
yarn release --bump patch --dry-run
```

Live release:

```bash
yarn release --bump patch
```

Supported bump values: `major`, `minor`, `patch`.

Before publishing or cutting a release, run the local validation scripts:

```bash
yarn format:check
yarn lint:ci
yarn build
yarn test:coverage
```

Live release behavior:

1. Generates release notes from conventional commits.
2. Bumps version in `package.json`.
3. Commits release metadata and creates an annotated tag.
4. Pushes `main` and tags.
5. Creates a GitHub Release with generated notes.
