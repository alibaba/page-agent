# Getting Started with Page Agent

Page Agent is a GUI automation library that runs entirely in-page JavaScript. It reads the DOM as text, calls an LLM, and executes browser actions — no screenshots, no headless browser, no extension required for basic usage.

---

## Simple Demo

The fastest way to try Page Agent is by dropping a single script tag into any page.

### Via CDN (no build step)

```html
<!DOCTYPE html>
<html>
  <head><title>My App</title></head>
  <body>
    <h1>Hello World</h1>
    <button id="btn">Click me</button>

    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/page-agent/dist/iife/page-agent.demo.js?
           model=gpt-4o&
           baseURL=https://api.openai.com/v1&
           apiKey=YOUR_KEY"
    ></script>
  </body>
</html>
```

The demo script auto-initializes a `PageAgent`, mounts a side panel to the page, and exposes `window.pageAgent` for console access. URL query params configure the model.

> **Note:** Never put real API keys in client-side HTML you deploy publicly. Use this approach for local development only.

### Via npm (recommended for projects)

Install the package:

```bash
npm install page-agent zod
```

Initialize in your app entry point:

```ts
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  model: 'gpt-4o',
  baseURL: 'https://api.openai.com/v1',
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  language: 'en-US',
})

// Show the built-in panel UI
agent.panel.show()
```

Run a task programmatically:

```ts
const result = await agent.execute('Find the login button and click it')

console.log(result.success) // true | false
console.log(result.data)    // agent's summary of what it did
```

---

## Using Gemini

Google Gemini exposes an OpenAI-compatible endpoint. Point `baseURL` at it and use a `gemini-*` model name.

```ts
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'YOUR_GEMINI_API_KEY',   // from https://aistudio.google.com/app/apikey
  model: 'gemini-2.0-flash',
  language: 'en-US',
})

agent.panel.show()
```

**Recommended Gemini models:**

| Model | Notes |
|---|---|
| `gemini-2.0-flash` | Fast and cheap, good for most tasks |
| `gemini-2.5-pro` | Best reasoning, use for complex multi-step tasks |
| `gemini-2.0-flash-lite` | Lowest cost option |

---

## Using Claude (Anthropic)

Anthropic's API is not OpenAI-compatible natively, but you can bridge it using the `customFetch` option to rewrite requests/responses, or use a proxy that exposes an OpenAI-compatible interface.

### Option A — AWS Bedrock or a proxy (simplest)

If you have access to an OpenAI-compatible Claude endpoint (e.g. via AWS Bedrock with a compatibility layer, or a self-hosted proxy like [litellm](https://github.com/BerriAI/litellm)):

```ts
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  baseURL: 'https://your-litellm-proxy.example.com/v1',
  apiKey: 'YOUR_PROXY_KEY',
  model: 'claude-sonnet-4-5',   // model name as exposed by the proxy
  language: 'en-US',
})

agent.panel.show()
```

### Option B — `customFetch` adapter (no proxy needed)

Page Agent sends standard OpenAI-format requests. You can intercept them with `customFetch` and translate to the Anthropic API format:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { PageAgent } from 'page-agent'

const anthropic = new Anthropic({ apiKey: 'YOUR_ANTHROPIC_API_KEY' })

/**
 * Translate an OpenAI-format chat/completions request to Anthropic Messages API.
 * Returns a Response object shaped like an OpenAI response so Page Agent
 * can parse it without changes.
 */
async function claudeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(init?.body as string)

  // Separate system message from conversation
  const systemMsg = body.messages.find((m: any) => m.role === 'system')?.content ?? ''
  const messages = body.messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({ role: m.role, content: m.content }))

  // Convert OpenAI tool definitions to Anthropic format
  const tools = (body.tools ?? []).map((t: any) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))

  const response = await anthropic.messages.create({
    model: body.model,
    max_tokens: 8096,
    system: systemMsg,
    messages,
    tools,
    tool_choice: { type: 'any' },
  })

  // Map Anthropic response back to OpenAI shape
  const toolUse = response.content.find((b: any) => b.type === 'tool_use')
  const openaiResponse = {
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
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  }

  return new Response(JSON.stringify(openaiResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const agent = new PageAgent({
  baseURL: 'https://api.anthropic.com',  // not actually used, but required by config
  apiKey: 'YOUR_ANTHROPIC_API_KEY',      // not used either (SDK handles auth)
  model: 'claude-sonnet-4-5',
  customFetch: claudeFetch,
  language: 'en-US',
})

agent.panel.show()
```

**Recommended Claude models:**

| Model | Notes |
|---|---|
| `claude-sonnet-4-5` | Best balance of speed and capability |
| `claude-opus-4-5` | Strongest reasoning, slower |
| `claude-haiku-4-5-20251001` | Fastest and cheapest |

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
