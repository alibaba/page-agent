# Developer Guide

This file is for local development workflows.

For contribution rules and expectations, see [../CONTRIBUTING.md](../CONTRIBUTING.md).

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
    - `macOS` / `Linux` / `WSL`
    - `node.js ^22.13 || >=24` with `npm >= 11`
    - An editor that supports `ts/eslint/prettier`
    - Make sure `eslint`, `prettier` and `commitlint` work well. Un-linted code won't pass the CI.

2. **Setup**

    ```bash
    npm i            # Or `npm ci` if you don't want to change the lockfile
    npm start        # Start website dev server
    npm run build    # Build everything
    ```

## 📦 Project Structure

This is a **monorepo** with npm workspaces.

Published packages:

- **Page Agent** (`packages/page-agent/`) - Main entry with built-in UI Panel (npm: `page-agent`)
- **MCP** (`packages/mcp/`) - MCP server for browser control via Page Agent extension (npm: `@page-agent/mcp`)
- **Core** (`packages/core/`) - Core agent logic without UI (npm: `@page-agent/core`)
- **LLMs** (`packages/llms/`) - LLM client with reflection-before-action mental model
- **Page Controller** (`packages/page-controller/`) - DOM operations and visual feedback, independent of LLM
- **UI** (`packages/ui/`) - Panel and i18n, decoupled from PageAgent

Applications:

- **Extension** (`packages/extension/`) - Browser extension (WXT + React)
- **Website** (`packages/website/`) - React docs, landing page, and dev playground (private)

> Source-first monorepo with `npm workspaces + ts references + vite alias`. Library `package.json` exports point to `src/*.ts` during development, and point to `dist/*.js` when published. `workspaces` in root `package.json` must be in topological order.

## 🤖 AGENTS.md Alias

If your AI assistant does not support [AGENTS.md](https://agents.md/). Add an alias for it:

- claude-code (`CLAUDE.md`)

    ```markdown
    @AGENTS.md
    ```

- antigravity (`.agent/rules/alias.md`)

    ```markdown
    ---
    trigger: always_on
    ---

    @../../AGENTS.md
    ```

## 🔧 Development Workflows

### Test With Your Own LLM API

- Create a `.env` file in the repo root with your LLM API config

    ```env
    LLM_MODEL_NAME=gpt-5.2
    LLM_API_KEY=your-api-key
    LLM_BASE_URL=https://api.your-llm-provider.com/v1
    ```

- **Ollama example** (tested on 0.15 + qwen3:14b, RTX3090 24GB):

    ```env
    LLM_BASE_URL="http://localhost:11434/v1"
    LLM_API_KEY="NA"
    LLM_MODEL_NAME="qwen3:14b"
    ```

    > @see https://alibaba.github.io/page-agent/docs/features/models#ollama for configuration

- **Restart the dev server** to load new env vars
- If not provided, the demo will use the free testing proxy by default. By using it, you agree to its [terms](./terms-and-privacy.md).

### Extension Development

```bash
npm run dev:ext
npm run build:ext
```

- Update `packages/extension/docs/extension_api.md` for API integration details

### Testing on Other Websites

- Start and serve a local `iife` script

    ```bash
    npm run dev:demo # Serving IIFE with auto rebuild at http://localhost:5174/page-agent.demo.js
    ```

- Add a new bookmark

    ```javascript
    javascript:(function(){var s=document.createElement('script');s.src=`http://localhost:5174/page-agent.demo.js?t=${Math.random()}`;s.onload=()=>console.log(%27PageAgent ready!%27);document.head.appendChild(s);})();
    ```

- Click the bookmark on any page to load Page-Agent

> Warning: AK in your local `.env` will be inlined in the iife script. Be very careful when you distribute the script.

### Adding Documentation

Ask an AI to help you add documentation to the `website/` package. Follow the existing style.

> Our AGENTS.md file and guardrails are designed for this purpose. But please be careful and review anything AI generated.
