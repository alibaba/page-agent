# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
