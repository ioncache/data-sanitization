# Contributing

Bug reports and pull requests are welcome.

## Getting started

```bash
yarn install --immutable
yarn test
```

See [docs/development.md](docs/development.md) for the full setup guide and
build commands.

## Before you start work

- Check [docs/ROADMAP.md](docs/ROADMAP.md) to see what is planned and what
  signals are being collected before committing to new features.
- For non-trivial changes, write a plan document in `docs/plans/` before
  touching code. See [docs/plans/README.md](docs/plans/README.md) for the
  naming convention and format.

## Pull requests

- PR titles use conventional commit format:
  `<type>(<issue-number>): <description>`
  — e.g. `feat(42): add custom sanitizer option`
- Keep coverage at 100% — `yarn test:coverage` enforces this.
- Update README and TSDoc if the public API changes.
