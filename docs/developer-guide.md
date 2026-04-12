# Developer Guide

This file is for local development workflows.

For contribution rules and expectations, see [../CONTRIBUTING.md](../CONTRIBUTING.md).

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
    - `macOS` / `Linux` / `WSL`
    - `node.js >= 24` with `npm >= 11`
    - An editor that supports `ts/eslint/prettier`
    - Make sure `eslint`, `prettier` and `commitlint` work well. Un-linted code won't pass the CI.

2. **Setup**

    ```bash
    npm i
    npm start          # Start demo and documentation site
    npm run build      # Build libs and website
    ```

## 📦 Project Structure

This is a **monorepo** with npm workspaces containing **4 main packages**:

- **Page Agent** (`packages/page-agent/`) - Main entry with built-in UI Panel, published as `page-agent` on npm
- **Core** (`packages/core/`) - Core agent logic without UI (npm: `@page-agent/core`)
- **Extension** (`packages/extension/`) - Chrome extension for multi-page tasks and browser-level automation
- **Website** (`packages/website/`) - React documentation and landing page. Also as demo and test page for the core lib. private package `@page-agent/website`

> We use a simplified monorepo solution with `native npm-workspace + ts reference + vite alias`. No fancy tooling. Hoisting is required.
>
> - When developing. Use alias so that we don't have to pre-build.
> - When bundling. Use external and disable ts `paths` alias.
> - When bundling `IIFE` and `Website`. Bundle everything together.

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
# make sure you ran `npm run build:libs` first and every time you changed the core libs
npm run dev -w @page-agent/ext
npm run zip -w @page-agent/ext
```

- Update `packages/extension/docs/extension_api.md` for API integration details

### Testing on Other Websites

- Start and serve local `iife` scripts

    ```bash
    npm run dev:demo # Serving IIFE bundles with auto rebuild at http://localhost:5174/
    ```

    This produces both:
    - `http://localhost:5174/page-agent.demo.js` for the auto-start demo bundle
    - `http://localhost:5174/page-agent.js` for the standard CDN bundle that only exposes `window.PageAgent`

- Add a new bookmark

    ```javascript
    javascript:(function(){var s=document.createElement('script');s.src=`http://localhost:5174/page-agent.demo.js?t=${Math.random()}`;s.onload=()=>console.log(%27PageAgent ready!%27);document.head.appendChild(s);})();
    ```

- Click the bookmark on any page to load Page-Agent

> Warning: AK in your local `.env` will be inlined in the iife script. Be very careful when you distribute the script.

### Adding Documentation

Ask an AI to help you add documentation to the `website/` package. Follow the existing style.

> Our AGENTS.md file and guardrails are designed for this purpose. But please be careful and review anything AI generated.
