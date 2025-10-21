# PageAgent 🤖🪄

> ⚠️ See [**Roadmap**](./ROADMAP.md)

![banner](https://img.alicdn.com/imgextra/i1/O1CN01RY0Wvh26ATVeDIX7v_!!6000000007621-0-tps-1672-512.jpg)

[![npm version](https://badge.fury.io/js/page-agent.svg)](https://badge.fury.io/js/page-agent) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

**让你的网页支持 AI 自动化。**

运行在页面内的 UI agent. 使用自然语言操作 Web 应用。

🌐 [English](./README.md) | **中文**

👉 [🚀 **Demo**](https://alibaba.github.io/page-agent/) | [📖 **Documentation**](https://alibaba.github.io/page-agent/#/docs/introduction/overview)

---

## ✨ Features

- **🎯 轻松集成**
- **🔐 端侧运行**
- **🧠 HTML 脱水**
- **💬 自然语言接口**
- **🎨 HITL 交互界面**

## 🗺️ Roadmap

👉 [**Roadmap**](./ROADMAP.md)

## 🚀 快速开始

### CDN 集成

```html
<!-- 临时 CDN URL. 未来会变更 -->
<script src="https://hwcxiuzfylggtcktqgij.supabase.co/storage/v1/object/public/demo-public/v0.0.1/page-agent.js" crossorigin="true" type="text/javascript"></script>
```

### NPM 安装

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

// 测试接口
// @note: 限流，限制 prompt 内容，限制来源，随时变更，请替换成你自己的
// @note: 使用 DeepSeek-chat(3.2) 官方版本，使用协议和隐私策略见 DeepSeek 网站
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'

const agent = new PageAgent({
  modelName: DEMO_MODEL,
  baseURL: DEMO_BASE_URL,
  apiKey: DEMO_API_KEY,
  language: 'zh-CN'
})

await agent.execute("点击登录按钮")
```

## 🏗️ 架构设计

PageAgent 采用清晰的模块化架构：

```
src/
├── PageAgent.ts          # Agent 主流程
├── dom/                  # DOM 理解
├── tools/                # 代理交互工具
├── ui/                   # UI 组件和面板
├── llms/                 # LLM 集成层
└── utils/                # 事件总线和工具
```

## 🤝 贡献

欢迎社区贡献！以下是参与方式：

### 开发环境

1. Fork 项目仓库
2. Clone or fork: `git clone https://github.com/alibaba/page-agent.git && cd page-agent`
3. 安装依赖: `npm install`
4. 启动开发: `npm start`

### 贡献指南

请在贡献前阅读我们的[行为准则](CODE_OF_CONDUCT.md)和[贡献指南](CONTRIBUTING.md)。

## 👏 致谢

本项目基于以下优秀项目构建：

- **[browser-use](https://github.com/browser-use/browser-use)**
- **[ai-sdk](https://ai-sdk.dev/)**

PageAgent 专为**客户端网页增强**设计，不是服务端自动化工具。

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

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

---

**⭐ 如果觉得 PageAgent 有用或有趣，请给项目点个星！**
