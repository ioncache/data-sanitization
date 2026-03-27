# Development

## Setup

This repository uses Yarn and Husky hooks.

```bash
yarn install
```

Common commands:

```bash
yarn format
yarn format:check
yarn lint
yarn test
yarn test:coverage
```

## Build

Build artifacts are emitted to `dist/`:

```bash
yarn build
```

`prepack` runs the build automatically to ensure published packages use compiled output.

## Testing

Tests are run with Vitest. Coverage thresholds are enforced at 100% for statements,
branches, functions, and lines.

```bash
yarn test
yarn test:coverage
```

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

Live release behavior:

1. Generates release notes from conventional commits.
2. Bumps version in `package.json`.
3. Commits release metadata and creates an annotated tag.
4. Pushes `main` and tags.
5. Creates a GitHub Release with generated notes.
