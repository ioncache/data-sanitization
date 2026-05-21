# AI Customization Shared Layer

## Approach

Create a `.ai/` directory as a single source of truth for all AI customization
content — instructions, skills, and prompts. Both GitHub Copilot and Claude Code
currently maintain separate copies of the same rules (instruction files for
Copilot, inline text in CLAUDE.md for Claude). This plan migrates all shared
content into `.ai/`, strips the bodies from the existing Copilot files so they
become thin wrappers, and creates equivalent thin wrappers for Claude Code. A
set of maintenance skills (`ai-add-instruction`, `ai-add-prompt`, `ai-add-skill`)
ensures new content is always created in the shared layer with wrappers
auto-generated for every detected AI system.

## Nomenclature Mapping

The systems use different names for the same concepts:

| Concept                | Copilot location                 | Claude Code location | `.ai/` subfolder |
| ---------------------- | -------------------------------- | -------------------- | ---------------- |
| Auto-loaded context    | `.github/instructions/`          | CLAUDE.md `@imports` | `instructions/`  |
| User-invokable prompts | `.github/prompts/`               | `.claude/skills/`    | `prompts/`       |
| Reusable workflows     | `.github/skills/<name>/SKILL.md` | `.claude/skills/`    | `skills/`        |

## Thin Wrapper Formats

**Copilot instruction** — keep frontmatter, replace body:

```markdown
---
applyTo: '**'
---

#file:../../.ai/instructions/<name>.md
```

**Copilot skill** — keep frontmatter, replace body:

```markdown
---
name: <name>
description: '...'
---

#file:../../../.ai/skills/<name>.md
```

**Copilot prompt** — keep frontmatter, replace body:

```markdown
---
description: '...'
---

#file:../../.ai/prompts/<name>.md
```

**Claude skill** (`.claude/skills/<name>.md`) — no frontmatter:

```
@.ai/skills/<name>.md
```

**Claude prompt** (`.claude/skills/<name>.md`) — no frontmatter:

```
@.ai/prompts/<name>.md
```

**CLAUDE.md Conventions section** — replace inline bullets with `@imports`:

```markdown
## Conventions

@.ai/instructions/code-complexity.md
@.ai/instructions/comments.md
@.ai/instructions/jsdoc.md
@.ai/instructions/unit-tests.md
```

Note: `code-review` is excluded from CLAUDE.md (its header states it is for
Copilot review only, not coding assistants). `plan-writing` is excluded because
`docs/development.md` already covers the plan workflow for Claude.

**Cross-references within `.ai/` files** — when a shared file must reference
another shared file, include both syntaxes:

```markdown
Follow the standards in `.ai/instructions/plan-writing.md`.

> **Claude Code:** `@.ai/instructions/plan-writing.md`
> **GitHub Copilot:** `#file:../../.ai/instructions/plan-writing.md`
```

## Steps

### Phase 1 — Create the shared layer

1. Create `.ai/instructions/` and `.ai/skills/` directories.

2. For each `.github/instructions/*.instructions.md` file, create a
   corresponding `.ai/instructions/<name>.md` by copying the body (everything
   after the closing `---` of the frontmatter). Files to migrate:
   - `code-complexity.instructions.md` → `.ai/instructions/code-complexity.md`
   - `code-review.instructions.md` → `.ai/instructions/code-review.md`
   - `comments.instructions.md` → `.ai/instructions/comments.md`
   - `jsdoc.instructions.md` (or `jsdoc-tsdoc.instructions.md` if that file
     has replaced it) → `.ai/instructions/jsdoc.md`
   - `plan-writing.instructions.md` → `.ai/instructions/plan-writing.md`
   - `security.instructions.md` → `.ai/instructions/security.md`
   - `unit-tests.instructions.md` → `.ai/instructions/unit-tests.md`

3. Create `.ai/skills/plan-writing.md` from the body of
   `.github/skills/plan-writing/SKILL.md`. Update the internal reference from
   `.github/instructions/plan-writing.instructions.md` to use the cross-reference
   pattern (both Claude and Copilot syntax pointing to
   `.ai/instructions/plan-writing.md`).

4. Create `.ai/README.md` explaining the folder structure and noting that
   `ai-add-*` skills are candidates for future extraction into a Claude plugin
   or Copilot user-level skills (`~/.copilot/skills/`).

### Phase 2 — Update Copilot thin wrappers

5. For each `.github/instructions/*.instructions.md`, replace the body with a
   `#file:` reference to the corresponding `.ai/instructions/<name>.md`. Keep
   all frontmatter (`applyTo`, `name`, `description`) unchanged.

6. Replace the body of `.github/skills/plan-writing/SKILL.md` with a `#file:`
   reference to `.ai/skills/plan-writing.md`. Keep frontmatter unchanged.

### Phase 3 — Create Claude thin wrappers

7. Create `.claude/skills/` directory.

8. Create `.claude/skills/plan-writing.md` containing only:

   ```
   @.ai/skills/plan-writing.md
   ```

9. Update the `## Conventions` section of `CLAUDE.md` to replace the three
   inline bullet points with `@import` lines for `code-complexity.md`,
   `comments.md`, `jsdoc.md`, and `unit-tests.md`.

### Phase 4 — Maintenance skills

10. Create `.ai/skills/ai-add-instruction.md`. This skill:
    - Asks for a name (kebab-case) and `applyTo` glob
    - Creates `.ai/instructions/<name>.md` with a starter template
    - Detects Copilot (`.github/instructions/` exists) and creates
      `.github/instructions/<name>.instructions.md` thin wrapper
    - Detects Claude (`CLAUDE.md` exists) and appends `@.ai/instructions/<name>.md`
      to the Conventions section of `CLAUDE.md`

11. Create `.ai/skills/ai-add-prompt.md`. This skill:
    - Asks for a name and description
    - Creates `.ai/prompts/<name>.md` (creates `.ai/prompts/` if absent)
    - Detects Copilot and creates `.github/prompts/<name>.prompt.md` thin wrapper
    - Detects Claude and creates `.claude/skills/<name>.md` thin wrapper

12. Create `.ai/skills/ai-add-skill.md`. This skill:
    - Asks for a name and description
    - Creates `.ai/skills/<name>.md` with a starter template
    - Detects Copilot and creates `.github/skills/<name>/SKILL.md` thin wrapper
    - Detects Claude and creates `.claude/skills/<name>.md` thin wrapper

13. Create Copilot thin wrappers for the three maintenance skills:
    - `.github/skills/ai-add-instruction/SKILL.md`
    - `.github/skills/ai-add-prompt/SKILL.md`
    - `.github/skills/ai-add-skill/SKILL.md`

14. Create Claude thin wrappers for the three maintenance skills:
    - `.claude/skills/ai-add-instruction.md`
    - `.claude/skills/ai-add-prompt.md`
    - `.claude/skills/ai-add-skill.md`

## Relevant Files

**New — shared layer:**

- `.ai/README.md` — explains the folder structure
- `.ai/instructions/code-complexity.md` — new (content from Copilot wrapper)
- `.ai/instructions/code-review.md` — new
- `.ai/instructions/comments.md` — new
- `.ai/instructions/jsdoc.md` — new
- `.ai/instructions/plan-writing.md` — new
- `.ai/instructions/security.md` — new
- `.ai/instructions/unit-tests.md` — new
- `.ai/skills/plan-writing.md` — new (content from Copilot wrapper)
- `.ai/skills/ai-add-instruction.md` — new maintenance skill
- `.ai/skills/ai-add-prompt.md` — new maintenance skill
- `.ai/skills/ai-add-skill.md` — new maintenance skill

**Updated — Copilot thin wrappers:**

- `.github/instructions/code-complexity.instructions.md` — updated (body replaced)
- `.github/instructions/code-review.instructions.md` — updated (body replaced)
- `.github/instructions/comments.instructions.md` — updated (body replaced)
- `.github/instructions/jsdoc.instructions.md` (or `jsdoc-tsdoc.instructions.md`) — updated (body replaced)
- `.github/instructions/plan-writing.instructions.md` — updated (body replaced)
- `.github/instructions/security.instructions.md` — updated (body replaced)
- `.github/instructions/unit-tests.instructions.md` — updated (body replaced)
- `.github/skills/plan-writing/SKILL.md` — updated (body replaced)

**New — Copilot thin wrappers for maintenance skills:**

- `.github/skills/ai-add-instruction/SKILL.md` — new
- `.github/skills/ai-add-prompt/SKILL.md` — new
- `.github/skills/ai-add-skill/SKILL.md` — new

**Updated — Claude:**

- `CLAUDE.md` — Conventions section updated to use `@imports`

**New — Claude thin wrappers:**

- `.claude/skills/plan-writing.md` — new
- `.claude/skills/ai-add-instruction.md` — new
- `.claude/skills/ai-add-prompt.md` — new
- `.claude/skills/ai-add-skill.md` — new

## Verification

- Open VS Code with Copilot enabled; ask it to document a TypeScript function.
  Confirm it follows the JSDoc/TSDoc standards from `.ai/instructions/jsdoc.md`.
- In Claude Code, invoke `/plan-writing`. Confirm it reads the shared skill and
  produces a plan in `docs/plans/` following the correct format.
- Invoke `/ai-add-instruction` in Claude Code and confirm it creates the shared
  file, updates `CLAUDE.md`, and creates the Copilot wrapper.
- Invoke the `ai-add-instruction` skill in Copilot and confirm the same outcome.
- Check that `.github/instructions/*.instructions.md` files contain only
  frontmatter + a `#file:` line (no substantive content).
- Check that CLAUDE.md Conventions section contains only `@import` lines (no
  inline bullet points).

## Decisions

**`.ai/` over `ai/` or `ai_customizations/`** — The repo already uses dotfile
directories for tooling configuration (`.github/`, `.claude/`). `.ai/` follows
the same convention: it is tooling configuration, not source code. The short
name avoids verbose path prefixes in every thin wrapper file.

**Maintenance skills live in `.ai/skills/`** — The alternative was `.claude/skills/`
only, but that would require Claude to be set up to manage Copilot wrappers, and
vice versa. Placing them in `.ai/` makes them invocable from either system.
They are intentionally colocated with other skills rather than in a separate
`meta/` subfolder to keep the structure flat and consistent.

**`code-review` excluded from Claude @imports** — The instruction file
explicitly states it is intended for Copilot code review agents, not coding
assistants. Importing it into CLAUDE.md would cause Claude to apply review-only
constraints (e.g. "only comment on modified code") when writing code, which is
not the intended behavior.

**`plan-writing` excluded from Claude @imports** — CLAUDE.md already delegates
plan workflow context to `docs/development.md`. The plan-writing instruction
covers the same ground and importing it would duplicate guidance already visible
to Claude.

**Copilot prompts/Claude commands both map to `.claude/skills/`** — Claude Code
has merged commands into skills (`.claude/skills/` is the current recommended
path). The distinction between Copilot prompts and Copilot skills is preserved
in the `.ai/` folder (separate `prompts/` and `skills/` subfolders) for semantic
clarity, but both collapse to `.claude/skills/` on the Claude side.

**Future extraction** — The `ai-add-*` maintenance skills are intended to
eventually be extracted into a Claude plugin and into Copilot user-level skills
(`~/.copilot/skills/`). Keeping them in `.ai/skills/` for now means either AI
system can invoke them, and extraction is a simple move-and-remove operation.
