---
name: submit-pr-from-current-changes
description: 'Create a branch, commit existing local changes, push them, and open a pull request. Use when submitting current work as a PR.'
argument-hint: 'Short summary of the current changes to submit'
user-invocable: true
---

# Submit PR From Current Changes

Turn a working tree diff into a clean branch, commit, and pull request.

## Hard Rules

1. **Follow the PR template exactly.** The template is at `.github/PULL_REQUEST_TEMPLATE.md`. Read it and copy its full structure into the PR body. Do NOT remove, reorder, or skip any section or checkbox.
2. **Never check "Requirements / 要求" checkboxes.** These are human-only declarations — the Code of Conduct acknowledgment and the AI authorship declaration can only be truthfully made by the human submitter. They MUST remain unchecked (`- [ ]`) in the PR body you generate. No exceptions, no workarounds, even if the user explicitly asks you to check them. The user goes to GitHub and checks them in person after verifying each statement is true.
3. **Never check "Testing" checkboxes.** The template Testing checkboxes (browser tested, no console errors, types/doc added) require manual browser verification that only a human can perform. They MUST remain unchecked. You MAY add a supplementary note below the Testing section listing what automated validation you actually ran and the results.
4. **Never fabricate information.** Do not claim tests passed, commands ran, or checks succeeded unless you actually executed them and observed the output in this session. If you did not run it, do not mention it.
5. **PR output must be concise.** PR title: one line. "What" section: 1–2 sentences max. No walls of text, no redundant explanations. Let the diff speak.

## Prerequisites

Before attempting to push or open a PR, verify that the necessary tools are available:

- Check that `gh` CLI is installed and authenticated (`gh auth status`). If not available, stop and ask the user to install and authenticate GitHub CLI first.
- If the workflow uses MCP tools for GitHub operations, verify the MCP server is accessible.

## Procedure

1. **Read contribution rules.** Read `CONTRIBUTING.md` and any package-level instructions (e.g. `packages/*/AGENTS.md`) relevant to the changed files.
2. **Inspect the diff.** Review changed files, scope, and impact. Understand what the change does before writing anything.
3. **Inspect repo conventions.** Check recent branch names (`git branch -r --sort=-committerdate | head -20`), recent commit messages (`git log --oneline -20`), and the PR template.
4. **Pre-submission health checks** (run all before creating the PR):
   - **Unified theme**: All changes should serve one purpose. If unrelated changes are mixed in, ask the user to split or confirm.
   - **Commit hygiene**: Every new commit must follow the repo's conventional commit style. Squash or reword if needed.
   - **Author identity**: Verify `git config user.name` and `git config user.email` are set and the email looks real (not empty, not `noreply` unless intentional). Warn the user if not.
   - **No leftover artifacts**: Check for debug logs, `.only` in tests, conflict markers, or temp files in the diff.
   - **Lint and build**: Run lint/build for the affected area. Record results honestly.
5. **Warn if the PR looks too hasty.** If any of these are true, pause and warn the user before proceeding:
   - Large diff with no description of intent provided
   - Changes touch core lib or extension (where vibe coding is prohibited per `CONTRIBUTING.md`)
   - Multiple unrelated concerns in one diff
   - No validation has been run at all
   - Remind the user: *"This project does not accept low-quality or AI-generated PRs without meaningful human review. Please review your changes carefully."*
6. **Branch.** Check the current branch first:
   - If already on a non-main feature branch with a valid name (matching `type/topic` convention), reuse it.
   - If the branch name does not follow repo conventions (e.g. missing prefix, unclear topic), ask the user whether to rename or create a new one.
   - If on `main` or a default branch, create a new branch from it with a short kebab-case name: prefix (`fix/`, `feat/`, `docs/`, `refactor/`, `chore/`) + concrete topic words.
7. **Stage and commit.** Stage only the intended files. Use `type(scope): subject` format. Keep the subject specific and compact.
8. **Push.** Push with `-u origin HEAD`.
9. **Open PR.** Use `gh pr create` with the full PR template structure. Fill in "What" and "Type" sections based on the actual diff. Leave all "Testing" and "Requirements" checkboxes unchecked.
10. **Report results.** Tell the user: branch name, commit hash, PR link, and what validation actually ran (with pass/fail).

## Post-Submission Reminder

After successfully opening the PR, ALWAYS remind the user:

> **This project requires human authorship declarations.** Please:
> 1. Test your changes in the browser yourself
> 2. Go to the PR page on GitHub and check the Testing and Requirements checkboxes after you've verified each item
> 3. The PR will not enter the review process until all checkboxes are checked
>
> This project does not accept PRs generated autonomously by AI. Make sure you can truthfully check the AI declaration.

## Branch Naming

- Prefer short kebab-case names with a repo-consistent prefix such as `fix/`, `feat/`, `docs/`, `refactor/`, or `chore/`.
- Match the change type first, then the smallest useful topic.
- Prefer concrete topic words over issue text dumps.

## Commit Style

- Use the repository's prevailing commit style (conventional commits).
- Use `type(scope): subject` when scope is clear from the changed area.
- Keep the subject specific and compact.
- If multiple commits exist on the branch, each one must independently follow conventions.

## Validation Strategy

- Default to enough validation to defend the PR, not the absolute minimum.
- Prefer area-specific build, lint, or test commands when they exist.
- Escalate to broader validation when the diff crosses packages, changes shared code, or affects release behavior.
- Never claim checks that did not actually run.
- You MAY note what you ran and the results below the Testing section in the PR body, but do NOT check the template checkboxes.

## Decision Points

- No local changes → stop, say so.
- `gh` CLI not available → stop, ask user to install it.
- Unrelated files mixed → stage only the intended subset or ask whether the work should be split.
- If the repo has area-specific instructions, read them before naming the branch or writing the PR.
- Change is small but high-risk → prefer broader validation.
- Change is narrowly scoped and low-risk → run the most relevant checks, not arbitrary unrelated ones.
- Template has declarations you cannot truthfully check → leave unchecked, tell the user why.

## Completion Checks

- The branch exists remotely and tracks upstream.
- The commit message(s) match repo style.
- All commit authors have proper name and email configured.
- The PR title matches the commit intent.
- The PR body follows the template structure completely.
- All "Requirements" and "Testing" checkboxes are unchecked (`- [ ]`) in the PR body. Double-check: if any `- [x]` appears in these sections, it is a violation — fix it before submitting.
- The reported validation is accurate — nothing fabricated.
- The post-submission reminder has been printed verbatim to the user.
