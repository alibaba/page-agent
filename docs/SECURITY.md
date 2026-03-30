# Security Policy

## Supported Versions

We provide security fixes on a best-effort basis for:

| Version                                                   | Supported |
| --------------------------------------------------------- | --------- |
| `main`                                                    | Yes       |
| Latest npm release of `page-agent` and workspace packages | Yes       |
| Older releases                                            | No        |

Please upgrade to the latest release before reporting an issue against an older build.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

Use GitHub's private vulnerability reporting flow:

- Open https://github.com/alibaba/page-agent/security/policy
- Click `Report a vulnerability`

If private reporting is unavailable, open a minimal public issue only to request a private contact channel. Do not include exploit details.

## What to Include

- Affected package or feature
- Exact version, commit, or build
- Browser, OS, and runtime environment
- Reproduction steps or a proof of concept
- Expected impact

## Scope

We prioritize reports that show a real security boundary failure, such as:

- Unauthorized access to data, tokens, or extension capabilities
- Bypassing explicit safety constraints
- Sensitive data exposure caused by default behavior

The following usually do not qualify by themselves:

- Unsafe custom integrations that ignore documented safeguards
- Intentionally embedding secrets into client-side builds
- Reports against unsupported older versions

## Disclosure

Please avoid public disclosure until maintainers have had a reasonable chance to investigate and ship a fix.
