# Contributing to PageAgent

♥️ We welcome contributions from everyone.

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
    - `macOS` / `Linux` / `WSL`
    - `node.js >= 20` with `npm >= 10`
    - An editor that supports `ts/eslint/prettier`
    - Make sure `eslint`, `prettier` and `commitlint` work well. Un-linted code won't pass the CI.

2. **Setup**

    ```bash
    npm i
    npm start          # Start demo and documentation site
    npm run build      # Build libs and website
    ```

### Project Structure

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

## 🤝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include browser version and environment details

### Code Contributions

1. **Fork and Clone**

    ```bash
    git clone https://github.com/your-username/page-agent.git
    cd page-agent
    ```

2. **Create Feature Branch**

    ```bash
    git checkout -b feat/your-feature-name
    ```

3. **Make Changes**
    - Follow existing code style and patterns
    - Add tests for new functionality
    - Update documentation as needed

4. **Test Your Changes**
    - Build and lint everything.
    - Test in our demo website
    - Test it on other websites if applicable
    - `@TODO: test suite`

5. **Commit and Push**

    ```bash
    git add .
    git commit -m "feat: add awesome feature"
    git push origin feat/your-feature-name
    ```

6. **Create Pull Request**
    - Provide clear description of changes
    - Link related issues
    - Include screenshots for UI changes

## 📝 Code Style

### General Guidelines

- Use TypeScript for type safety
- Follow existing naming conventions
- Write meaningful commit messages
- Keep functions small and focused
- Add JSDoc for public APIs

### Vibe Coding with AI

> [Vibe coding](https://en.wikipedia.org/wiki/Vibe_coding)

- Vibe coding is **RECOMMENDED** when maintaining **the demo, the website, the UI and tests**.
    - We have a [website/AGENTS.md](packages/website/AGENTS.md) for that.
- Vibe coding is **NOT** allowed for the core lib!!!
- NEVER try to vibe coding the MV3 extension!!! It is HELL.
- Review anything AI wrote before make a commit. You are the author of anything you commit. NOT AI.

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

    > @see https://zhulinchng.github.io/page-agent/docs/features/models#ollama for configuration

- **Restart the dev server** to load new env vars
- LLM_MODEL_NAME and LLM_BASE_URL must be set to use the demo

### Extension Development

```bash
# make sure you ran `npm run build:libs` first
# and every time you changed the core libs
npm run dev -w @page-agent/ext
npm run zip -w @page-agent/ext
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

## 🚫 What We Don't Accept

- Breaking changes and large PRs without prior discussion
- Heavy dependencies to core libs
- Contributions without proper testing
- Code that doesn't follow project conventions
- Dependencies or code with licenses incompatible with MIT
- Bot or AI-generated pull requests without meaningful human involvement

## 📄 Legal

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

> CLA is optional.

## 💬 Questions?

- Open a GitHub issue for technical questions
- Check existing documentation and issues first
- Be respectful and constructive in discussions

Thank you for helping make PageAgent better! 🎉
