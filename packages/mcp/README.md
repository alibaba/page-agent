# @page-agent/mcp

MCP server that lets AI agent clients (Claude Desktop, Copilot, etc.) control your browser through the [Page Agent](https://github.com/alibaba/page-agent) extension.

## Prerequisites

- Node.js >= 20
- [Page Agent Extension](https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj) installed in Chrome
- An LLM API key (OpenAI-compatible)

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "page-agent": {
            "command": "npx",
            "args": ["-y", "@page-agent/mcp"],
            "env": {
                "LLM_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "LLM_API_KEY": "sk-xxx",
                "LLM_MODEL_NAME": "qwen3.5-plus"
            }
        }
    }
}
```

### Cursor / Copilot

Same format — add the config to the MCP settings of your client.

## MCP Tools

| Tool           | Input              | Description                                          |
| -------------- | ------------------ | ---------------------------------------------------- |
| `execute_task` | `{ task: string }` | Execute a browser task in natural language. Blocking. |
| `get_status`   | —                  | Returns `{ connected, busy }`                        |
| `stop_task`    | —                  | Stop the currently running task.                     |

## Environment Variables

| Variable         | Default | Description           |
| ---------------- | ------- | --------------------- |
| `LLM_BASE_URL`   | —       | LLM API base URL      |
| `LLM_API_KEY`    | —       | LLM API key           |
| `LLM_MODEL_NAME` | —       | Model name            |
| `PORT`           | `38401` | HTTP + WebSocket port |

## How It Works

```
┌──────────────┐  stdio   ┌──────────────────┐  WebSocket   ┌──────────────┐
│ Claude /     │◄────────►│ @page-agent/mcp  │◄────────────►│ Hub tab      │
│ Copilot      │  (MCP)   │ (Node.js)        │  (localhost) │ (extension)  │
└──────────────┘          └──────────────────┘              └──────┬───────┘
                                   │                               │
                                   │ HTTP                          │ useAgent
                                   ▼                               ▼
                          ┌──────────────────┐              ┌──────────────┐
                          │ Launcher page    │              │ MultiPage    │
                          │ (localhost:PORT) │              │ Agent        │
                          └──────────────────┘              └──────────────┘
```

1. Agent client starts the MCP server via stdio (`npx @page-agent/mcp`).
2. Server starts HTTP + WS on `localhost:PORT`, opens the launcher page in browser.
3. Launcher page triggers the extension to open a **hub tab** (`hub.html?ws=PORT`).
4. Hub connects to the WS server. MCP tools now proxy tasks to the hub.

The hub tab speaks a generic WebSocket protocol (defined in `hub-ws.ts` in the extension package) and has no knowledge of MCP. See the hub's protocol docs for message format details.

## Architecture

Pure JS ESM, no build step. Source files are the published artifacts.

```
src/
├── index.js        # CLI entry: MCP server (stdio) + opens launcher
├── hub-bridge.js   # HTTP server + WebSocket bridge to hub tab
└── launcher.html   # Bootstrap page: detects extension, triggers hub open
```

## Dev

```bash
npm run dev:ext
npx @modelcontextprotocol/inspector node packages/mcp/src/index.js
```
