# Plan Writing Standards

## When to Write a Plan

Write a plan document before implementing any non-trivial change: new features,
architectural decisions, workflow additions, or anything that benefits from a
recorded rationale. Trivial fixes (typos, one-line patches) do not need a plan.

## Naming Convention

Plans are named sequentially: `NNN-short-description.md`

- `NNN` is a zero-padded three-digit number starting at `000`
- Use lowercase kebab-case for the description
- The number is assigned at creation time and never changes

Examples: `000-plan-system.md`, `001-coverage-tracking.md`

## Required Sections

Every plan document must include the following sections in this order:

### Title

A single `#` heading that names the plan. Should match the filename description.

### Approach

One paragraph explaining what is being done and why at a high level.

### Pre-implementation

Any manual steps that must be completed before code changes begin (creating
external accounts, secrets, branches, issues). Omit this section if there are
none.

### Steps

Numbered list of implementation steps. Each step should name the file being
created or modified and describe what changes.

### Relevant Files

A flat list of every file touched, with a one-line note on whether it is new
or updated and what it does.

### Verification

How to confirm the implementation is correct and complete.

### Decisions

Key choices made during planning and the rationale behind them. This is the
most important section for future reference — capture the why, not just the
what.

## Style

- Write in plain present tense ("Add X", "Update Y")
- Be specific about file paths
- Decisions should explain trade-offs, not just state what was chosen
