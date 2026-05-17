# Plan Documentation System

## Approach

Establish `docs/plans/` as a convention for recording pre-implementation plans
as structured markdown documents. Add Copilot infrastructure (instruction file
and skill) so the system is self-describing and AI-assisted. Also add a PR
template to enforce conventional commit title format and issue closing.

## Pre-implementation

- Create GitHub issue #272
- Create branch `chore/272/plan_system`

## Steps

1. `docs/plans/000-plan-system.md` — this plan, bootstrapped before the
   template exists but written to conform to the format being defined

2. `.github/instructions/plan-writing.instructions.md` — defines required
   sections, naming convention, and when to write a plan; `applyTo: docs/plans/**`

3. `.github/skills/plan-writing/SKILL.md` — Copilot workflow for creating
   plans; references the instruction file for format rules

4. `docs/plans/TEMPLATE.md` — copyable skeleton with section headings
   matching the instruction file exactly

5. `docs/plans/README.md` — explains the folder purpose, how to use the
   template, and how to invoke the skill

6. `.github/PULL_REQUEST_TEMPLATE.md` — PR title convention reminder and
   `Closes #N` placeholder

7. `docs/development.md` — updated to mention `docs/plans/`, the plan-writing
   preference, and PR conventions

## Relevant Files

- `docs/plans/000-plan-system.md` — new, this plan
- `.github/instructions/plan-writing.instructions.md` — new, plan format rules
- `.github/skills/plan-writing/SKILL.md` — new, Copilot plan-writing workflow
- `docs/plans/TEMPLATE.md` — new, copyable plan skeleton
- `docs/plans/README.md` — new, folder overview
- `.github/PULL_REQUEST_TEMPLATE.md` — new, PR conventions
- `docs/development.md` — updated

## Verification

- `docs/plans/README.md` explains the system clearly for a new contributor
- Skill references the instruction file path without duplicating format rules
- `TEMPLATE.md` sections match instruction file headings exactly
- PR template includes `Closes #N` placeholder and title convention reminder

## Decisions

**Instruction file as single source of truth for plan format** — the skill and
README reference the instruction file path rather than restating the rules.
This prevents drift if the format evolves.

**`000-` prefix for this plan** — it is the progenitor of the system and
predates the template it defines. Future plans start at `001`.

**PR template added in this PR** — PR conventions are repo infrastructure in
the same category as the plan system. Bundling them avoids a second chore PR
for a one-file change.

**Sequential numbering over date-based naming** — sequential numbers are
shorter, sort correctly, and do not embed timezone ambiguity. Dates can be
inferred from git history.
