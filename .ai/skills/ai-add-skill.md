# ai-add-skill

Creates a new shared skill and registers thin wrappers for each AI system
detected in the repo.

## When to Use

When adding a new reusable workflow that should be invokable by name in both
Copilot and Claude Code.

## AI System Detection

Before creating any files, check:

- **Copilot skills active**: `.github/skills/` directory exists
- **Claude active**: `CLAUDE.md` file exists (create in `.claude/skills/<name>/`)

## Steps

1. **Gather inputs** — Ask for:
   - `name`: kebab-case identifier (e.g. `run-tests`)
   - `description`: one-sentence summary shown in the skill picker

2. **Create the shared file** — Create `.ai/skills/<name>.md` with this starter
   template:

   ```markdown
   # <Title>

   <!-- Description: <description> -->

   ## When to Use

   ## Steps

   1.
   ```

3. **If Copilot skills active** — Create `.github/skills/<name>/SKILL.md`:

   ```markdown
   ---
   name: <name>
   description: '<description>'
   ---

   #file:../../../.ai/skills/<name>.md
   ```

4. **If Claude active** — Create `.claude/skills/<name>/SKILL.md`:

   ```markdown
   ---
   name: <name>
   description: '<description>'
   disable-model-invocation: true
   ---

   $ARGUMENTS

   @../../../.ai/skills/<name>.md
   ```

5. **Confirm** — Report which files were created.
