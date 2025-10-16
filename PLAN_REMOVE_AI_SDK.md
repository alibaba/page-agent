# 移除 ai-sdk 依赖 - 实施计划

## 🎯 目标

移除对 `ai-sdk` 的依赖，用 `fetch` 直接调用 LLM API。允许用户通过注入自定义 Client 来完全控制 LLM 交互逻辑。

## 🔑 核心决策速览

| 决策点 | 方案 | 理由 |
|--------|------|------|
| **架构模式** | Client 接口模式 | 避免每次传 config，支持有状态的 SDK 实例管理 |
| **Message 格式** | OpenAI 标准 | 业界事实标准，兼容性最好 |
| **Tool Schema** | Zod + 泛型 | 类型安全，`z.infer` 推断类型，易转换为任何格式 |
| **Retry 位置** | LLM.invoke() 外层 | 与 Panel UI 集成，Client 实现更简单 |
| **Claude 兼容** | 自动检测 model name | 省略 `tool_choice`，无需用户配置 |
| **Cache Tokens** | 支持 | 提取 `cachedTokens` 和 `reasoningTokens` |
| **类型安全** | `unknown` + 泛型 | 严格类型，支持从 Zod 推断 |
| **Usage 鲁棒性** | `??` 提供默认值 | 兼容不完全遵循 OpenAI 格式的接口 |
| **JSON Schema** | Zod 4 原生 `z.toJSONSchema()` | 无需第三方库 |
| **向后兼容** | 不考虑 | 可破坏性变更，pre-1.0 版本 |

## 📋 背景与动机

### 当前问题

1. **框架冲突**: ai-sdk 的 multi-step 逻辑与我们的 single-step 理念冲突
2. **灵活性受限**: 用户无法自定义 LLM 交互（如使用 Claude SDK、自定义重试、日志等）
3. **不必要的抽象**: 使用 `stepCountIs(1)` 等 hack 强制单步行为
4. **调试困难**: 框架增加了排查 LLM 调用问题的难度
5. **Bundle size**: 重量级依赖但只用了少量功能

### 代码证据

`src/llms/index.ts` 中的现状：

```typescript
// 不应该需要的 workaround:
stopWhen: [stepCountIs(1)],  // 强制单步
// experimental_repairToolCall 会导致 silent error
// 无法让用户注入自定义 invoke 逻辑
```

## 🏗️ 架构设计

### 核心抽象

**设计哲学**: Message 用 OpenAI 格式作为事实标准，Tool schema 保持 Zod（与 LLM 无关）。

```typescript
// Message 格式 - OpenAI 标准（业界标准）
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string  // JSON 字符串
    }
  }>
  tool_call_id?: string
  name?: string
}

// Tool 定义 - 保持 Zod（LLM 无关）
// 支持泛型，提供类型安全的参数和返回值
export interface ToolDefinition<TParams = unknown, TResult = unknown> {
  name: string
  description: string
  parameters: ZodSchema<TParams>  // Zod schema，可推断类型
  execute: (args: TParams) => Promise<TResult>  // 类型安全
}

// LLM Client 接口
// 注意：不使用泛型，因为 tools 数组中每个 tool 的类型不同
export interface LLMClient {
  invoke(
    messages: Message[],
    tools: ToolDefinition[],
    abortSignal?: AbortSignal
  ): Promise<InvokeResult>
}

// Invoke 返回值（严格类型，支持泛型）
export interface InvokeResult<TResult = unknown> {
  toolCall: {
    id?: string  // OpenAI 的 tool_call_id
    name: string
    args: Record<string, unknown>
  }
  toolResult: TResult  // 支持泛型，但默认 unknown
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number       // prompt cache 命中的 token 数
    reasoningTokens?: number    // OpenAI o1 系列的推理 token
  }
  rawResponse?: unknown  // 原始响应，用于调试
}

// 内置 OpenAI Client 的 Config
export interface LLMConfig {
  model: string
  apiKey: string
  baseURL: string
  temperature?: number
  maxTokens?: number
  // ... 其他 OpenAI 参数
}
```

### 为什么这样设计？

| 方面 | 决策 | 理由 |
|--------|----------|-----------|
| **Message 格式** | OpenAI 标准 | - 业界事实标准<br>- 大多数 proxy 兼容<br>- 大部分用户零转换成本 |
| **Tool Schema** | Zod | - 类型安全<br>- 与 LLM 无关<br>- 易转换为任何格式 |
| **Client 接口** | 接口而非继承 | - 避免每次传 config<br>- 用户可管理状态（SDK 实例等）<br>- 支持对象字面量实现 |
| **Retry 位置** | LLM.invoke() 外层 | - 与 Panel UI 集成<br>- 统一错误处理<br>- Client 实现更简单 |
| **类型严格性** | unknown 替代 any | - 更安全的类型推断<br>- 强制类型检查 |

### 对于实现自定义 Client 的用户

**OpenAI 用户**: 零成本，使用内置 `OpenAIClient`。

**自定义 Client 示例**：

```typescript
// 方式1: 实现接口（推荐）
class ClaudeClient implements LLMClient {
  private sdk: Anthropic
  
  constructor(config: { apiKey: string }) {
    this.sdk = new Anthropic({ apiKey: config.apiKey })
  }
  
  async invoke(messages, tools, signal) {
    // 转换 messages 格式
    // 调用 Claude SDK
    // 返回 InvokeResult
  }
}

// 方式2: 对象字面量（简单场景）
const myClient: LLMClient = {
  async invoke(messages, tools, signal) {
    // 自己的实现
    return { toolCall, toolResult, usage }
  }
}

// 使用
llm.client = new ClaudeClient(myConfig)
// 或
llm.client = myClient
```

**优势**：
- Config 封装在 client 内部，无需每次传递
- 可以管理有状态的 SDK 实例、连接池等
- 接口清晰：`invoke(messages, tools, signal)`

### 泛型类型安全示例

```typescript
// 使用泛型定义 tool，获得完整类型推断
const greetTool: ToolDefinition<{ name: string; age: number }, string> = {
  name: 'greet',
  description: 'Greet a person',
  parameters: z.object({
    name: z.string(),
    age: z.number()
  }),
  execute: async (args) => {
    // args 自动推断为 { name: string; age: number }
    return `Hello ${args.name}, age ${args.age}`
  }
}

// 或者使用 z.infer 从 schema 推断类型
const schema = z.object({ name: z.string(), age: z.number() })
const greetTool2: ToolDefinition<z.infer<typeof schema>, string> = {
  name: 'greet',
  description: 'Greet a person',
  parameters: schema,
  execute: async (args) => {
    // args 类型安全
    return `Hello ${args.name}`
  }
}
```

### 辅助工具

提供转换辅助函数：

```typescript
// Zod → OpenAI tool format
// 使用 Zod 4 原生的 z.toJSONSchema()
export function zodToOpenAITool(tool: ToolDefinition) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters, {
        target: 'openapi-3.0'  // OpenAI 兼容 OpenAPI 3.0
      })
    }
  }
}

// 未来可扩展: Zod → Claude tool format 等
```

## 🚨 错误处理

### 错误分类

```typescript
enum InvokeErrorType {
  // 可重试
  NETWORK_ERROR = 'network_error',           // 网络错误，重试
  RATE_LIMIT = 'rate_limit',                 // 限流，重试
  SERVER_ERROR = 'server_error',             // 5xx，重试
  
  // 不可重试  
  AUTH_ERROR = 'auth_error',                 // 认证失败
  CONTEXT_LENGTH = 'context_length',         // Prompt 太长
  CONTENT_FILTER = 'content_filter',         // 内容过滤
  NO_TOOL_CALL = 'no_tool_call',            // 模型未调用 tool
  INVALID_TOOL_ARGS = 'invalid_tool_args',   // Tool 参数不符合 schema
  TOOL_EXECUTION_ERROR = 'tool_execution_error', // Tool 执行出错
  
  UNKNOWN = 'unknown'
}

class InvokeError extends Error {
  type: InvokeErrorType
  retryable: boolean
  statusCode?: number
  rawError?: any
  
  constructor(type: InvokeErrorType, message: string, rawError?: any) {
    super(message)
    this.type = type
    this.retryable = this.isRetryable(type)
    this.rawError = rawError
  }
  
  private isRetryable(type: InvokeErrorType): boolean {
    return [
      InvokeErrorType.NETWORK_ERROR,
      InvokeErrorType.RATE_LIMIT,
      InvokeErrorType.SERVER_ERROR
    ].includes(type)
  }
}
```

### OpenAI Response 处理

根据 OpenAI API 文档和实际错误模式（来自网络搜索）：

**关键：`finish_reason` 的处理**

OpenAI 返回的 `finish_reason` 可能值：
- `'tool_calls'`: ✅ 正常，继续处理
- `'length'`: ⚠️ Token 达到上限，应该报错（搜索结果显示会有 `LengthFinishReasonError`）
- `'content_filter'`: ❌ 内容被过滤
- `'stop'`: ❌ 没调用工具就停止（我们要求必须调用 tool）

```typescript
// 处理 finish_reason
const choice = data.choices[0]
switch (choice.finish_reason) {
  case 'tool_calls':
    // ✅ 正常
    break
  case 'length':
    // ⚠️ Token 超限
    throw new InvokeError(
      InvokeErrorType.CONTEXT_LENGTH,
      'Response truncated: max tokens reached'
    )
  case 'content_filter':
    // ❌ 内容被过滤
    throw new InvokeError(
      InvokeErrorType.CONTENT_FILTER,
      'Content filtered by safety system'
    )
  case 'stop':
    // ❌ 未调用 tool（我们要求必须调用）
    throw new InvokeError(
      InvokeErrorType.NO_TOOL_CALL,
      'Model did not call any tool'
    )
}

// 处理 HTTP 错误
if (!response.ok) {
  if (response.status === 401 || response.status === 403) {
    throw new InvokeError(InvokeErrorType.AUTH_ERROR, 'Authentication failed')
  }
  if (response.status === 429) {
    throw new InvokeError(InvokeErrorType.RATE_LIMIT, 'Rate limit exceeded')
  }
  if (response.status >= 500) {
    throw new InvokeError(InvokeErrorType.SERVER_ERROR, 'Server error')
  }
  throw new InvokeError(InvokeErrorType.UNKNOWN, `HTTP ${response.status}`)
}
```

### 与现有 Retry 逻辑集成

现有的 `withRetry` 函数检查 `error.retryable`：

```typescript
async function withRetry<T>(fn: () => Promise<T>, settings: {...}): Promise<T> {
  // ...
  catch (error) {
    if (error instanceof InvokeError && !error.retryable) {
      throw error  // 不可重试的错误直接抛出
    }
    // 可重试错误继续重试
  }
}
```

## 📦 文件结构

```
src/llms/
├── index.ts              # LLM 类（重构）
├── types.ts              # 核心类型（Message, ToolDefinition, LLMClient, InvokeResult 等）
├── errors.ts             # InvokeError 和错误类型
├── OpenAIClient.ts       # 默认 OpenAI Client 实现
├── utils.ts              # zodToOpenAITool 等辅助函数
└── README.md             # 自定义 Client 使用指南
```

## 🔧 实施步骤

### Phase 1: 核心类型和错误处理

**文件**: `src/llms/types.ts`, `src/llms/errors.ts`

1. 定义 `Message`, `ToolDefinition`, `LLMClient`, `InvokeResult`
2. 定义 `LLMConfig` 接口
3. 实现 `InvokeError` 类和错误类型
4. 测试错误分类

**验收标准**:
- 所有类型导出并有文档
- InvokeError 正确分类 retryable vs non-retryable
- 类型检查通过

### Phase 2: OpenAI Client 实现

**文件**: `src/llms/OpenAIClient.ts`, `src/llms/utils.ts`

1. 实现 `OpenAIClient` 类（实现 `LLMClient` 接口）
   - 构造函数接收 `LLMConfig`
   - `invoke()` 方法实现：
     - 构造 fetch 请求
     - 处理响应解析
     - 解析 tool call
     - 执行 tool
     - 处理所有错误情况
     - **返回包含 cachedTokens 的 usage**
2. 实现 `zodToOpenAITool()` 辅助函数（使用 Zod 4 的 `z.toJSONSchema()`）
3. 自动检测 Claude 并省略 `tool_choice`

**实现草图**:

```typescript
export class OpenAIClient implements LLMClient {
  constructor(private config: LLMConfig) {}
  
  async invoke(
    messages: Message[],
    tools: ToolDefinition[],
    abortSignal?: AbortSignal
  ): Promise<InvokeResult> {
    // 1. 转换 tools 为 OpenAI 格式
    const openaiTools = tools.map(zodToOpenAITool)
    
    // 2. 检测是否为 Claude（自动兼容）
    const isClaude = this.config.model.toLowerCase().includes('claude')
    
    // 3. 调用 API
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        tools: openaiTools,
        // Claude 不支持 tool_choice: 'required'
        ...(isClaude ? {} : { tool_choice: 'required' }),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    signal: abortSignal
  })
  
  // 3. Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    // ... throw InvokeError based on status
  }
  
  const data = await response.json()
  
  // 4. Check finish_reason
  const choice = data.choices[0]
  if (choice.finish_reason !== 'tool_calls') {
    // ... throw appropriate InvokeError
  }
  
  // 5. Parse tool call
  const toolCall = choice.message.tool_calls?.[0]
  if (!toolCall) {
    throw new InvokeError(InvokeErrorType.NO_TOOL_CALL, 'No tool call found')
  }
  
  const toolName = toolCall.function.name
  const tool = tools.find(t => t.name === toolName)
  if (!tool) {
    throw new InvokeError(InvokeErrorType.UNKNOWN, `Tool ${toolName} not found`)
  }
  
  // 6. Parse and validate arguments
  let toolArgs: any
  try {
    toolArgs = JSON.parse(toolCall.function.arguments)
  } catch (e) {
    throw new InvokeError(InvokeErrorType.INVALID_TOOL_ARGS, 'Invalid JSON')
  }
  
  // Validate against zod schema
  const validation = tool.parameters.safeParse(toolArgs)
  if (!validation.success) {
    throw new InvokeError(
      InvokeErrorType.INVALID_TOOL_ARGS,
      `Args validation failed: ${validation.error.message}`,
      validation.error
    )
  }
  
  // 7. Execute tool
  let toolResult: any
  try {
    toolResult = await tool.execute(validation.data)
  } catch (e) {
    throw new InvokeError(
      InvokeErrorType.TOOL_EXECUTION_ERROR,
      `Tool execution failed: ${e.message}`,
      e
    )
  }
  
    // 8. 返回结果（包含 cache tokens）
    // 注意：部分 LLM 接口不完全兼容 OpenAI，需要安全访问 usage
    return {
      toolCall: {
        id: toolCall.id,
        name: toolName,
        args: validation.data
      },
      toolResult,
      usage: {
        // 提供默认值 0，确保兼容性
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
        // 可选字段，不存在时为 undefined
        cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
        reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
      },
      rawResponse: data
    }
  }
}
```

**验收标准**:
- 成功调用 OpenAI 兼容 API
- 正确处理所有错误类型
- 用 Zod 验证 tool 参数
- 执行 tool 并返回结果
- **自动检测 Claude，省略 `tool_choice`**
- **返回包含 cachedTokens 和 reasoningTokens**

### Phase 3: 重构 LLM 类（Client 模式）

**文件**: `src/llms/index.ts`

1. 移除 ai-sdk imports
2. 添加 `client: LLMClient` 属性
3. 默认使用 `new OpenAIClient(config)`
4. 移除 `#model`, `#openai` 属性
5. 简化 `invoke()` 方法
6. **Retry 逻辑保持在 LLM.invoke() 外层**

**新的 LLM 类**:

```typescript
import { OpenAIClient } from './OpenAIClient'
import type { LLMClient, ToolDefinition, Message, InvokeResult } from './types'
import { InvokeError } from './errors'

export class LLM {
  config: Required<LLMConfig>
  id: string
  #bus: EventBus
  
  // 用户可以替换整个 client
  client: LLMClient
  
  constructor(config: LLMConfig, id: string) {
    this.config = parseLLMConfig(config)
    this.id = id
    this.#bus = getEventBus(id)
    
    // 默认使用 OpenAI Client
    this.client = new OpenAIClient({
      model: this.config.modelName,
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    })
  }
  
  async invoke(
    messages: Message[],
    tools: ToolDefinition[],
    abortSignal: AbortSignal
  ): Promise<InvokeResult> {
    // Retry 在外层，统一处理
    return await withRetry(
      async () => {
        // 调用 client（不需要传 config）
        return await this.client.invoke(messages, tools, abortSignal)
      },
      {
        maxRetries: this.config.maxRetries,
        onRetry: (retries: number) => {
          this.#bus.emit('panel:update', {
            type: 'retry',
            displayText: `retry-ing (${retries} / ${this.config.maxRetries})`
          })
        },
        onError: (error: Error, willRetry: boolean) => {
          this.#bus.emit('panel:update', {
            type: 'error',
            displayText: `step failed: ${error.message}`
          })
        }
      }
    )
  }
}
```

**验收标准**:
- LLM 类编译通过，无 ai-sdk imports
- 用户可设置 `llm.client = new MyClient(config)`
- **Retry 逻辑在 LLM.invoke() 外层，client 无需关心**
- Config 封装在 client 内部，invoke 调用更简洁

### Phase 4: 重构 Tool 定义

**文件**: `src/tools/index.ts`

1. 移除 ai-sdk 的 `tool()` 包装器
2. 改为简单对象格式，支持泛型:

```typescript
// Before (ai-sdk)
tools.set('done', tool({
  description: '...',
  inputSchema: zod.object({...}),
  execute: function(input) {...}
}))

// After (支持泛型)
const doneSchema = z.object({
  text: z.string(),
  success: z.boolean().default(true)
})

tools.set('done', {
  name: 'done',
  description: 'Complete task...',
  parameters: doneSchema,
  execute: async function(input: z.infer<typeof doneSchema>) {
    // input 类型安全
    return `Task completed: ${input.text}`
  }
})
```

**验收标准**:
- 所有 tools 转换为新格式
- `tools/` 中无 ai-sdk imports
- Tools 与新 invoke 逻辑配合良好
- 使用泛型提供类型安全

### Phase 5: 重构 PageAgent

**文件**: `src/PageAgent.ts`

1. 更新 `#packMacroTool()` 使用新 tool 格式
2. 更新类型，使用 `Message` 而非 ai-sdk 类型
3. 测试 tool 执行流程

**验收标准**:
- PageAgent 编译通过，无 ai-sdk 类型
- 完整执行流程端到端正常

### Phase 6: 移除依赖和测试

1. 从 `package.json` 移除:
   - `@ai-sdk/openai`
   - `ai`
2. `npm install`
3. 测试 library build: `npm run build:lib`
4. 测试 website build: `npm run build`
5. 多种场景手工测试
6. 更新文档

**测试场景**:
- ✅ 正常 tool call 执行
- ✅ 网络错误重试
- ✅ Abort signal 正常工作
- ✅ Context length 错误
- ✅ 无效 tool 参数（schema 验证）
- ✅ Tool 执行错误
- ✅ 自定义 Client
- ✅ Cache tokens 正确返回

### Phase 7: 文档

**文件**: 
- `src/llms/README.md` - 自定义 Client 使用指南
- 更新主 README，增加示例
- 在 `pages/docs/` 增加示例

**内容**:
- 如何实现自定义 LLMClient
- OpenAI Client（默认）示例
- Claude Client 示例
- 对象字面量实现（简单场景）
- 错误处理指南
- Cache tokens 使用

## 📝 关键信息汇总

### Zod 4 原生支持 JSON Schema

根据 [Zod 文档](https://zod.dev/json-schema) 和搜索结果：

- Zod 4 内置 `z.toJSONSchema()` 方法，无需第三方库
- 支持多种 target: `draft-7`, `draft-2020-12`, `draft-4`, `openapi-3.0`
- 用法示例:

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  age: z.number().int().positive()
})

// OpenAI 使用 OpenAPI 3.0 格式
const jsonSchema = z.toJSONSchema(schema, { target: 'openapi-3.0' })
```

### OpenAI finish_reason 处理

从搜索结果了解到的关键点：

- `finish_reason` 可能值: `'stop'`, `'length'`, `'tool_calls'`, `'content_filter'`
- `'length'` 时会抛出 `LengthFinishReasonError`（来自社区案例）
- 必须检查 `finish_reason` 来判断响应是否完整
- `tool_calls` 是唯一正常情况（对于我们的场景）

### Claude 兼容性方案

**决策**: 方案 A - 自动检测 model name

```typescript
const isClaude = this.config.model.toLowerCase().includes('claude')
const requestBody = {
  model: this.config.model,
  messages,
  tools: openaiTools,
  // Claude 不支持 tool_choice: 'required'，自动省略
  ...(isClaude ? {} : { tool_choice: 'required' }),
}
```

### Client 模式设计

**问题**: 避免每次 invoke 都传 config，但要支持自定义。

**解决方案**: LLMClient 接口模式

- Client 封装 config 和状态（SDK 实例等）
- LLM 类持有 `client: LLMClient`
- 用户替换整个 client 实例
- Retry 在 LLM.invoke() 外层，Client 无需关心

**优势**:
- ✅ 避免每次传 config
- ✅ 支持有状态的 SDK 实例
- ✅ 接口简洁清晰
- ✅ 支持对象字面量实现（简单场景）

### Cache Tokens 支持

从 OpenAI API 响应中提取：
- `usage.prompt_tokens_details.cached_tokens` → `cachedTokens`
- `usage.completion_tokens_details.reasoning_tokens` → `reasoningTokens`（o1 系列）

### Retry 位置

**决策**: 保持在 LLM.invoke() 外层

**理由**:
- 与 Panel UI 集成（显示重试状态）
- Client 实现更简单，无需关心 retry
- 统一的错误处理和重试逻辑
- 用户如需自定义，可设置 `maxRetries = 0`

**关键设计**：
- Retry 和 Panel 交互都在 `LLM` 类中
- `LLMClient` 接口不涉及 UI 相关逻辑
- 用户自定义 client 时完全不需要关心 retry 和 panel

### 类型严格性

**泛型支持**：
- `ToolDefinition<TParams, TResult>` 支持泛型，提供类型安全
- 用户定义 tool 时可指定参数和返回值类型
- 使用 `z.infer<typeof schema>` 从 Zod schema 推断类型

**unknown vs any**：
- `toolResult: TResult = unknown` （支持泛型，默认 unknown）
- `args: Record<string, unknown>`
- `rawResponse?: unknown`

**Usage 鲁棒性**：
- 使用 `data.usage?.prompt_tokens ?? 0` 提供默认值
- 兼容不完全遵循 OpenAI 格式的 LLM 接口

### Message History

- History 由 PageAgent 维护，与之前一致
- Client 是无状态的，只处理单轮调用
- 无需改动现有 history 逻辑

### 向后兼容性

- 不考虑向后兼容
- 可以破坏性变更接口

## ✅ 成功标准

1. ✅ package.json 中零 ai-sdk 依赖
2. ✅ 默认 OpenAIClient 完美工作
3. ✅ 用户可注入自定义 `client: LLMClient`
4. ✅ 所有错误类型正确分类和处理
5. ✅ Retry 逻辑在 LLM.invoke() 外层正常工作
6. ✅ Cache tokens 和 reasoning tokens 正确返回
7. ✅ 类型安全（使用 unknown 而非 any）
8. ✅ Config 封装在 Client 内部，无需每次传递
9. ✅ Bundle size 减少 ~200KB
10. ✅ 文档包含自定义 Client 示例
11. ✅ 所有现有测试通过

## 🚀 未来增强

重构后的可能性：

1. **内置 Claude Client**: 增加 `ClaudeClient` 实现
2. **Streaming**: 为 `LLMClient` 接口添加 streaming 支持
3. **Caching**: 实现 prompt caching（支持的 provider）
4. **Observability**: 添加 logging/monitoring hooks
5. **Retry 策略**: 允许自定义 retry 策略（目前可通过 maxRetries=0 绕过）

---

**状态**: 📋 计划完成，等待实施

**下一步**: 开始 Phase 1 实现
