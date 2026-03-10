# Terms of Use & Privacy

**Last updated:** March 2026

"We" in this document refers to the maintainers of the open-source Page Agent project (https://github.com/alibaba/page-agent). "The software" refers to PageAgent.js (the JavaScript library) and Page Agent Ext (the browser extension). This document covers the software itself and the testing API we provide — **not** any third-party product or service built with it.

---

## 1. Open Source Software Privacy

The software is a **client-side only** tool with a "Bring Your Own Key" (BYOK) architecture. The software itself does **not** include any backend service. The software does **not** collect or transmit any user data on its own, and we do **not** have access to your browsing activity, page content, or task instructions through the software.

All data transmission occurs **only** between your browser and the LLM provider you configure. You are in full control of which provider receives your data.

- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- The project is open source under the [MIT License](https://github.com/alibaba/page-agent/blob/main/LICENSE) and can be audited at: https://github.com/alibaba/page-agent

---

## 2. Testing API and Demo Disclaimer & Terms of Use

To facilitate easy testing and technical evaluation, we provide a free testing LLM API. This API is used in the project homepage's live demo, the pre-built demo CDN bundles, and the browser extension's default configuration. Users may also use it independently for their own technical evaluation of page-agent.

This free testing API is provided **strictly for technical evaluation and R&D purposes only**. It must not be used in any production environment. By using this API, you agree to the following terms:

- **No Sensitive Data**: You are strictly prohibited from inputting any Personal Identifiable Information (PII), confidential business data, financial/medical records, or using this agent on web pages containing such sensitive information.

- **Data Processing**: We do not store or log your prompts, webpage data (HTML), or any submitted content, nor do we use such data for model training. All data is processed in-transit and immediately discarded. We perform in-memory request validation to prevent abuse of the testing API, and temporarily process IP addresses for rate-limiting purposes. No data from these processes is retained. Data is processed through Alibaba Cloud infrastructure, which is subject to its own privacy policy.

- **Independent Infrastructure**: The software is completely frontend-based with a "Bring Your Own Key" (BYOK) architecture and **no built-in backend**. To facilitate easy testing, the maintainers have purchased public cloud services from Alibaba Cloud China ([aliyun.com](https://www.aliyun.com) Function Compute and BaiLian Qwen models). This project is not a product of, nor endorsed by, Alibaba Cloud.

- **No Guaranteed Availability**: This testing API may be rate-limited, degraded, or discontinued at any time without prior notice.

- **"AS IS" & Limitation of Liability**: This service is provided strictly on an "AS IS" and "AS AVAILABLE" basis, without any warranties. The maintainers bear no liability for any data loss, service interruption, or legal consequences arising from your use of this service.

- **Recommendation for Real Usage**: For secure and continuous usage, we strongly advise using the BYOK mode with your own legally compliant commercial LLM API keys, or connecting to local, offline models (e.g., Ollama).

**Note**: This free testing LLM API processes data via servers located in Mainland China. If you are located in a region with strict data localization laws (such as the EU/EEA), please do not use this API.

**Age Requirement**: The software and testing API are not intended for use by individuals under the age of 13 (or the minimum age of digital consent in your jurisdiction).

---

## 3. Browser Extension (Page Agent Ext)

### Data Processing

The extension performs DOM analysis and automation actions **locally in your browser**. Your browsing history, passwords, and form data are not accessed or collected by the extension developer.

Data is transmitted to external servers **only when you initiate an automation task**. When this occurs:

- Your task instructions (natural language commands)
- Simplified page structure (cleaned HTML) of all pages under the extension's control

are sent to the LLM API endpoint configured in **your settings**.

> **Note:** The HTML cleaning process simplifies page structure for AI readability but **does not guarantee removal of sensitive information** (e.g., visible text, form values, or personal data on the page). Please be mindful of the page content when initiating tasks.

**If you configure a third-party LLM provider** (e.g., OpenAI, Anthropic, or others), data is sent directly to that provider. Their privacy policies apply.

**If you use the testing API**, the terms in [Section 2](#2-testing-api-and-demo-disclaimer--terms-of-use) apply. By using the extension with the default testing API, you agree to those terms.

### Data Storage

- **Local storage only**: Your configuration (API endpoint, API key, model selection) is stored in your browser via `chrome.storage.local` (or equivalent browser storage APIs)
- **No cloud sync**: Configuration is not synced to any external server
- **No analytics**: The extension does not include any analytics or tracking code

### Your Control

- The extension is open source and can be audited by anyone
- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- You can clear all stored data by removing the extension

---

## Changes

We may update these terms at our discretion.

## Contact

https://github.com/alibaba/page-agent/issues
