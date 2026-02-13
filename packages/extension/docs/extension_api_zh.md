# Page Agent 浏览器插件 API

在你的网页应用中接入 Page Agent 插件，并通过页面 JavaScript 发起多页面浏览器任务。

## 安装

### 1. 安装浏览器插件

首选渠道：

- Chrome 应用商店：https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj

通常更快提供最新构建的渠道：

- GitHub Releases：https://github.com/alibaba/page-agent/releases

### 2. 安装类型定义（推荐）

```bash
npm install @page-agent/core --save-dev
```

### 3. 授权（Token）

token 用于让页面 JS 调用扩展 API（`window.PAGE_AGENT_EXT`）并执行多页面任务。

为什么必须使用 token：

- 插件具备较广的浏览器权限（页面访问、导航、多标签控制）。
- 若被滥用，可能危害用户隐私与安全。
- 用户必须主动将 token 提供给其信任的应用。

配置步骤：

1. 在扩展侧边栏中复制 auth token。
2. 在页面中设置 token：

```typescript
localStorage.setItem('PageAgentExtUserAuthToken', 'your-token')
```

## 快速开始

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

// 等待插件注入（最多 1 秒）
async function waitForExtension(timeout = 1000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// 使用
if (await waitForExtension()) {
  const result = await window.PAGE_AGENT_EXT!.execute('点击登录按钮', {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-5.2',
    onStatusChange: (status) => console.log('状态:', status),
    onActivity: (activity) => console.log('活动:', activity),
  })
  console.log('结果:', result)
}
```

## 全局 API

token 匹配后，插件会在 `window` 上注入 API。

### `window.PAGE_AGENT_EXT_VERSION`

插件版本号字符串，可用于在访问主 API 前做能力检查。

### `window.PAGE_AGENT_EXT`

主命名空间对象。

#### `PAGE_AGENT_EXT.execute(task, config)`

执行 Agent 任务。

参数：

| 名称 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `task` | `string` | 是 | 任务描述 |
| `config` | `ExecuteConfig` | 是 | LLM 设置、执行选项和回调 |

返回：`Promise<ExecutionResult>`

#### `PAGE_AGENT_EXT.stop()`

停止当前任务。

## 类型定义

安装 `@page-agent/core` 获取完整类型：

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

  // 是否包含启动脚本所在标签页。默认 true。
  includeInitialTab?: boolean

  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
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

## 使用示例

### 基础执行

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  '在邮箱输入框填入 test@example.com 然后点击提交',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
    includeInitialTab: false, // 可选：排除当前标签页
    onStatusChange: (status) => console.log(status),
    onActivity: (activity) => console.log(activity),
  }
)
```

### 停止当前任务

```typescript
window.PAGE_AGENT_EXT!.stop()
```

## Window 类型声明

如果你不直接引入 `@page-agent/core`，可添加以下声明：

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
}

declare global {
  interface Window {
    PAGE_AGENT_EXT_VERSION?: string
    PAGE_AGENT_EXT?: {
      version: string
      execute: Execute
      stop: () => void
    }
  }
}
```
