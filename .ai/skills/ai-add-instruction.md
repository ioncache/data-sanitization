# ai-add-instruction

Creates a new shared instruction and registers thin wrappers for each AI system
detected in the repo.

## When to Use

When adding a new auto-loaded coding standard or guideline that should apply to
both Copilot and Claude Code.

## AI System Detection

Before creating any files, check:

- **Copilot instructions active**: `.github/instructions/` directory exists
- **Claude active**: `CLAUDE.md` file exists

## Steps

1. **Gather inputs**: Ask for:
   - `name`: kebab-case identifier (e.g. `naming-conventions`)
   - `applyTo`: glob pattern for Copilot's `applyTo` frontmatter (e.g. `**` or
     `**/*.ts,**/*.tsx`)
   - Brief description of the instruction's purpose

2. **Create the shared file**: Create `.ai/instructions/<name>.md` with this
   starter template:

   ```markdown
   # <Title>

   <!-- Brief description of what this instruction covers -->

   ## Core Principles

   1.

   ## Checklist

   - [ ]
   ```

3. **If Copilot instructions active**: Create
   `.github/instructions/<name>.instructions.md`:

   ```markdown
   ---
   applyTo: '<applyTo value>'
   ---

   #file:../../.ai/instructions/<name>.md
   ```

4. **If Claude active**: Append to `CLAUDE.md`'s `## Conventions` section:

   ```text
   @.ai/instructions/<name>.md
   ```

5. **Confirm**: Report which files were created.
