# PageAgent 🤖🪄

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent) [![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./README-zh.md)

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/#/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/34d8444d-cbfb-44a3-a24e-fd5c167bb0bf" controls crossorigin muted></video>

---

## ✨ Features

- **🎯 Easy Integration**
    - No python. No headless browser. No browser extension. Just in-page scripts.
- **🔐 Client-Side Processing**
- **🧠 DOM Extraction**
- **💬 Natural Language Interface**
- **🎨 UI with Human in the loop**

And 😉

- **🧪 `cross-page` control with an experimental chrome extension** - `packages/extension`
  - 🎉 **Now available on the [Chrome Web Store](https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj)!**

👉 [**🗺️ Roadmap**](https://github.com/alibaba/page-agent/issues/96)

## 🚀 Quick Start

### One-line integration

Fastest way to try PageAgent with our free Demo LLM:

```html
<script
    src="https://cdn.jsdelivr.net/npm/page-agent@1.2.0/dist/iife/page-agent.demo.js"
    crossorigin="true"
></script>
```

> - **⚠️ For technical evaluation only.** Demo LLM has rate limits and usage restrictions. May change without notice.
> - **🌷 Bring your own LLM API.**

| Mirrors | URL                                                                                |
| ------- | ---------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/page-agent@1.2.0/dist/iife/page-agent.demo.js         |
| China   | https://registry.npmmirror.com/page-agent/1.2.0/files/dist/iife/page-agent.demo.js |

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
    apiKey: 'YOUR_API_KEY',
    language: 'en-US',
})

await agent.execute('Click the login button')
```

## 🏗️ Structure

PageAgent adopts a simplified monorepo structure:

```
packages/
├── core/                # ** Core agent logic without UI(npm: @page-agent/core) **
├── page-agent/          # Exported agent and demo(npm: page-agent)
├── llms/                # LLM client (npm: @page-agent/llms)
├── page-controller/     # DOM operations & Visual Mask (npm: @page-agent/page-controller)
├── ui/                  # Panel & i18n (npm: @page-agent/ui)
└── website/             # Demo & Documentation site
```

## 🤝 Contributing

We welcome contributions from the community! Follow our instructions in [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup and local development.

Please read [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

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
