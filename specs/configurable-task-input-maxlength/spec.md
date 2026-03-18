# Configurable Task Input Max Length

## Goal

Allow consumers of `PageAgent` to configure the built-in panel task input limit, while raising the default limit to a more practical value.

## Why

- Issue: `alibaba/page-agent#291`
- User feedback: the built-in `maxlength=200` is too restrictive for real tasks.
- The old behavior was hard-coded in the UI layer and could not be adjusted by integrators.

## Requirements

- Expose a public `taskInputMaxLength` option through `PageAgentConfig`.
- Keep the option scoped to the built-in panel UI instead of `PageAgentCore`.
- Raise the default limit from `200` to `1000`.
- Guard against invalid runtime values with a safe fallback.
- Update public docs and examples where `PageAgent` config is shown.

## Acceptance

- `Panel` no longer hard-codes `maxlength="200"`.
- `PageAgent` forwards `taskInputMaxLength` into `Panel`.
- English and Chinese README examples show the new option.
- PageAgent docs mention the new option in the config example.
- Libraries build successfully after the change.

## Current Status

- PR: `https://github.com/alibaba/page-agent/pull/292`
- Branch: `fix/configurable-input-maxlength`
- Latest implementation commit when this spec was added: `f30917f`
