# Panel Input Config

## Purpose

This document records stable knowledge about the built-in PageAgent panel input behavior.

## Current Behavior

- The built-in panel task input now supports a configurable `taskInputMaxLength` option.
- `taskInputMaxLength` is part of the public `PageAgentConfig` surface through `PageAgent`.
- The option is forwarded from `PageAgent` to `PanelConfig`, then applied to the runtime `<input maxlength="...">`.
- Invalid values are normalized inside `Panel`:
  - non-number values fall back to the default
  - non-finite values fall back to the default
  - values lower than `1` fall back to the default
  - fractional values are floored to an integer

## Default

- Default panel task input limit: `1000`
- Previous hard-coded limit before this change: `200`

## Scope Boundary

- This option only affects the built-in PageAgent panel UI.
- It does not change `PageAgentCore`, prompt truncation, LLM token limits, or DOM extraction behavior.
- Headless integrations that do not use the built-in panel are unaffected.

## Source Files

- `packages/ui/src/panel/Panel.ts`
- `packages/page-agent/src/PageAgent.ts`
- `README.md`
- `docs/README-zh.md`
- `packages/website/src/pages/docs/advanced/page-agent/page.tsx`
