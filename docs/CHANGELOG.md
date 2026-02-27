# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Configuration

```typescript
interface PageAgentConfig {
    // LLM Configuration (required)
    baseURL: string
    apiKey: string
    model: string
    temperature?: number
    maxRetries?: number
    customFetch?: typeof fetch

    // Agent Configuration
    language?: 'en-US' | 'zh-CN'
    maxSteps?: number // default: 20
    customTools?: Record<string, PageAgentTool> // experimental
    instructions?: InstructionsConfig
    transformPageContent?: (content: string) => string | Promise<string>
    experimentalScriptExecutionTool?: boolean // default: false

    // Lifecycle Hooks (experimental)
    onBeforeTask?: (agent, result) => void
    onAfterTask?: (agent, result) => void
    onBeforeStep?: (agent, stepCount) => void
    onAfterStep?: (agent, history) => void
    onDispose?: (agent, reason?) => void

    // Page Controller Configuration
    enableMask?: boolean // default: true
    viewportExpansion?: number
    interactiveBlacklist?: Element[]
    interactiveWhitelist?: Element[]
}
```

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
