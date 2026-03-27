# data-sanitization

## Overview

This package takes a pattern based approach to matching field names in data and then replacing the associated fields by either masking the field value or removing the field.

Objects are first converted to strings via `JSON.stringify`. This is done to have a consistent interface for text and non-text data.

NOTE: Since `JSON.stringify` might not be performant on large data sets, or when being run repeatedly, `v2` might take a different approach for non-string data.

After the pattern replacement, the new string is either returned or is converted back into an object via `JSON.parse` and then returned.

In any case where the data cannot be parsed, an error object is thrown.

## Table of Contents

- [data-sanitization](#data-sanitization)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Development](#development)
  - [Build](#build)
  - [Testing](#testing)
  - [Commit Policy](#commit-policy)
  - [Release Process](#release-process)
  - [Documentation](#documentation)
  - [TODO: Version 2](#todo-version-2)

## Development

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

## Documentation

TODO

## TODO: Version 2

Possibly take a different approach to data parsing for version 2.

- take an approach where instead of first converting all data to strings with `JSON.stringify`, instead attempt to convert all data to objects if it isn't already
- use `cloneDeepWith` from `lodash` to copy the object and modify/remove strings within the data
