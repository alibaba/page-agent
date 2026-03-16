# Page Agent

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

纯 JS 实现的 GUI agent。使用自然语言操作你的 Web 应用。无须后端、客户端、浏览器插件。

🌐 [English](../README.md) | **中文**

<a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/docs/introduction/overview" target="_blank"><b>📖 Docs</b></a> | <a href="https://news.ycombinator.com/item?id=47264138" target="_blank"><b>📢 HN Discussion</b></a> | <a href="https://x.com/simonluvramen" target="_blank"><b>𝕏 Follow on X</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/a1f2eae2-13fb-4aae-98cf-a3fc1620a6c2" controls crossorigin muted></video>

---

## ✨ Features

- **🎯 轻松集成**
    - 无需 `浏览器插件` / `Python` / `无头浏览器`。
    - 纯页面内 JavaScript，一切都在你的网页中完成。
- **📖 基于文本的 DOM 操作**
    - 无需截图，无需多模态模型或特殊权限。
- **🧠 用你自己的 LLM**
- **🎨 精美 UI，支持人机协同**
- **🐙 可选的 [Chrome 扩展](https://alibaba.github.io/page-agent/docs/features/chrome-extension)，支持跨页面任务。**

## 💡 应用场景

- **SaaS AI 副驾驶** — 几行代码为你的产品加上 AI 副驾驶，无需重写后端。
- **智能表单填写** — 把 20 次点击变成一句话。ERP、CRM、管理后台的最佳拍档。
- **无障碍增强** — 用自然语言让任何网页无障碍。语音指令、屏幕阅读器，零门槛。
- **跨页面 Agent** — 通过可选的 [Chrome 扩展](https://alibaba.github.io/page-agent/docs/features/chrome-extension)，让你自己的 Agent 跨标签页工作。

## 🚀 快速开始

### 一行代码集成

通过我们免费的 Demo LLM 快速体验 PageAgent：

```html
<script src="{URL}" crossorigin="true"></script>
```

> **⚠️ 仅用于技术评估。** 该 Demo CDN 使用了免费的[测试 LLM API](https://alibaba.github.io/page-agent/docs/features/models#free-testing-api)，使用即表示您同意其[条款](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)。

| Mirrors | URL                                                                                |
| ------- | ---------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js         |
| China   | https://registry.npmmirror.com/page-agent/1.5.7/files/dist/iife/page-agent.demo.js |

### NPM 安装

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'qwen3.5-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'YOUR_API_KEY',
    language: 'zh-CN',
})

await agent.execute('点击登录按钮')
```

更多编程用法，请参阅 [📖 文档](https://alibaba.github.io/page-agent/docs/introduction/overview)。

## 🤝 贡献

欢迎社区贡献！请参阅 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解安装与贡献指南。请在贡献前阅读[行为准则](CODE_OF_CONDUCT.md)。

我们不接受未经实质性人类参与、完全由 Bot 或 Agent 自动生成的代码，机器人账号可能被禁止参与互动。

## 👏 致谢

本项目基于 **[`browser-use`](https://github.com/browser-use/browser-use)** 的优秀工作构建。

`PageAgent` 专为**客户端网页增强**设计，不是服务端自动化工具。

```
DOM processing components and prompt are derived from browser-use:

Browser Use <https://github.com/browser-use/browser-use>
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.

Third-party dependencies and their licenses can be found in the package.json
file and in the node_modules directory after installation.
```

## 📄 许可证

[MIT License](../LICENSE)

---

**⭐ 如果觉得 PageAgent 有用或有趣，请给项目点个星！**

<a href="https://www.star-history.com/?repos=alibaba%2Fpage-agent&type=date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&theme=dark&legend=top-left&v=7" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&legend=top-left&v=7" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&legend=top-left&v=7" />
 </picture>
</a>
