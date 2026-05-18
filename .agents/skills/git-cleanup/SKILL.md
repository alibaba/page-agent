---
name: git-cleanup
description: Clean up local git branches and remotes accumulated from PR reviews. Use when the user asks to clean branches, remove stale remotes, or tidy up the local git state.
---

# Git Cleanup

Clean local branches (except `main` and current branch) and non-origin remotes.
Useful after reviewing multiple PRs that leave behind tracking branches and contributor remotes.

## Workflow

### 1. Survey

Run these in parallel:

```bash
git branch
git remote
git status --short
git stash list
```

Present a summary of how many branches and remotes will be removed.

### 2. Safety Checks — Ask Before Proceeding

**Stop and ask for confirmation if any of these are true:**

- Current branch is NOT `main`
- Working tree has uncommitted changes or stashes
- Any branch is ahead of its upstream

List unmerged branches separately and let the user decide.

### 3. Delete Branches

```bash
# Safe delete first (fails on unmerged branches)
git branch | grep -v '^\*' | grep -v '^\s*main$' | xargs git branch -d 2>&1

# Force-delete only with explicit user approval
git branch -D <branch>
```

### 4. Remove Remotes

```bash
git remote | grep -v '^origin$' | xargs -I{} git remote remove {}
```

### 5. Confirm

```bash
git branch && echo "---" && git remote
```

Report what was cleaned up.

## Key Rules

- **NEVER** delete `main` or the current checked-out branch
- **NEVER** force-delete unmerged branches without user confirmation
- If in doubt, ask
