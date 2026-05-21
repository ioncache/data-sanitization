# .ai — Shared AI Customization

Single source of truth for AI customization content used by both GitHub Copilot
and Claude Code. Each AI system has its own thin wrapper files that reference
back here.

## Structure

- `instructions/` — Auto-loaded coding standards and guidelines. Maps to
  Copilot's `.github/instructions/` and Claude Code's `CLAUDE.md @imports`.
- `skills/` — Reusable workflows invokable by name. Maps to Copilot's
  `.github/skills/` and Claude Code's `.claude/skills/`.
- `prompts/` — User-invokable chat prompts (created on demand). Maps to
  Copilot's `.github/prompts/` and Claude Code's `.claude/skills/`.

## Adding new content

Use the maintenance skills to create new items — they auto-detect which AI
systems are active and create the appropriate thin wrappers:

- `/ai-add-instruction` — new auto-loaded instruction
- `/ai-add-prompt` — new user-invokable prompt
- `/ai-add-skill` — new reusable workflow skill

## Future extraction

The `ai-add-*` maintenance skills in `skills/` are candidates for extraction
into a Claude plugin and Copilot user-level skills (`~/.copilot/skills/`) once
they stabilize. When extracted, remove them from here and from the thin wrappers
in `.github/skills/` and `.claude/skills/`.
