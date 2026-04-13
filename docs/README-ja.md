# Page Agent

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

Webページに組み込める GUI Agent。自然言語でWebインターフェースを操作できます。

🌐 [English](../README.md) | [中文](./README-zh.md) | **日本語**

<a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 デモ</b></a> | <a href="https://alibaba.github.io/page-agent/docs/introduction/overview" target="_blank"><b>📖 ドキュメント</b></a> | <a href="https://news.ycombinator.com/item?id=47264138" target="_blank"><b>📢 HN ディスカッション</b></a> | <a href="https://x.com/simonluvramen" target="_blank"><b>𝕏 Follow on X</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/a1f2eae2-13fb-4aae-98cf-a3fc1620a6c2" controls crossorigin muted></video>

---

## ✨ 特徴

- **🎯 簡単に導入**
    - `ブラウザ拡張機能` / `Python` / `ヘッドレスブラウザ` は不要。ページ内の JavaScript だけで完結します。
- **📖 テキストベースの DOM 操作**
    - スクリーンショット不要。マルチモーダル LLM や特別な権限も必要ありません。
- **🧠 お好みの LLM を利用可能**
- **🐙 オプションの [Chrome 拡張機能](https://alibaba.github.io/page-agent/docs/features/chrome-extension)でクロスページタスクに対応**
    - 外部から制御するための [MCP Server (Beta)](https://alibaba.github.io/page-agent/docs/features/mcp-server) も利用可能

## 💡 ユースケース

- **SaaS AI Copilot** — 数行のコードで AI コパイロットを製品に組み込めます。バックエンドの書き換えは不要です。
- **スマートフォーム入力** — 20回のクリック操作を一文に変換。ERP、CRM、管理システムに最適です。
- **アクセシビリティ** — 自然言語であらゆる Web アプリをアクセシブルに。音声コマンド、スクリーンリーダー、バリアフリー。
- **クロスページ Agent** — オプションの [Chrome 拡張機能](https://alibaba.github.io/page-agent/docs/features/chrome-extension)で、Web Agent をブラウザタブ間で拡張。
- **MCP** — エージェントクライアントからブラウザを制御できます。

## 🚀 クイックスタート

### ワンライン導入

無料の Demo LLM で PageAgent を最も簡単に試す方法：

```html
<script src="{URL}" crossorigin="true"></script>
```

> **⚠️ 技術評価のみを目的としています。** この Demo CDN は無料の[テスト用 LLM API](https://alibaba.github.io/page-agent/docs/features/models#free-testing-api) を使用しています。利用することで、その[利用規約](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)に同意したものとみなされます。

| ミラー | URL                                                                                |
| ------ | ---------------------------------------------------------------------------------- |
| Global | https://cdn.jsdelivr.net/npm/page-agent@1.7.1/dist/iife/page-agent.demo.js         |
| China  | https://registry.npmmirror.com/page-agent/1.7.1/files/dist/iife/page-agent.demo.js |

### NPM インストール

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'qwen3.5-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'YOUR_API_KEY',
    language: 'ja-JP',
})

await agent.execute('ログインボタンをクリック')
```

より詳しいプログラムからの利用方法は、[📖 ドキュメント](https://alibaba.github.io/page-agent/docs/introduction/overview)をご覧ください。

## 🌟 Awesome Page Agent

PageAgent で何か作りましたか？ぜひここに追加してください！PR をオープンしてプロジェクトを共有しましょう。

> これらはコミュニティプロジェクトであり、私たちが保守・推奨するものではありません。ご自身の判断でご利用ください。

| プロジェクト | 説明                                                        |
| ------------ | ----------------------------------------------------------- |
| _あなたの？_ | [PR をオープン](https://github.com/alibaba/page-agent/pulls) 🙌 |

## 🤝 コントリビューション

コミュニティからのコントリビューションを歓迎します！ガイドラインは [CONTRIBUTING.md](../CONTRIBUTING.md) を、ローカル開発ワークフローは [docs/developer-guide.md](developer-guide.md) をご覧ください。

[メンテナーのノート](https://github.com/alibaba/page-agent/issues/349)で方針と現状をご確認ください。

**ボットや AI** によって完全に生成され、実質的な人間の関与がないコントリビューションは**受け付けません**。

## ⚖️ ライセンス

[MIT License](../LICENSE)

## 👏 謝辞

本プロジェクトは **[`browser-use`](https://github.com/browser-use/browser-use)** の優れた成果を基に構築されています。

`PageAgent` は**クライアントサイドの Web 強化**を目的として設計されており、サーバーサイドの自動化ツールではありません。

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

**⭐ PageAgent が役に立ったら、ぜひスターをお願いします！**
