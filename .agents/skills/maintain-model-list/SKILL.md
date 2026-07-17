---
name: maintain-model-list
description: 'Maintain the supported LLM model list: add a new model, or run routine maintenance to verify availability and discover new models worth adding. Use when the user asks to add/support a model, update the model list, or check model availability.'
argument-hint: 'A model name to add (e.g. "gpt-5.7"), or empty for routine maintenance'
---

# Maintain Model List

The supported model list lives in three places that must stay in sync:

| File                                                       | What it holds                                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `packages/website/src/pages/docs/features/models/page.tsx` | `MODEL_GROUPS` (public docs, source of truth for display names) and `BASELINE` (recommended models)             |
| `packages/llms/src/models.live.test.ts`                    | Mirrored `MODEL_GROUPS`, plus `OPENROUTER_ID_OVERRIDES` / `ALIYUN_ID_OVERRIDES` for provider-specific model ids |
| `packages/llms/src/utils.ts`                               | `modelPatch` — per-model-family request parameter fixes (thinking/reasoning flags, `tool_choice` quirks, etc.)  |

## Before Touching Anything

1. Run `git status`. If the working tree has uncommitted changes that look like unrelated in-progress work, do NOT edit files — report the situation and ask the user for permission first.
2. Run the full live test suite as a baseline: `npm run test:live -w @page-agent/llms`. API keys come from the repo-root `.env` (`TESTING_OPENROUTER_KEY`, `TESTING_ALIYUN_KEY`, `TESTING_DEEPSEEK_KEY`); tests skip silently when a key is missing, so check which providers actually ran. Record which models pass/fail before making changes, so new failures are attributable.

## Workflow A: A Specific Model Was Given

1. **Research the model** (web search + provider docs):
    - Is it served on OpenRouter? Fetch `https://openrouter.ai/api/v1/models` and find the exact id (`<vendor-slug>/<model-id>`, watch for `-preview`, dated snapshots, dots vs hyphens).
    - Which other channels serve it (vendor native API, Aliyun DashScope, etc.) and what are their native model ids?
    - API differences: can thinking/reasoning be disabled or minimized? Any `tool_choice`, `parallel_tool_calls`, or parameter-schema quirks? Does the vendor's OpenAI-compatible endpoint differ from OpenRouter's behavior?
    - Agent suitability: tool call support is mandatory; note context window, latency, and cost.
2. **Update `modelPatch`** in `packages/llms/src/utils.ts` if the model needs new parameter handling. Model names are matched after `normalizeModelName` (lowercased, `/`-prefix, `.` and `_` stripped) — check whether an existing family branch already covers it.
3. **Add the model to both `MODEL_GROUPS` lists** (website page and live test), newest first within its brand group. Add id overrides if the OpenRouter/Aliyun id differs from the display name.
4. **Test availability carefully.** Run the live suite and confirm the new model passes on every provider that serves it:

```bash
npm run test:live -w @page-agent/llms
```

A failure means the request/response shape is wrong for that model — fix `modelPatch` or the id override, don't shrug it off. If the model fails consistently on a provider, exclude it from that provider (see the `deepseek-3.2` precedent in the test file) and document why in a comment. 5. **Decide on `BASELINE`** only if the model is a fast, cheap, strong-tool-call option; otherwise leave it out. 6. Run `npm run typecheck` and `npm test`.

## Workflow B: No Model Given (Routine Maintenance)

1. **Verify the existing list**: run the live suite (see above). Investigate any model that newly fails — deprecated? renamed? provider dropped it?
2. **Check for drift**: re-verify `OPENROUTER_ID_OVERRIDES` against the current `https://openrouter.ai/api/v1/models` output; ids change when vendors promote previews to stable.
3. **Scan for new models** worth adding (web search for recent releases from the brands in `MODEL_GROUPS`, plus notable newcomers). A candidate must support tool calls via an OpenAI-compatible API.
4. **Act by significance**:
    - Minor updates (a preview id went stable, a small point-release replaces its predecessor): apply the change yourself following Workflow A steps 2–6, then present it to the user for judgment.
    - New models or removals: report findings and recommendations, let the user decide before editing.

## Hand Off to the User

After your own tests pass, always remind the user to verify manually:

1. Tell them which line to put in the repo-root `.env` — give the exact model id per channel, including the OpenRouter id, e.g.:

```bash
LLM_BASE_URL="https://openrouter.ai/api/v1"
LLM_API_KEY="..."
LLM_MODEL_NAME="<exact-openrouter-id>"
```

2. Tell them to run the demo themselves: `npm run dev:demo` (serves on port 5174) and exercise the agent against a real page.

The live test only proves a single forced tool call round-trips; it is not an agent-quality eval. The user's manual run is the real acceptance test.
