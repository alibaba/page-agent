# Instructions for Coding Assistants

## Project Overview

This is a **monorepo** with npm workspaces:

- **Page Agent** (`packages/page-agent/`) - Main entry with built-in UI Panel, published as `page-agent` on npm
- **Extension** (`packages/extension/`) - Browser extension (WXT + React) 🚧 WIP
- **Website** (`packages/website/`) - React docs and landing page. **When working on website, follow `packages/website/AGENTS.md`**

Internal packages:

- **Core** (`packages/core/`) - PageAgentCore without UI (npm: `@page-agent/core`)
- **LLMs** (`packages/llms/`) - LLM client with reflection-before-action mental model
- **Page Controller** (`packages/page-controller/`) - DOM operations and visual feedback (SimulatorMask), independent of LLM
- **UI** (`packages/ui/`) - Panel and i18n. Decoupled from PageAgent

## Development Commands

```bash
npm start                    # Start website dev server
npm run build                # Build all packages
npm run build:libs           # Build all libraries
npm run lint                 # ESLint with TypeScript strict rules
npm run zip -w @page-agent/ext # Zip the extension package
```

## Architecture

### Monorepo Structure

Simple monorepo solution: TypeScript references + Vite aliases. Update tsconfig and vite config when adding/removing packages.

```
packages/
├── core/                    # npm: "@page-agent/core" ⭐ Core agent logic (headless)
├── page-agent/              # npm: "page-agent" entry class (with UI + controller + demo builds)
├── website/                 # @page-agent/website (private)
├── llms/                    # @page-agent/llms
├── extension/               # Browser extension (WXT + React)
├── page-controller/         # @page-agent/page-controller
└── ui/                      # @page-agent/ui
```

`workspaces` in `package.json` must be in topological order.

### Module Boundaries

- **Page Agent**: Main entry with UI. Extends PageAgentCore and adds Panel. Imports from `@page-agent/core`, `@page-agent/ui`
- **Core**: PageAgentCore without UI. Imports from `@page-agent/llms`, `@page-agent/page-controller`
- **LLMs**: LLM client with MacroToolInput contract. No dependency on page-agent
- **UI**: Panel and i18n. Decoupled from PageAgent via PanelAgentAdapter interface
- **Page Controller**: DOM operations with optional visual feedback (SimulatorMask). No LLM dependency. Enable mask via `enableMask: true` config

### PageController ↔ PageAgent Communication

All communication is async and isolated:

```typescript
// PageAgent delegates DOM operations to PageController
await this.pageController.updateTree()
await this.pageController.clickElement(index)
await this.pageController.inputText(index, text)
await this.pageController.scroll({ down: true, numPages: 1 })

// PageController exposes state via async methods
const simplifiedHTML = await this.pageController.getSimplifiedHTML()
const pageInfo = await this.pageController.getPageInfo()
```

### DOM Pipeline

1. **DOM Extraction**: Live DOM → `FlatDomTree` via `page-controller/src/dom/dom_tree/`
2. **Dehydration**: DOM tree → simplified text for LLM
3. **LLM Processing**: AI returns action plans (page-agent)
4. **Indexed Operations**: PageAgent calls PageController by element index

## Key Files Reference

### Page Agent (`packages/page-agent/`)

| File               | Description                                  |
| ------------------ | -------------------------------------------- |
| `src/PageAgent.ts` | ⭐ Main class with UI, extends PageAgentCore |
| `src/demo.ts`      | IIFE demo entry (auto-init with demo API)    |

### Core (`packages/core/`)

| File                   | Description                             |
| ---------------------- | --------------------------------------- |
| `src/PageAgentCore.ts` | ⭐ Core agent class without UI          |
| `src/tools/`           | Tool definitions calling PageController |
| `src/config/`          | Configuration types and constants       |
| `src/prompts/`         | System prompt templates                 |

### LLMs (`packages/llms/`)

| File                  | Description                           |
| --------------------- | ------------------------------------- |
| `src/index.ts`        | ⭐ LLM class with retry logic         |
| `src/types.ts`        | MacroToolInput, AgentBrain, LLMConfig |
| `src/OpenAIClient.ts` | OpenAI-compatible client              |

### Page Controller (`packages/page-controller/`)

| File                        | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `src/PageController.ts`     | ⭐ Main controller class with optional mask support        |
| `src/SimulatorMask.ts`      | Visual overlay blocking user interaction during automation |
| `src/actions.ts`            | Element interactions (click, input, scroll)                |
| `src/dom/dom_tree/index.js` | Core DOM extraction engine                                 |

## Adding New Features

### New Agent Tool

1. Implement in `packages/core/src/tools/index.ts`
2. If tool needs DOM ops, add method to PageController first
3. Tool calls `this.pageController.methodName()` for DOM interactions

### New PageController Action

1. Add implementation in `packages/page-controller/src/actions.ts`
2. Expose via async method in `PageController.ts`
3. Export from `packages/page-controller/src/index.ts`

## Code Standards

- Explicit typing for exported/public APIs
- ESLint relaxes some unsafe rules for rapid iteration
- Every change you make should not only implement the desired functionality but also improve the quality of the codebase
- All code and comments must be in English.
- Do not try to hide errors or risks. They are valuable feedbacks for developers and users. Make them visible and actionable.
- Traceability and predictability is more important than success rate.
