# Tasks

- [x] Locate the hard-coded panel input `maxlength`
- [x] Add `taskInputMaxLength` to the built-in panel configuration flow
- [x] Raise the default limit from `200` to `1000`
- [x] Normalize invalid values with a panel-side fallback
- [x] Update README example in English
- [x] Update README example in Chinese
- [x] Update the PageAgent docs page example
- [x] Open upstream PR

## Validation

- [x] `npm run build:libs`
- [x] `npm run build:website -w @page-agent/website`
- [x] `npx eslint packages/page-agent/src/PageAgent.ts packages/ui/src/panel/Panel.ts packages/website/src/pages/docs/advanced/page-agent/page.tsx`
- [x] `npx prettier --check README.md docs/README-zh.md packages/page-agent/src/PageAgent.ts packages/ui/src/panel/Panel.ts packages/website/src/pages/docs/advanced/page-agent/page.tsx`
- [ ] `npm run typecheck -w @page-agent/website`
  - currently blocked by an existing workspace `TS6305` output-path issue in `packages/website/src/pages/home/HeroSection.tsx`
