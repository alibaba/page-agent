# Privacy Policy for Page Agent Extension

**Last updated:** February 2026

## Overview

Page Agent Extension is a browser automation tool that uses AI to help you interact with web pages. This policy explains what data is processed and under what circumstances.

## Data Processing

### Local Processing

The extension performs DOM analysis and automation actions **locally in your browser**. Your browsing history, passwords, and form data are not accessed or collected by the extension developer.

### Data Transmission

Data is transmitted to external servers **only when you initiate an automation task**. When this occurs:

- Your task instructions (natural language commands)
- Simplified page structure (cleaned DOM) of all pages under the extension's control

are sent to the LLM API endpoint configured in **your settings**.

> **Note:** The DOM cleaning process simplifies page structure for AI readability but **does not guarantee removal of sensitive information** (e.g., visible text, form values, or personal data on the page). Please be mindful of the page content when initiating tasks.

**If you configure a third-party LLM provider** (e.g., OpenAI, Anthropic, or others), data is sent directly to that provider. Their privacy policies apply.

**If you use our testing endpoint**, your requests are proxied to [DeepSeek](https://deepseek.com) for AI processing. Regarding this test endpoint:

- This endpoint is provided for evaluation purposes only and is not recommended for production or daily use
- The free model and their service providers may change at any time without prior notice
- We do **not** store your task content, page content, or visited URLs
- Minimal logging (timestamps, request metadata, IP addresses) may be collected for abuse prevention and service stability
- DeepSeek's [Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html) applies to their processing of your requests

## Data Storage

- **Local storage only**: Your configuration (API endpoint, API key, model selection) is stored in your browser via `chrome.storage.local`
- **No cloud sync**: Configuration is not synced to any external server
- **No analytics**: The extension does not include any analytics or tracking code

## Your Control

- The extension is open source and can be audited by anyone
- You choose which LLM provider to use
- You may configure your own API endpoint at any time
- You can clear all stored data by removing the extension

## Changes to This Policy

We may update this policy as the extension evolves. Significant changes will be noted in the extension's release notes.

## Contact

For questions about this privacy policy:
https://github.com/alibaba/page-agent/issues

---

Source code: https://github.com/alibaba/page-agent
