# Terms of Use & Privacy

**Last updated:** February 2026

"We" in this document refers to the maintainers of the open-source Page Agent project (https://github.com/zhulinchng/page-agent). This document covers the Page Agent software itself and the testing services we provide — **not** any third-party product or service built with it.

---

## 1. Open Source Software Privacy

Page Agent (PageAgent.js and Page Agent Extension) is a **client-side only** tool with a "Bring Your Own Key" (BYOK) architecture. The software itself does **not** include any backend service. The software does **not** collect or transmit any user data on its own, and the maintainers do **not** have access to your browsing activity, page content, or task instructions through the software.

All data transmission occurs **only** between your browser and the LLM provider you configure. You are in full control of which provider receives your data.

- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- The project is open source and can be audited: https://github.com/zhulinchng/page-agent

---

## 2. Testing API and Demo Disclaimer

Page Agent (PageAgent.js and Page Agent Extension) is a **client-side only** tool with a "Bring Your Own Key" (BYOK) architecture. There is **no built-in testing API or demo backend**. The project does not provide, operate, or route traffic through any external server.

To use PageAgent, you must supply your own LLM API credentials (endpoint, model, and API key). You are solely responsible for your choice of LLM provider and for complying with that provider's terms of service.

**Recommendation for Real Usage**: We strongly advise connecting to your own commercially available LLM API keys or to local, offline models (e.g., Ollama).

---

## 3. Browser Extension (Page Agent Ext)

### Data Processing

The extension performs DOM analysis and automation actions **locally in your browser**. Your browsing history, passwords, and form data are not accessed or collected by the extension developer.

Data is transmitted to external servers **only when you initiate an automation task**. When this occurs:

- Your task instructions (natural language commands)
- Simplified page structure (cleaned DOM) of all pages under the extension's control

are sent to the LLM API endpoint configured in **your settings**.

> **Note:** The DOM cleaning process simplifies page structure for AI readability but **does not guarantee removal of sensitive information** (e.g., visible text, form values, or personal data on the page). Please be mindful of the page content when initiating tasks.

**If you configure a third-party LLM provider** (e.g., OpenAI, Anthropic, or others), data is sent directly to that provider. Their privacy policies apply.

The extension requires you to configure your own LLM provider in the extension settings before it can be used.

### Data Storage

- **Local storage only**: Your configuration (API endpoint, API key, model selection) is stored in your browser via `chrome.storage.local`
- **No cloud sync**: Configuration is not synced to any external server
- **No analytics**: The extension does not include any analytics or tracking code

### Your Control

- The extension is open source and can be audited by anyone
- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- You can clear all stored data by removing the extension

---

## Changes

We may update these terms as the project evolves.

## Contact

https://github.com/zhulinchng/page-agent/issues
