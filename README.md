# Page Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/zhulinchng/page-agent.svg)](https://github.com/zhulinchng/page-agent)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./docs/README-zh.md)

👉 <a href="https://zhulinchng.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://zhulinchng.github.io/page-agent/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a> | <a href="https://news.ycombinator.com/item?id=47264138" target="_blank">📢 Join HN Discussion</a>

<video id="demo-video" src="https://github.com/user-attachments/assets/a1f2eae2-13fb-4aae-98cf-a3fc1620a6c2" controls crossorigin muted></video>

---

## ✨ Features

- **🎯 Easy integration**
    - No need for `browser extension` / `python` / `headless browser`.
    - Just in-page javascript. Everything happens in your web page.
    - The best tool for your agent to control web pages.
- **📖 Text-based DOM manipulation**
    - No screenshots. No OCR or multi-modal LLMs needed.
    - No special permissions required.
- **🧠 Bring your own LLMs**
- **🎨 Pretty UI with human-in-the-loop**
- **🐙 Optional [chrome extension](https://zhulinchng.github.io/page-agent/docs/features/chrome-extension) for multi-page tasks.**

## 💡 Use Cases

- **SaaS AI Copilot** — Ship an AI copilot in your product in lines of code. No backend rewrite needed.
- **Smart Form Filling** — Turn 20-click workflows into one sentence. Perfect for ERP, CRM, and admin systems.
- **Accessibility** — Make any web app accessible through natural language. Voice commands, screen readers, zero barrier.
- **Multi-page Agent** — Extend your agent's reach across browser tabs with the optional [chrome extension](https://zhulinchng.github.io/page-agent/docs/features/chrome-extension).

## 🚀 Quick Start

### One-line integration

Fastest way to try PageAgent with your own LLM key:

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.3/dist/iife/page-agent.demo.js?baseURL=YOUR_API_BASE_URL&model=YOUR_MODEL&apiKey=YOUR_KEY" crossorigin="true"></script>
```

| Mirror | URL                                                                        |
| ------ | -------------------------------------------------------------------------- |
| Global | https://cdn.jsdelivr.net/npm/page-agent@1.5.3/dist/iife/page-agent.demo.js |

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'gpt-4.1-mini',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'YOUR_API_KEY',
    language: 'en-US',
})

await agent.execute('Click the login button')
```

For more programmatic usage, see [📖 Documentations](https://zhulinchng.github.io/page-agent/docs/introduction/overview).

## 🤝 Contributing

We welcome contributions from the community! Follow our instructions in [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup and local development.

Please read [Code of Conduct](docs/CODE_OF_CONDUCT.md) before contributing.

## 👏 Acknowledgments

This project builds upon the excellent work of **[`browser-use`](https://github.com/browser-use/browser-use)**.

`PageAgent` is designed for **client-side web enhancement**, not server-side automation.

```
DOM processing components and prompt are derived from browser-use:

Browser Use
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

Original browser-use project: <https://github.com/browser-use/browser-use>

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.

Third-party dependencies and their licenses can be found in the package.json
file and in the node_modules directory after installation.
```

## 📄 License

[MIT License](LICENSE)

---

**⭐ Star this repo if you find PageAgent helpful!**

<a href="https://www.star-history.com/?repos=zhulinchng%2Fpage-agent&type=date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=zhulinchng/page-agent&type=date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=zhulinchng/page-agent&type=date" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=zhulinchng/page-agent&type=date" />
 </picture>
</a>
