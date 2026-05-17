# Plans

This folder contains pre-implementation plan documents — one per non-trivial
change. Plans are written before work begins and committed alongside the
implementation.

## Why plans?

1. **Future recall** — a durable record of what was done and why
2. **Code review** — a reference artifact for human and AI reviewers

## Naming convention

Plans are numbered sequentially: `NNN-short-description.md` (zero-padded,
lowercase kebab-case). Numbers are assigned at creation time and never change.

## How to write a plan

Copy [TEMPLATE.md](TEMPLATE.md), fill in every section, and save it with the
next available number before starting implementation.

To create a plan with Copilot, use the `plan-writing` skill defined in
[`.github/skills/plan-writing/SKILL.md`](../../.github/skills/plan-writing/SKILL.md).
The format rules are in
[`.github/instructions/plan-writing.instructions.md`](../../.github/instructions/plan-writing.instructions.md).
