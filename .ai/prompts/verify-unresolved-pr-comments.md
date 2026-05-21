# Verify Unresolved PR Comments

Fetch the active pull request using the available pull request tool or API and
refresh it first so you evaluate the latest comments and diff.

Collect all unresolved review threads or unresolved review comments on the PR,
regardless of how the pull request tool or API represents them. Include feedback
from all authors (Copilot, human reviewers, etc.). Also include
requested-changes reviews, or the tool's equivalent blocking review feedback,
when they are still unresolved. Note the author on each row so it's clear who
raised each issue.

For each unresolved comment, evaluate it against the current PR diff, changed
files, or patch content provided by the available tool or API, and the project
guidelines:

- Read the relevant section of the diff carefully — do not rely on the comment
  description alone.
- Apply the project's code-review instructions rules: only flag new/changed
  code, never pre-existing issues.
- Apply security instructions: always flag security issues regardless of scope.
- Do not recommend defense-in-depth for scenarios that can't happen through
  normal code paths.

Produce a markdown table with these columns:

| #   | Author | File | Issue Summary | Severity | Fix? | Suggestion Valid? | Required Action / PR Response |
| --- | ------ | ---- | ------------- | -------- | ---- | ----------------- | ----------------------------- |

Rules for each column:

- **Severity**: High / Medium / Low based on impact (High = correctness bug or
  security; Medium = reliability, reproducibility, or operational risk; Low =
  cosmetic or edge-case tooling)
- **Fix?**: ✅ Fix or 🚫 No fix — If the suggestion is valid and targets new
  code introduced in this PR, the answer is always ✅ Fix. "🚫 No fix" is only
  for comments that are invalid, target pre-existing code unchanged by the PR,
  or recommend defense-in-depth for impossible scenarios. Do not defer valid
  issues on new code — fix them now.
- **Suggestion Valid?**: ✅ Yes / ⚠️ Partially / ❌ No — with one-line reason if
  Partially or No
- **Required Action**: If fixing, state the minimal change. If not fixing, write
  the exact response to post in the PR thread.

After the table, provide a one-line summary: how many to fix, how many to
respond-no-change, and any deferred items.
