# ai-add-prompt

Creates a new shared prompt and registers thin wrappers for each AI system
detected in the repo.

## When to Use

When adding a new user-invokable slash command / chat prompt that should be
available in both Copilot and Claude Code.

## AI System Detection

Before creating any files, check:

- **Copilot prompts active**: `.github/prompts/` directory exists
- **Claude active**: `CLAUDE.md` file exists (create in `.claude/skills/<name>/`)

## Steps

1. **Gather inputs**: Ask for:
   - `name`: kebab-case identifier (e.g. `create-component`)
   - `description`: one-sentence summary shown in the prompt picker

2. **Create the shared file**: Create `.ai/prompts/<name>.md` (create
   `.ai/prompts/` directory if it does not exist) with this starter template:

   ```markdown
   # <Title>

   <!-- Description: <description> -->

   ## Steps

   1.
   ```

3. **If Copilot prompts active**: Create `.github/prompts/<name>.prompt.md`:

   ```markdown
   ---
   description: '<description>'
   ---

   #file:../../.ai/prompts/<name>.md
   ```

4. **If Claude active**: Create `.claude/skills/<name>/SKILL.md`:

   ```markdown
   ---
   name: <name>
   description: '<description>'
   disable-model-invocation: true
   ---

   $ARGUMENTS

   @../../../.ai/prompts/<name>.md
   ```

5. **Confirm**: Report which files were created.
