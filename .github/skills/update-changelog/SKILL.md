---
name: update-changelog
description: 'Update docs/CHANGELOG.md from git history, GitHub releases, and code diffs. Use when: writing release notes, syncing the latest changelog entry, summarizing a new tag, or keeping changelog wording concise and consistent.'
argument-hint: 'Describe the target, for example: latest version only'
---

# Update Changelog

Update `docs/CHANGELOG.md` from repository evidence instead of guesswork.

## When to Use

- Add the newest release entry to `docs/CHANGELOG.md`
- Sync changelog text with GitHub Releases
- Summarize the latest tag from git history or code diffs

## Defaults

- Keep the wording brief
- Only add the latest missing version unless the user explicitly asks to backfill older releases
- Prefer GitHub sources first, especially Releases and tag metadata
- Skip `Features` / `Improvements` / `Bug Fixes` headings when the release only has a few clear items

## Procedure

### 1. Read the local style

- Open `docs/CHANGELOG.md`
- Match the existing tone, bullet style, section ordering, and date format

### 2. Determine the target release

- Read the root `package.json` version and compare it with the top changelog entry
- Find the previous tag for the target version
- If the latest version is already documented, stop and report that no changelog update is needed

### 3. Gather evidence

Prefer these sources in order:

1. GitHub release notes

```bash
GH_PAGER=cat gh release view v<version> --repo <owner>/<repo> --json tagName,name,publishedAt,body
```

2. Tag date

```bash
git log -1 --format=%cs v<version>
```

3. Commit history between tags

```bash
git --no-pager log --format='%h %s' --no-merges v<previous>..v<version>
```

4. Diff scope when commit subjects are vague

```bash
git --no-pager diff --name-only v<previous>..v<version>
git --no-pager diff --stat v<previous>..v<version>
```

5. Read touched files directly only when the user-visible change is still unclear

### 4. Distill what belongs in the changelog

Include:

- User-visible features
- Important behavior changes
- Bug fixes that improve reliability, compatibility, or developer experience
- Small docs updates only when they materially change supported setups or onboarding

Exclude unless explicitly requested:

- Pure version bumps
- Routine dependency updates
- Internal refactors with no visible impact
- Mechanical formatting noise

### 5. Choose the structure

- If the release has 1 to 3 clear points, write flat bullets directly under the version heading
- If the release has several distinct items, use short headings such as `### Features`, `### Improvements`, and `### Bug Fixes`
- Do not force categories when they make the entry longer or noisier

### 6. Write the entry

- Add or update only the requested release entry
- Keep bullets short and concrete
- Reuse project terminology from nearby entries
- Avoid marketing language
- Do not copy noisy GitHub release text verbatim

### 7. Verify

- Check dates, version numbers, and tag boundaries
- Ensure Markdown structure matches nearby entries
- Confirm no intermediate versions were added unless requested

## Completion Checks

- The newest requested version is documented
- The wording is concise and consistent with the surrounding changelog
- The entry is backed by GitHub releases, git history, or code diff evidence
- Low-signal internal changes were left out
