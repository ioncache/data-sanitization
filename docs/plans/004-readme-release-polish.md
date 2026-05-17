# README Release Polish

## Approach

Update the package-facing documentation and registry metadata so the v1 library
is easier to evaluate, install, and use without changing runtime behavior. This
is the first concrete implementation slice from the post-v1 roadmap, focused on
README clarity, package-manager installation guidance, TypeScript/import
expectations, and lightweight release metadata.

## Pre-implementation

Create branch `docs/readme-release-polish` from `main` after committing the
standalone roadmap.

## Steps

1. `docs/plans/004-readme-release-polish.md` - add this plan for the README and
   release polish work.
2. `README.md` - refresh the opening, quick-start flow, installation section,
   import examples, usage examples, and wording around current behavior.
3. `package.json` - add non-promotional registry metadata such as `homepage`
   and `bugs` while leaving funding metadata omitted.
4. `docs/development.md` - clarify contributor setup and release validation
   expectations, including Volta and the package scripts used for checks.
5. `docs/ROADMAP.md` - keep roadmap wording aligned with the README's
   sensitive-data positioning.
6. `docs/plans/001-coverage-tracking.md` - fix the existing markdown bare URL
   diagnostic if this branch runs documentation linting against plan files.

## Relevant Files

- `docs/plans/004-readme-release-polish.md` - new plan for this documentation
  and metadata slice.
- `README.md` - updated user-facing documentation for install, imports, usage,
  options, and behavior.
- `package.json` - updated package metadata for registry discoverability.
- `docs/development.md` - updated contributor and release validation notes.
- `docs/ROADMAP.md` - updated roadmap wording for sensitive-data positioning.
- `docs/plans/001-coverage-tracking.md` - existing plan with a markdown
  diagnostic that may be corrected if validation requires it.

## Verification

1. Run `yarn format:check`.
2. Run `yarn lint`.
3. Run `yarn build`.
4. Re-run workspace diagnostics for touched Markdown and JSON files.
5. Manually review `README.md` for readable GitHub rendering, accurate anchors,
   and examples that do not imply unsupported package ecosystems.

## Decisions

**Roadmap before implementation plan** - the long-term post-v1 direction lives
in `docs/ROADMAP.md`, while this numbered plan records the first concrete
branch-sized execution slice.

**Documentation and metadata only** - this branch avoids runtime code changes so
README polish, package metadata, and contributor documentation can be reviewed
without behavior risk.

**Install docs cover package managers where the npm package is usable** - npm,
yarn, pnpm, and bun are included. Deno or JSR instructions are omitted unless
the package is actually published for those ecosystems.

**Funding metadata remains omitted** - the package should gain `homepage` and
`bugs` metadata, but no funding link is added for this pass.

**Changelog remains optional** - release history can be revisited later; it is
not part of this first release-polish branch.
