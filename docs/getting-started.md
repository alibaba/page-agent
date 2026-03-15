# Getting Started with Page Agent

Page Agent is a GUI automation library that runs entirely in-page JavaScript. It reads the DOM as text, calls an LLM API directly from the browser, and executes actions — no server, no build step, no npm required.

Add it to any static HTML page via a CDN script tag.

---

## Simple Demo (OpenAI)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>

  <!-- Your page content here -->

  <script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js
    ?model=gpt-4o
    &baseURL=https://api.openai.com/v1
    &apiKey=YOUR_OPENAI_API_KEY
    &lang=en-US">
  </script>

</body>
</html>
```

The script auto-initializes, mounts a side panel on the page, and the agent is ready to take tasks. The four supported URL params are `model`, `baseURL`, `apiKey`, and `lang` (`en-US` or `zh-CN`).

---

## Using Gemini

Google Gemini exposes an OpenAI-compatible endpoint, so it works with the same script — just change the params:

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js
  ?model=gemini-2.0-flash
  &baseURL=https://generativelanguage.googleapis.com/v1beta/openai
  &apiKey=YOUR_GEMINI_API_KEY
  &lang=en-US">
</script>
```

Get an API key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

| Model | Notes |
|---|---|
| `gemini-2.0-flash` | Fast, cheap, good for most tasks |
| `gemini-2.5-pro` | Best reasoning, use for complex multi-step tasks |
| `gemini-2.0-flash-lite` | Lowest cost |

---

## Using Claude (Anthropic)

Anthropic's API uses a different request/response format than OpenAI's. Because of this, you need a small inline adapter that translates each request before it reaches Anthropic and maps the response back. This code runs entirely in the browser — no proxy, no server.

The demo script exposes `window.PageAgent` (the class) synchronously, then auto-initializes a default instance in a `setTimeout`. The inline script below queues its own `setTimeout` immediately after, which runs second — it disposes the default instance and replaces it with your Claude config.

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>

  <!-- Your page content here -->

  <!-- Step 1: load page-agent — exposes window.PageAgent synchronously -->
  <script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js"></script>

  <!-- Step 2: override auto-init with your Claude config -->
  <script>
    var ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY'

    async function claudeFetch(url, init) {
      var body = JSON.parse(init.body)

      // Anthropic separates the system message from the conversation
      var systemMsg = ''
      var messages = []
      for (var i = 0; i < body.messages.length; i++) {
        if (body.messages[i].role === 'system') {
          systemMsg = body.messages[i].content
        } else {
          messages.push({ role: body.messages[i].role, content: body.messages[i].content })
        }
      }

      // Anthropic's tool schema uses input_schema instead of parameters
      var tools = (body.tools || []).map(function(t) {
        return {
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        }
      })

      // Call Anthropic directly from the browser
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          // Required by Anthropic when calling their API directly from a browser
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: body.model,
          max_tokens: 8096,
          system: systemMsg,
          messages: messages,
          tools: tools,
          tool_choice: { type: 'any' },
        }),
        signal: init.signal,
      })

      if (!res.ok) return res  // pass HTTP errors through to page-agent's error handling

      var data = await res.json()

      // Translate Anthropic response back to OpenAI shape for page-agent
      var toolUse = null
      for (var i = 0; i < (data.content || []).length; i++) {
        if (data.content[i].type === 'tool_use') { toolUse = data.content[i]; break }
      }

      return new Response(JSON.stringify({
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            tool_calls: toolUse ? [{
              id: toolUse.id,
              type: 'function',
              function: {
                name: toolUse.name,
                arguments: JSON.stringify(toolUse.input),
              },
            }] : [],
          },
        }],
        usage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // The demo script above auto-inits a default instance in a setTimeout.
    // This setTimeout is queued after it, so it runs second — disposing
    // the default instance and replacing it with the Claude config.
    setTimeout(function() {
      if (window.pageAgent) window.pageAgent.dispose()

      window.pageAgent = new window.PageAgent({
        baseURL: 'https://api.anthropic.com',  // not used directly; claudeFetch handles the call
        apiKey: ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-5',
        customFetch: claudeFetch,
        language: 'en-US',
      })
      window.pageAgent.panel.show()
    })
  </script>

</body>
</html>
```

Get an API key at [console.anthropic.com](https://console.anthropic.com/).

| Model | Notes |
|---|---|
| `claude-sonnet-4-5` | Best balance of speed and capability |
| `claude-opus-4-5` | Strongest reasoning, slower |
| `claude-haiku-4-5-20251001` | Fastest and cheapest |

---

## Running a Task from JavaScript

After the agent is initialized, you can run tasks programmatically from any script on the page:

```html
<script>
  document.getElementById('my-button').addEventListener('click', async function() {
    var result = await window.pageAgent.execute('Fill in the search box and search for "hello"')
    console.log(result.success) // true | false
    console.log(result.data)    // agent's summary of what it did
  })
</script>
```

---

## Configuration Reference

The following options can be passed to `new window.PageAgent(config)` in an inline script. The URL-param approach (used by the auto-init demo) only supports `model`, `baseURL`, `apiKey`, and `lang`.

| Option | Default | Description |
|---|---|---|
| `model` | — | Model name |
| `baseURL` | — | Base URL of the OpenAI-compatible API |
| `apiKey` | — | API key |
| `language` | `'zh-CN'` | Panel language: `'en-US'` or `'zh-CN'` |
| `maxSteps` | `40` | Max agent steps per task |
| `temperature` | `0.7` | LLM temperature |
| `maxRetries` | `2` | LLM call retry count on failure |
| `customFetch` | — | Override HTTP requests (used for non-OpenAI APIs like Claude) |
| `instructions.system` | — | Persistent instructions applied to every task |
| `instructions.getPageInstructions` | — | `function(url)` returning per-URL instructions |
| `customTools` | — | Add, override, or remove built-in agent tools |
| `transformPageContent` | — | `function(content)` to transform DOM text before sending to LLM |
| `customSystemPrompt` | — | Fully replace the default system prompt |
| `experimentalScriptExecutionTool` | `false` | Enable JS execution tool |
| `experimentalLlmsTxt` | `false` | Fetch `/llms.txt` from page origin and include as context |

---

## Listening to Agent Events

```html
<script>
  // Wait for the agent to be ready (it's created in a setTimeout by the demo script)
  setTimeout(function() {
    // Status changes: 'idle' → 'running' → 'completed' | 'error'
    window.pageAgent.addEventListener('statuschange', function() {
      console.log('Status:', window.pageAgent.status)
    })

    // History updated (persistent agent memory)
    window.pageAgent.addEventListener('historychange', function() {
      console.log('History:', window.pageAgent.history)
    })

    // Real-time activity (transient, for live UI feedback)
    window.pageAgent.addEventListener('activity', function(e) {
      // e.detail.type: 'thinking' | 'executing' | 'executed' | 'retrying' | 'error'
      console.log(e.detail)
    })
  })
</script>
```

---

## Cleanup

```html
<script>
  // Stop current task (agent stays reusable)
  window.pageAgent.stop()

  // Fully tear down the agent and its DOM overlays
  window.pageAgent.dispose()
</script>
```
