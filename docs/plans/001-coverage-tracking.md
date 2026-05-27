# Coverage Tracking

## Approach

Replace Codecov with a self-contained GitHub-native coverage setup. Vitest
generates coverage reports that the CI job uses in two ways: posting a per-file
coverage table as a PR comment, and writing the coverage percentage to a GitHub
Gist from which a Shields.io dynamic badge is served in the README. No external
accounts are required beyond GitHub.

## Pre-implementation

- Create a public GitHub Gist with a file named `coverage.json`
- Create a classic PAT with `gist` scope at
  [github.com/settings/tokens](https://github.com/settings/tokens)
- Add the PAT as repository secret `GIST_SECRET`
- Add the Gist ID as repository variable `COVERAGE_GIST_ID`
- Create GitHub issue #274
- Create branch `chore/274/coverage_tracking`

## Steps

1. `docs/plans/001-coverage-tracking.md`: this plan

2. `vitest.config.ts`: add `reporters: ['text', 'json-summary', 'json']`
   inside the `coverage` block; `json-summary` is required by the PR comment
   action, `json` provides per-file detail

3. `.github/workflows/ci.yml`: add `permissions: pull-requests: write` to the
   job; replace `yarn test` with `yarn test:coverage`; append three steps gated
   on `matrix.node-version == 24`:
   - `davelosert/vitest-coverage-report-action@v2`: posts per-file coverage
     table as a PR comment; runs on both push and PR events
   - Extract coverage percentage from `coverage/coverage-summary.json` using
     `jq`; gated additionally on `github.event_name == 'push'`
   - `schneegans/dynamic-badges-action@v1.8.0`: writes Shields.io endpoint
     JSON to the Gist using `GIST_SECRET` and `COVERAGE_GIST_ID`; gated
     additionally on `github.event_name == 'push'`

4. `README.md`: add Shields.io dynamic badge after the Node CI badge; badge
   URL reads from the Gist via `https://img.shields.io/endpoint?url=...`

## Relevant Files

- `docs/plans/001-coverage-tracking.md`: new, this plan
- `vitest.config.ts`: updated, add coverage reporters
- `.github/workflows/ci.yml`: updated, replace test command and add coverage steps
- `README.md`: updated, add coverage badge

## Verification

1. Push to `main`: `yarn test:coverage` runs on both Node versions; the Node
   24 step updates the Gist; the README badge reflects the current coverage
2. Open a PR: the Node 24 step posts a per-file coverage comment
3. README badge renders dynamically from the Gist without any external service
   login

## Decisions

**No new CI job:** coverage post-processing is appended to the existing matrix
job and gated on `node-version == 24`. This avoids running tests twice and
keeps the workflow file simple.

**Gist update on push to main only:** the `GIST_SECRET` PAT is not available
to workflows triggered by fork PRs. The coverage thresholds enforced by Vitest
already fail the CI job if coverage drops, so the badge only needs to update on
merged code.

**PR comment uses `GITHUB_TOKEN`:** always available, no extra secret needed.

**`davelosert/vitest-coverage-report-action` over official Vitest tooling:**
Vitest's built-in `github-actions` reporter (enhanced in v4.1.0) handles test
result summaries only, not coverage. There is no official Vitest coverage
action. The `davelosert` action is community-maintained, actively developed
(v2.12.0 released May 2026), and is the de facto standard for this use case.

**Shields.io + Gist over SVG badges committed to the repo:** the Gist
approach keeps badge updates out of the commit history. The trade-off is a
one-time PAT setup, which is acceptable.
