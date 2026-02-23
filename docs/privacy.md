# Privacy

**Last updated:** February 2026

"We" in this document refers to the maintainers of the open-source Page Agent project (https://github.com/alibaba/page-agent). This policy covers only the Page Agent software itself — **not** any third-party product or service built with it. If you are using a product that integrates Page Agent, please refer to that product's own privacy policy.

## No Backend, No Data Collection

Page Agent (PageAgent.js and PageAgent Extension) is a **client-side only** tool. The product itself does **not** include any backend service. We do **not** collect or transmit any user data, and do **not** have access to your browsing activity, page content, or task instructions.

All data transmission occurs **only** between your browser and the LLM provider you configure. You are in full control of which provider receives your data.

## Free Testing LLM Proxies

We provide two free LLM proxy services **for technical evaluation of PageAgent.js and PageAgent Extension only**:

| Model                   | Proxy Target                                             | Terms / Privacy                                                                                                                                |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Qwen (Singapore Region) | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | [Alibaba Cloud Bailian Terms](https://terms.alicdn.com/legal-agreement/terms/common_platform_service/20230728213935489/20230728213935489.html) |
| DeepSeek                | `https://api.deepseek.com`                               | [DeepSeek Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)                                                |

When using these proxies:

- Your task instructions and simplified page content are forwarded to the respective LLM provider
- We do **not** store your task content, page content, or visited URLs
- Minimal logging (timestamps, request metadata) may exist for abuse prevention
- The free model and service providers may change at any time without notice
- **Not recommended for production or daily use**

## Your Control

- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- The project is open source and can be audited: https://github.com/alibaba/page-agent

## Contact

https://github.com/alibaba/page-agent/issues
