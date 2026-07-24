# PageOS

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://equalbyte.github.io/agentic-page/assets/readme/banner-dark.png">
  <img alt="PageOS Banner" src="https://equalbyte.github.io/agentic-page/assets/readme/banner-light.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-os)](https://bundlephobia.com/package/page-os) [![Downloads](https://img.shields.io/npm/dt/page-os.svg)](https://www.npmjs.com/package/page-os) [![GitHub stars](https://img.shields.io/github/stars/EqualByte/agentic-page.svg)](https://github.com/EqualByte/agentic-page)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./docs/README-zh.md)

<a href="https://equalbyte.github.io/agentic-page/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://equalbyte.github.io/agentic-page/docs/introduction/overview" target="_blank"><b>📖 Docs</b></a> | <a href="https://x.com/equalbyte" target="_blank"><b>𝕏 Follow on X</b></a>

<!-- TODO: record and embed a PageOS demo video (the previous one showed the upstream branding) -->

---

## ✨ Features

- **🎯 Easy integration**
    - No need for `browser extension` / `python` / `headless browser`.
    - Just in-page javascript. Everything happens in your web page.
- **📖 Text-based DOM manipulation**
    - No screenshots. No multi-modal LLMs or special permissions needed.
- **🧠 Bring your own LLMs**
- **🐙 Optional [chrome extension](https://equalbyte.github.io/agentic-page/docs/features/chrome-extension) for multi-page tasks.**
    - And an [MCP Server (Beta)](https://equalbyte.github.io/agentic-page/docs/features/mcp-server) to control it from outside

## 💡 Use Cases

- **SaaS AI Copilot** — Ship an AI copilot in your product in lines of code. No backend rewrite.
- **Smart Form Filling** — Turn 20-click workflows into one sentence. Perfect for ERP, CRM, and admin systems.
- **Accessibility** — Make any web app accessible through natural language. Voice commands, screen readers, zero barrier.
- **Multi-page Agent** — Extend your own web agent's reach across browser tabs [chrome extension](https://equalbyte.github.io/agentic-page/docs/features/chrome-extension).
- **MCP** - Allow your agent clients to control your browser.

## 🚀 Quick Start

### One-line integration

Fastest way to try PageOS with our free Demo LLM:

```html
<script src="{URL}" crossorigin="true"></script>
```

> **⚠️ For technical evaluation only.** This demo CDN uses our free [testing LLM API](https://equalbyte.github.io/agentic-page/docs/features/models#free-testing-api). By using it, you agree to its [terms](https://github.com/EqualByte/agentic-page/blob/main/docs/terms-and-privacy.md).

| Mirrors | URL                                                                                 |
| ------- | ----------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/page-os@1.11.0/dist/iife/page-os.demo.js         |
| China   | https://registry.npmmirror.com/page-os/1.11.0/files/dist/iife/page-os.demo.js |

Add `?autoInit=false` to load the script without creating the demo agent automatically. You can then instantiate it with `new window.PageOS(...)`.

### NPM Installation

```bash
npm install page-os
```

```javascript
import { PageOS } from 'page-os'

const agent = new PageOS({
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
    apiKey: 'YOUR_API_KEY',
    language: 'en-US',
})

// The floating panel starts hidden — show it so users can type tasks
agent.panel.show()

// Or run a task programmatically (the panel appears automatically)
await agent.execute('Click the login button')
```

> PageOS works with any OpenAI-compatible API — point `baseURL`/`model` at your provider of choice.

For more programmatic usage, see [📖 Documentations](https://equalbyte.github.io/agentic-page/docs/introduction/overview).

## 🌟 Awesome PageOS

Built something cool with PageOS? Add it here! Open a PR to share your project.

> These are community projects — not maintained or endorsed by us. Use at your own discretion.

| Project  | Description                                                 |
| -------- | ----------------------------------------------------------- |
| _Yours?_ | [Open a PR](https://github.com/EqualByte/agentic-page/pulls) 🙌 |

## 🤝 Contributing

We welcome contributions from the community! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [docs/developer-guide.md](docs/developer-guide.md) for local development workflows.

Contributions generated entirely by **bots or AI** without substantial human involvement will **not be accepted**.

## ⚖️ License

[MIT License](LICENSE)

## 👏 Acknowledgments

This project builds upon the excellent work of **[`browser-use`](https://github.com/browser-use/browser-use)**.

`PageOS` is designed for **client-side web enhancement**, not server-side automation.

```
DOM processing components and prompt are derived from browser-use:

Browser Use <https://github.com/browser-use/browser-use>
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.
```

---

**⭐ Star this repo if you find PageOS helpful!**
