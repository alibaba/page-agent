# Getting Started with Page Agent

Page Agent is a GUI automation library that runs entirely in-page JavaScript. It reads the DOM as text, calls an LLM, and executes browser actions — no screenshots, no headless browser, no extension required for basic usage.

---

## Installation

```bash
npm install page-agent zod
```

---

## Simple Demo

```ts
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  language: 'en-US',
})

// Show the built-in panel UI so a user can type tasks
agent.panel.show()

// Or run a task programmatically
const result = await agent.execute('Find the login button and click it')
console.log(result.success) // true | false
console.log(result.data)    // agent's summary of what it did
```

Page Agent calls the LLM API directly from the browser on every step. No server, no proxy, no background script.

---

## Using Gemini

Google Gemini exposes an OpenAI-compatible endpoint, so it works with zero adapter code — just change `baseURL` and `model`.

```ts
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-2.0-flash',
  language: 'en-US',
})

agent.panel.show()
```

| Model | Notes |
|---|---|
| `gemini-2.0-flash` | Fast, cheap, good for most tasks |
| `gemini-2.5-pro` | Best reasoning, use for complex multi-step tasks |
| `gemini-2.0-flash-lite` | Lowest cost |

Get an API key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

---

## Using Claude (Anthropic)

Anthropic's API uses a different request/response format from OpenAI's. Page Agent's `customFetch` option lets you intercept each API call, reformat it for Anthropic, and return the result — all in your own in-page code, no proxy server needed.

```ts
import { PageAgent } from 'page-agent'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function claudeFetch(_url: string, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(init?.body as string)

  // Anthropic separates the system message from the conversation
  const systemMsg = body.messages.find((m: any) => m.role === 'system')?.content ?? ''
  const messages = body.messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Anthropic's tool format differs from OpenAI's
  const tools = (body.tools ?? []).map((t: any) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))

  // Call Anthropic directly from the browser
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: 8096,
      system: systemMsg,
      messages,
      tools,
      tool_choice: { type: 'any' },
    }),
    signal: init?.signal,
  })

  if (!res.ok) {
    return res // let Page Agent handle HTTP errors normally
  }

  const data = await res.json()

  // Translate the Anthropic response back to OpenAI shape for Page Agent
  const toolUse = data.content?.find((b: any) => b.type === 'tool_use')
  const openaiShape = {
    choices: [
      {
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          tool_calls: toolUse
            ? [
                {
                  id: toolUse.id,
                  type: 'function',
                  function: {
                    name: toolUse.name,
                    arguments: JSON.stringify(toolUse.input),
                  },
                },
              ]
            : [],
        },
      },
    ],
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  }

  return new Response(JSON.stringify(openaiShape), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const agent = new PageAgent({
  baseURL: 'https://api.anthropic.com', // not used directly, required by config type
  apiKey: ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
  customFetch: claudeFetch,
  language: 'en-US',
})

agent.panel.show()
```

The `anthropic-dangerous-direct-browser-access` header is required by Anthropic when calling their API directly from a browser (instead of a server). It acknowledges that the API key will be visible in client-side code.

| Model | Notes |
|---|---|
| `claude-sonnet-4-5` | Best balance of speed and capability |
| `claude-opus-4-5` | Strongest reasoning, slower |
| `claude-haiku-4-5-20251001` | Fastest and cheapest |

Get an API key at [console.anthropic.com](https://console.anthropic.com/).

---

## Configuration Reference

All options passed to `new PageAgent(config)`:

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `baseURL` | `string` | yes | — | Base URL of the OpenAI-compatible API |
| `apiKey` | `string` | yes | — | API key |
| `model` | `string` | yes | — | Model name |
| `language` | `'en-US' \| 'zh-CN'` | no | `'zh-CN'` | Panel and agent response language |
| `maxSteps` | `number` | no | `40` | Max agent steps per task |
| `temperature` | `number` | no | `0.7` | LLM temperature |
| `maxRetries` | `number` | no | `2` | LLM call retry count on failure |
| `customFetch` | `typeof fetch` | no | — | Override HTTP requests (useful for non-OpenAI APIs) |
| `instructions.system` | `string` | no | — | Persistent system-level instructions for the agent |
| `instructions.getPageInstructions` | `(url) => string` | no | — | Per-URL instructions called before each step |
| `customTools` | `Record<string, tool \| null>` | no | — | Add, override, or remove built-in tools |
| `transformPageContent` | `(content) => string` | no | — | Transform DOM content before sending to LLM (e.g. mask PII) |
| `customSystemPrompt` | `string` | no | — | Completely replace the default system prompt |
| `experimentalScriptExecutionTool` | `boolean` | no | `false` | Enable JS execution tool |
| `experimentalLlmsTxt` | `boolean` | no | `false` | Fetch `/llms.txt` from page origin and include as context |

---

## Listening to Agent Events

`PageAgent` extends `EventTarget`. You can observe what the agent is doing:

```ts
// Status changes: 'idle' → 'running' → 'completed' | 'error'
agent.addEventListener('statuschange', () => {
  console.log('Status:', agent.status)
})

// History updated (persistent agent memory)
agent.addEventListener('historychange', () => {
  console.log('History:', agent.history)
})

// Real-time activity (transient, for live UI feedback)
agent.addEventListener('activity', (e) => {
  const activity = (e as CustomEvent).detail
  // activity.type: 'thinking' | 'executing' | 'executed' | 'retrying' | 'error'
  console.log(activity)
})
```

---

## Cleanup

```ts
// Stop current task (agent stays reusable)
agent.stop()

// Fully tear down the agent and its DOM overlays
agent.dispose()
```
