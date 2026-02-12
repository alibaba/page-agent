# Page Agent Extension API

Integrate the Page Agent extension into your web app and trigger multi-page browser tasks from page JavaScript.

## Installation

### 1. Install the browser extension

Primary channel:

- Chrome Web Store: https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj

Latest updates are often published earlier on:

- GitHub Releases: https://github.com/alibaba/page-agent/releases

### 2. Install type definitions (recommended)

```bash
npm install @page-agent/core --save-dev
```

### 3. Authorization (Token)

The token allows your page JS to call the extension API (`window.PAGE_AGENT_EXT`) and execute multi-page tasks.

Why token-based access is required:

- The extension has broad browser permissions (page access, navigation, multi-tab control).
- If abused, it can harm user privacy and security.
- Users must explicitly provide the token only to applications they trust.

Setup:

1. Open the extension side panel and copy your auth token.
2. Set the token in your page:

```typescript
localStorage.setItem('PageAgentExtUserAuthToken', 'your-token')
```

## Quick Start

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

// Wait for extension injection (up to 1 second)
async function waitForExtension(timeout = 1000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// Usage
if (await waitForExtension()) {
  const result = await window.PAGE_AGENT_EXT!.execute('Click the login button', {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-5.2',
    onStatusChange: (status) => console.log('Status:', status),
    onActivity: (activity) => console.log('Activity:', activity),
  })
  console.log('Result:', result)
}
```

## Global API

After token match, the extension injects APIs into `window`.

### `window.PAGE_AGENT_EXT_VERSION`

Extension version string (for capability checks before using the main API).

### `window.PAGE_AGENT_EXT`

Main namespace object.

#### `PAGE_AGENT_EXT.execute(task, config)`

Execute one agent task.

Parameters:

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `task` | `string` | Yes | Task description |
| `config` | `ExecuteConfig` | Yes | LLM settings, options, and callbacks |

Returns: `Promise<ExecutionResult>`

#### `PAGE_AGENT_EXT.dispose()`

Stop the current task.

## Types

Install `@page-agent/core` for complete types:

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

export interface ExecuteConfig {
  baseURL: string
  apiKey: string
  model: string

  // Include the initial tab where page JS starts. Default: true.
  includeInitialTab?: boolean

  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
  onDispose?: () => void
}

export type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>
```

`AgentStatus`

```typescript
type AgentStatus = 'idle' | 'running' | 'completed' | 'error'
```

`AgentActivity`

```typescript
type AgentActivity =
  | { type: 'thinking' }
  | { type: 'executing'; tool: string; input: unknown }
  | { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string }
```

`HistoricalEvent`

```typescript
type HistoricalEvent =
  | { type: 'step'; stepIndex: number; reflection: AgentReflection; action: Action }
  | { type: 'observation'; content: string }
  | { type: 'user_takeover' }
  | { type: 'retry'; message: string; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string; rawResponse?: unknown }
```

`ExecutionResult`

```typescript
interface ExecutionResult {
  success: boolean
  data: string
  history: HistoricalEvent[]
}
```

## Usage Examples

### Basic Execution

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  'Fill in the email field with test@example.com and click Submit',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
    includeInitialTab: false, // Optional: exclude current tab
    onStatusChange: (status) => console.log(status),
    onActivity: (activity) => console.log(activity),
  }
)
```

### Stop the Current Task

```typescript
window.PAGE_AGENT_EXT!.dispose()
```

## Window Type Declaration

If you are not importing `@page-agent/core`, add:

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

interface ExecuteConfig {
  baseURL: string
  apiKey: string
  model: string
  includeInitialTab?: boolean
  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
  onDispose?: () => void
}

declare global {
  interface Window {
    PAGE_AGENT_EXT_VERSION?: string
    PAGE_AGENT_EXT?: {
      version: string
      execute: Execute
      dispose: () => void
    }
  }
}
```
