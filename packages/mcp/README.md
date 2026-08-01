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

| Tool           | Input              | Description                                           |
| -------------- | ------------------ | ----------------------------------------------------- |
| `execute_task` | `{ task: string }` | Execute a browser task in natural language. Blocking. |
| `get_status`   | —                  | Returns `{ connected, busy }`                         |
| `stop_task`    | —                  | Stop the currently running task.                      |

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

## Resumable long-PDF editing

This customized MCP build adds durable, page-scoped PDF editing for long documents. It keeps the large page text outside the model context and injects only the active job's compact next-action summary into `execute_task`.

### One-time backend setup

```bash
python3 -m venv ~/.hermes/tools-venvs/pageagent-pdf
~/.hermes/tools-venvs/pageagent-pdf/bin/python -m pip install pymupdf
```

Override the interpreter or job location when needed:

```json
{
    "env": {
        "PDF_PYTHON": "/absolute/path/to/python-with-pymupdf",
        "PDF_WORKSPACE_ROOT": "/absolute/path/to/pdf-jobs"
    }
}
```

Defaults:

- Python: `~/.hermes/tools-venvs/pageagent-pdf/bin/python`
- Jobs: `~/.page-agent/pdf-jobs/<job-id>/`

Each job contains:

- `source.pdf` — immutable source snapshot
- `versions/version-NNNN.pdf` — atomic working versions
- `manifest.json` and `pages/NNNN.txt` — page index without context bloat
- `state.json` — machine-authoritative operation/checkpoint state
- `memory.md` — human-readable resume summary generated from state

### PDF MCP tools

| Tool                   | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `pdf_create_job`       | Snapshot a PDF, extract a page manifest, and set it active |
| `pdf_job_status`       | Read compact state and the exact next action               |
| `pdf_queue_operations` | Queue idempotent page edits with stable operation IDs      |
| `pdf_apply_next_batch` | Apply up to 20 edits as one validated atomic version       |
| `pdf_checkpoint`       | Record progress, retry notes, errors, and next action      |
| `pdf_resume_job`       | Return resume context or run the next browser step         |
| `pdf_complete_job`     | Mark a validated job complete and clear the active pointer |

Supported operations: `replace_text`, `redact_text`, `add_text`, `add_note`, `highlight_text`, and `rotate_page`. Page numbers are always 1-based. Search-based edits require an explicit positive `occurrence`, so a destructive operation cannot silently affect every matching string.

`execute_task` now accepts `jobId` and `autoResume`. `autoResume` defaults to `true`: when an active PDF job exists, every new PageAgent request receives compact state derived from authoritative `state.json` and continues from the exact pending action. Set `autoResume: false` for unrelated browser work.

Runtime configuration is acknowledged only after the extension has installed the new agent generation. User stops and internal disposal are carried as distinct structured reasons, and a user-cancelled task is never retried.

### pdf.net operator mode

For an active durable PDF job, PageAgent is explicitly instructed to operate the online editor at [pdf.net](https://pdf.net), not the Apryse PDFNet SDK. It routes existing-text edits, added text, annotations, page organization, and rotation to the corresponding pdf.net workflow and processes only the pending bounded batch. Page-count-changing merge and split workflows are outside the durable operation schema and are not offered as resumable job steps.

If the host exposes pdf.net's official OAuth MCP connector, PageAgent prefers it. Otherwise it uses the website. Browser security does not permit the extension to select an arbitrary local file safely, so PageAgent asks once for a human upload of the exact durable `Working copy` shown in resume context, then continues autonomously. It never requests the immutable source or an unrelated path.

A visual cover is not secure redaction. If pdf.net cannot remove the underlying text, the browser step stops that operation and requests the local `redact_text` backend instead of claiming success. Downloaded results and completed operation IDs must be reported before the durable checkpoint advances. A reported PDF must be a regular, non-symlink file under the user's Downloads directory, OS temporary directory, or PDF workspace. The workspace copies it to a private temporary file, reopens it with the backend, rejects encryption or page-count changes, hashes and atomically promotes it as the next internal version, then completes only IDs that are still pending under the same job lock.

### Recovery guarantees

- State and Markdown checkpoints are fsynced, written through same-directory temporary files, and atomically renamed; `state.json` is authoritative if a crash occurs between the two writes.
- PDF source copies, initial snapshots, and generated temporary outputs are fsynced before hashing or atomic promotion; versions are immutable, checksummed, and promoted only after the backend reopens and validates them.
- Each job is limited to 100 operations, 100 generated versions, 512 MiB per PDF, 4 GiB of retained PDF artifacts, and 50 million extracted text characters. Notes, errors, validation checks, retries, and individual payloads are also bounded.
- A failed batch leaves operations pending with attempts, error, and retry action recorded; an operation stops automatically after three failed attempts. A deliberate user stop records a paused checkpoint that forbids automatic resume.
- A process restart recovers operations left in `running` state only after acquiring an abandoned owner-token/PID/process-start lock.
- Recovery removes crash-orphaned temporary and untracked version entries under the capability-rooted `versions/` directory while preserving authoritative artifact names and canonical targets.
- The backend receives a private, random, hash-verified snapshot of the canonical working copy, so replacing the authoritative pathname after validation cannot redirect an in-flight batch.
- Owner-token locks with PID liveness and heartbeats prevent concurrent writers. Stale observers publish unique intent markers, and replacement owners wait for all live observers before entering a mutation, so a delayed observer cannot delete or quarantine an executing owner's lock.
- Credentials are not part of the job schema, subprocesses receive an environment allowlist, and common secret patterns are redacted from `memory.md`.

## Dev

```bash
npm run dev:ext
npm test -w @page-agent/mcp
npx @modelcontextprotocol/inspector node packages/mcp/src/index.js
```
