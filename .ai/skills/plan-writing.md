# Plan Writing

## When to Use

- Starting any non-trivial implementation (feature, workflow, architectural change)
- When asked to "make a plan" or "write a plan" for a change
- Before creating a branch or issue for significant work

## Format Rules

Follow the plan format rules in `.ai/instructions/plan-writing.md`.

When creating thin wrapper files that reference this instruction, use the
appropriate syntax for each AI system:

- **Claude Code** thin wrappers: `@.ai/instructions/plan-writing.md`
- **GitHub Copilot** thin wrappers: `#file:../../.ai/instructions/plan-writing.md`

## Workflow

1. **Determine the next plan number** — list `docs/plans/` and find the
   highest existing `NNN` prefix; increment by one (pad to three digits)

2. **Gather context** — read relevant source files, existing plans, and any
   linked issues to understand scope before writing

3. **Draft the plan** — create `docs/plans/NNN-description.md` using
   `docs/plans/TEMPLATE.md` as the skeleton; fill every required section

4. **Decisions first** — if the user has already discussed trade-offs in the
   conversation, capture them in the Decisions section before they are lost

5. **Confirm before saving** — present the draft to the user for review if the
   scope is large or ambiguous; save directly for straightforward plans

## Naming

Use the filename description to summarize the change in two to four words,
lowercase kebab-case. The number is assigned at creation time and never
changes.
