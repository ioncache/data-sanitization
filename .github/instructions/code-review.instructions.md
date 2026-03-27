---
applyTo: '**'
---

# Copilot Code Review Instructions

Important: This file is intended solely for Copilot and AI agents performing
code reviews on GitHub. It should not be used by coding assistants or agents
when implementing code.

## Purpose

Reviews should focus on new or modified code in the PR, not pre-existing issues.
Comments should be actionable and specific to what changed.

## Core Principles

1. **Review Only New or Modified Code**
   - Do not comment on issues that existed before the current changes (e.g.,
     file length, missing JSDoc, legacy patterns).
   - Focus feedback on code that was added, changed, or deleted in the pull
     request.

2. **No Retroactive Enforcement**
   - Don't flag existing violations unless the change introduces a new issue or
     significantly worsens what's already there.
   - Example: A file already has 400 lines and the PR adds 10 more. Don't
     complain about file length. If the PR adds 100+ lines, suggest splitting
     only the new code.

3. **Actionable Feedback**
   - Be specific about what changed.
   - Skip generic complaints about the codebase.

4. **Respect Project-Specific Exceptions**
   - If project instructions allow exceptions or best-effort patterns, don't
     enforce stricter rules.

5. **No Blame for Existing Code**
   - Do not attribute responsibility for existing issues to the current author
     or PR.

## Examples

- **File Size**:  
  If a file is already over a recommended line limit and the PR adds more lines,
  do not flag the file size. Only suggest splitting if the change introduces a
  new violation.

- **JSDoc/Comments**:  
  Only require JSDoc for new functions or modified functions that already have
  JSDoc. Don't force adding JSDoc to legacy code just because it was touched.

- **Tests**:  
  Require tests for new features or changes, not for untouched existing code.

- **Naming/Patterns**:  
  Flag naming or pattern issues only in new/modified code.

- **Security**:  
  Always flag security vulnerabilities in new or modified code, regardless of
  existing code state.

## Reference to Other Instruction Files

Other instruction files (`code-complexity`, `comments`, `jsdoc`, `performance`,
`security`, `unit-tests`) are primarily for coding agents implementing changes.
Use them as guidelines during reviews, but apply standards only to new or
modified code — don't flag pre-existing issues unless the change makes them
worse.

## Handling Slight Regressions (Suggestion vs Requirement)

When a change slightly worsens an existing issue, favor suggestions over
requirements unless the regression is serious:

- **Critical or security-sensitive**: Require fixes for security
  vulnerabilities, data leaks, or critical bugs before merging.
- **High-impact performance or correctness**: Require a fix or follow-up plan
  (open an issue, link to PR).
- **Low-impact or cosmetic**: Suggest improvements (styling, file length,
  non-critical JSDoc) but mark as optional.
- **Easy to fix**: If the fix is quick, request it directly rather than
  deferring.

When in doubt, suggest rather than require. Explain why for requirements; offer
examples for suggestions. Link to instruction files when relevant (`jsdoc`,
`performance`, `code-complexity`).

## Checklist

- [ ] Feedback is limited to new/changed code
- [ ] No comments on pre-existing issues unless made worse by the PR
- [ ] Suggestions are actionable for the current author
- [ ] No blame or requests to fix existing code
- [ ] Project-specific instructions and exceptions are respected
- [ ] Slight regressions handled appropriately (suggestion vs requirement)
- [ ] Security issues always flagged, regardless of existing code state
