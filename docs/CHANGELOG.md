# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.11.0] - 2026-07-03

### Features

- **LLM model patching rework** - Rewrote per-model request patching for GPT, Claude, Qwen, Gemini, and DeepSeek, and refreshed the recommended model list.

### Improvements

- **Deprecate `LLMConfig.temperature`** - Warn when set; use `transformRequestBody` for models that still accept it.
- **Extension limitations docs** - Added a limitations section to extension documentation.

### Bug Fixes

- **Multi-window extension tabs** - Resolved the active tab/window from the caller's window context instead of the global active tab.
- **chat-latest model compatibility** - Skip `reasoning_effort` and `temperature` patches for `*-chat-latest` models.
- **OpenRouter defaults** - Do not enable reasoning by default on OpenRouter.
- **Asset URLs** - Migrated `img.alicdn.com` links to `page-agent.github.io`.

## [1.10.0] - 2026-06-15

### Breaking Changes

- **Agent run lifecycle rework** - `stop()` is now async and resolves only after the run fully settles. Run status is decoupled from task outcome: a new `stopped` state was added, and LLM self-reported failures now end as `completed`. Lifecycle hooks re-throw instead of folding errors into the result, agent errors are recorded in history, and `agent.lastResult` was added.

### Features

- **Abortable JavaScript execution** - `execute_javascript` now honors the `AbortSignal`.
- **Leaner agent prompts** - Simplified the waiting-response flow and removed navigation-back instructions to reduce LLM cognitive load.
- **MultiPageAgent safety** - Disabled `ScriptExecutionTool` for `MultiPageAgent`.

### Improvements

- **Dark mode detection** - Refined detection heuristics and made `isMainContentDark` less aggressive by checking `html` and `body` data attributes independently.
- **Extension lifecycle robustness** - Drove heartbeat and running state from status changes, cleared stale activity on any non-running status, handled the stopped lifecycle state, and cleared `currentTabId` on `TabsController.init`.

### Bug Fixes

- **Accurate wait reporting** - Wait steps now report the actual wait duration.
- **Scroll predicates** - Scroll predicates now return booleans.
- **Docs** - Fixed the broken demo video on GitHub.

## [1.9.0] - 2026-06-08

### Features

- **Robust abort handling** - Rewrote the aborting system; sync tools, loop execution, and LLM clients now correctly respect task abort signals (`ctx.signal`). Also decoupled `AbortError` from `InvokeError` in `@page-agent/llms`.
- **Claude Opus 4.8 support** - Added support for Claude Opus 4.8 model.

### Improvements

- **Concurrency guard** - Prevented concurrent `execute()` calls on a single PageAgent/Core instance to avoid race conditions.
- **Model recommendations refresh** - Updated default and tested model list recommendations.
- **Test coverage** - Added comprehensive Vitest unit tests for the `@page-agent/llms` package.
- **Improved documentation** - Added website documentation for the `ctx.signal` abort contract and `execute()` concurrency rules.

### Bug Fixes

- **DTS bundle fix** - Fixed a packaging bug where global type declarations were incorrectly bundled into `.d.ts` outputs.
- **Website sidebar fix** - Normalized trailing slashes in the website's sidebar location comparison.

## [1.8.2] - 2026-05-11

### Features

- **IIFE demo control** - Added `showPanel` and `autoInit` switches to the IIFE CDN script to control whether the UI panel automatically displays or initializes on load.

### Improvements

- **Build toolchain modernization** - Upgraded build infrastructure to Vite 8.

### Bug Fixes

- **TypeScript `InvokeErrorType` fix** - Separated the value and type space for `InvokeErrorType` to resolve TypeScript compilation issues.
- **Website chunking fix** - Restored working code-splitting with `manualChunks` for the documentation website.

## [1.8.1] - 2026-04-27

### Features

- **GPT-5.4 & Qwen 3.6 support** - Added support for `gpt-5.4` and `qwen3.6-max/flash` in the recommended LLM list.
- **Custom LLM request hook** - Added a `transformRequestBody` hook to allow custom modification of payloads before sending requests to LLM providers.

### Improvements

- **Accessibility (a11y) enhancements** - Added descriptive accessible labels to `ConfigPanel` input fields and icon buttons in compliance with WCAG 4.1.2.
- **UI polish** - Improved `HistoryList` loading and empty states, and added helpful tooltips for actions.
- **Prompt caching guidance** - Added website documentation for prompt caching optimization.
- **Build speedups** - Added parallel build scripts to accelerate local development compilation.

### Bug Fixes

- **DeepSeek tool choice fix** - Disabled explicit `tool_choice` for DeepSeek models to avoid API compatibility errors.
- **MCP version advertising** - MCP server now correctly advertises its package version.

## [1.8.0] - 2026-04-15

### Breaking Changes

- **TypeScript 6 & ESLint 10 upgrade** - Major toolchain modernization. Upgraded the entire monorepo to TypeScript 6 and ESLint 10 with source-first monorepo resolution (library exports resolve to source files directly during local development).

### Improvements

- **MCP security hardening** - Bound the MCP HTTP + WebSocket server to `localhost` only.
- **Extension UI refinement** - Made the history panel height responsive to the viewport and improved the result card readability by increasing font size.

### Bug Fixes

- **SimulatorMask memory leak** - Fixed a memory leak by ensuring the `requestAnimationFrame` loop is cancelled when disposing the SimulatorMask.
- **Autofixer format fix** - Corrected the fallback action format for `autoFixer` when waiting.
- **IIFE scope protection** - Fixed a name collision in IIFE builds by preventing global helper function re-declarations.

## [1.7.1] - 2026-04-04

### Features

- **Optional `keepSemanticTags`** - Added an experimental `keepSemanticTags` config to preserve semantic structure in PageController output
- **Per-task extension system instructions** - Extension `ExecuteConfig` now supports `systemInstruction`

### Improvements

- **Smarter scroll handling** - Scroll container detection and scroll direction handling are more reliable
- **Better accessibility-aware element detection** - Interactive candidates with supported ARIA attributes and `role="listitem"` are recognized more accurately

### Bug Fixes

- Fixed iframe-origin filtering for extension `postMessage` listeners
- Avoided a `currentScript` null pointer during deferred initialization

## [1.7.0] - 2026-03-31

- **More reliable click actions** - Click handling now reuses pointer coordinates, verifies targets with `elementFromPoint`, and behaves better on layered layouts
- **Better mask event handling** - `SimulatorMask` now supports passthrough events when automation should not fully swallow input
- Fixed a `SimulatorMask` memory leak

## [1.6.3] - 2026-03-30

### Features

- **Experimental all-tabs control** - Extension can include and control all browser tabs via `experimentalIncludeAllTabs`

### Improvements

- **Calmer empty state motion** - Disabled the EmptyState auto-start animation in the extension UI
- **Cleaner extension docs** - Simplified setup and tab-control documentation across the README and developer guide

### Bug Fixes

- Fixed new-tab detection from content scripts
- Fixed tab deduplication and multi-window handling in the extension

## [1.6.2] - 2026-03-25

- **Longer task input** - The UI task input now accepts up to 1000 characters
- **Contributor docs refresh** - Added a maintainer note and refreshed contributor-facing documentation
- Fixed lint issues in the release pipeline

## [1.6.1] - 2026-03-22

- **Internal PageController action exports** - PageController actions are now exposed as internal methods for easier reuse across packages
- **Expanded docs** - Added MCP docs and clarified project limitations and homepage details

## [1.6.0] - 2026-03-21

### Features

- **Beta MCP support** - New `@page-agent/mcp` package lets MCP clients such as Claude Desktop and Copilot control the browser through the Page Agent extension
- **Better iframe handling** - Same-origin iframe elements are handled more reliably during DOM extraction and actions
- **Extension history workflows** - Users can rerun past tasks, export history sessions as JSON, and approve MCP-triggered tasks before execution

### Improvements

- **Unified versioning across packages** - The extension now follows the root workspace version. Changelog entries are no longer split into a separate extension version section
- **Configurable `stepDelay`** - Agent pacing between steps is now configurable via `stepDelay`
- **Optional API key** - `apiKey` can now be omitted for compatible deployments that do not require one
- **Optional named tool choice** - Tool invocation can disable named tool choice for providers that behave better without it
- **Better rich-text input support** - Improved `contenteditable` handling with better event dispatching and `execCommand` fallback for more editors
- **More flexible DOM extraction** - `includeAttributes` now supports wildcards, `contenteditable` is included by default, and heuristically interactive elements expose more useful attributes
- **MiniMax model support** - Added MiniMax compatibility, with the default recommendation updated to `MiniMax-M2.7`

### Bug Fixes

- Fixed Safari issues when `requestIdleCallback` is unavailable
- Avoid throwing when `webgl2` initialization fails
- Improved OpenAI-compatible request patches for GPT-5.4 chat tools and MiniMax temperature/tool-call compatibility
- Fixed several UI polish issues in the extension and website, including cursor and layout regressions

## [1.5.1] - 2026-03-05

### Breaking Changes

- **`data-browser-use-ignore` → `data-page-agent-ignore`** - DOM ignore attribute renamed to match the project identity
- **Config types restructured** - `PageAgentConfig` split into `AgentConfig` + `PageAgentCoreConfig`; config definitions moved from `config/index.ts` to `types.ts`
- **Zod v3/v4 dual support** - Libraries now accept both `zod@^3.25` and `zod@^4.0` as peer dependencies

### Features

- **Experimental `llms.txt` support** - Agent can fetch and include a site's `llms.txt` in context. Enable via `experimentalLlmsTxt: true`

### Improvements

- Default `maxSteps` changed from 20 to 40 for better for complex tasks out of the box
- Added 400ms wait between agent steps for page reactions
- Increased click wait time (100ms → 200ms) for more reliable interactions
- Removed debug `console.log` statements from scroll actions
- Reset observations on new task start
- Improved logging across packages

### Extension v0.1.9

> PageAgent 1.5.1

- **Advanced config panel** - New collapsible section exposing Max Steps, System Instruction, and experimental `llms.txt` toggle
- Streamlined User Auth Token description
- Moved testing API notice below auth token section

---

## [1.4.0] - 2026-02-27

### Features

- Update Terms of Use and Privacy Policy
- **Robust tool-call validation** - Action inputs are now validated against tool schemas individually, producing clear error messages (e.g. `Invalid input for action "click_element_by_index"`) instead of unreadable union parse errors
- **Primitive action input coercion** - Small models that output `{"click_element_by_index": 2}` instead of `{"click_element_by_index": {"index": 2}}` are now auto-corrected using tool schemas
- **Qwen model updates** - Added `qwen3.5-plus` as the default free testing model; disabled `enable_thinking` for Qwen models to avoid incompatible responses
- **Updated default LLM endpoint** - Migrated demo and extension to a new testing endpoint with legacy endpoint auto-migration

### Improvements

- Unified zod imports (`* as z`) across all packages for consistency
- Better Zod error formatting with `z.prettifyError()` in LLM client
- Exported `InvokeError` and `InvokeErrorType` as values (not just types) from `@page-agent/llms`
- Exported `SupportedLanguage` type from `@page-agent/core`

### Extension v0.1.8

- **Language setting** - Added language selector (System / English / 中文) in config panel
- **UI makeover** - New empty state with breathing glow and typing animation; ai-motion glow overlay while running; refined focus styles
- **Testing endpoint notice** - Shows terms of use notice when using the free testing API
- **Legacy endpoint migration** - Auto-migrates old Supabase testing endpoint to new endpoint on startup

---

## [1.3.0] - 2026-02-13

### Breaking Changes

- **Lifecycle: `stop()` vs `dispose()`** - New `stop()` method to cancel the current task while keeping the agent reusable. `dispose()` is now terminal — a disposed agent cannot be reused. This affects both `PageAgentCore` and `PanelAgentAdapter`.

### Features

- **Panel action button** - The panel button now morphs between Stop (■) and Close (X) based on agent status
- **Error history** - Errors and max-step failures are now recorded in `history` as `AgentErrorEvent`, making post-task analysis more complete

### Bug Fixes

- **AbortError handling** - `AbortError` is no longer retried by the LLM client, and shows a clean "Task stopped" message instead of a raw error stack

---

## [1.2.0] - 2026-02-11

### Features

- **Observe Phase** - Agent now observes the page before each action, improving decision accuracy on dynamic pages
- **Better Abort Handling** - Improved `abortSignal` support for cleaner task cancellation

### Improvements

- Pruned system prompts for lower token usage and faster responses
- Improved error handling during agent steps with better error messages
- Zod tree-shaking for smaller bundle size

### Bug Fixes

- Fixed indentation lost in DOM extraction caused by `trimLines`
- Fixed `gpt-5-mini` temperature configuration

---

## [1.1.0] - 2026-02-02

### Features

- **Custom System Prompt** - New `systemPrompt` config option to customize or extend the default system prompt
- **Chrome Extension** - Extension with multi-tab control, main-world API with token auth, and tab lifecycle management

### Improvements

- Renamed `include_attributes` to `includeAttributes` in PageController config (camelCase consistency)
- Lazy-loaded mask module for faster initialization
- Better date formatting and error messages from LLM client
- Added `rawRequest` to step history for easier debugging

### Bug Fixes

- Fixed CSP errors by using local SVGs for cursor mask instead of inline styles
- Fixed `AbortError` being incorrectly retried and shown to users
- Fixed mask not working correctly when starting a new task after stopping a previous one

---

## [1.0.0] - 2026-01-19

### 🎉 First Stable Release

PageAgent is now ready for production use. The API is stable and breaking changes will follow semantic versioning.

### Features

#### Core

- **PageAgent** - Main entry class with built-in UI Panel
- **PageAgentCore** - Headless agent class for custom UI or programmatic use
- **DOM Analysis** - Text-based DOM extraction with high-intensity dehydration
- **LLM Support** - Works with OpenAI, Claude, DeepSeek, Qwen, and other OpenAI-compatible APIs
- **Tool System** - Built-in tools for click, input, scroll, select, and more
- **Custom Tools** - Extend agent capabilities with your own tools (experimental)
- **Lifecycle Hooks** - Hook into agent execution (experimental)
- **Instructions System** - System-level and page-level instructions to guide agent behavior
- **Data Masking** - Transform page content before sending to LLM

#### Page Controller

- **Element Interactions** - Click, input text, select options, scroll
- **Visual Mask** - Blocks user interaction during automation
- **DOM Tree Extraction** - Efficient page structure extraction for LLM consumption

#### UI

- **Interactive Panel** - Real-time task progress and agent thinking display
- **Ask User Tool** - Agent can ask users for clarification
- **i18n Support** - English and Chinese localization

### Packages

| Package                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `page-agent`                  | Main entry with UI Panel           |
| `@page-agent/core`            | Core agent logic without UI        |
| `@page-agent/llms`            | LLM client with retry logic        |
| `@page-agent/page-controller` | DOM operations and visual feedback |
| `@page-agent/ui`              | Panel and i18n                     |

### Known Limitations

- Single-page application only (cannot navigate across pages)
- No visual recognition (relies on DOM structure)
- Limited interaction support (no hover, drag-drop, canvas operations)
- See [Limitations](https://alibaba.github.io/page-agent/docs/introduction/limitations) for details

### Acknowledgments

This project builds upon the excellent work of [browser-use](https://github.com/browser-use/browser-use). DOM processing components and prompts are adapted from browser-use (MIT License).
