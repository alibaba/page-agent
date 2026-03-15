# Getting Started with Page Agent

Page Agent is a GUI automation library that runs entirely in-page JavaScript. It reads the DOM as text, calls an LLM API directly from the browser, and executes actions — no server, no build step, no npm required.

Add it to any static HTML page via a CDN script tag.

---

## Simple Demo

Add one script tag to your page. No API key, no configuration needed — the demo uses Alibaba's hosted Qwen model out of the box:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>

  <!-- Your page content here -->

  <script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js"></script>

</body>
</html>
```

When the script loads it:
1. Creates a `PageAgent` instance connected to Alibaba's demo Qwen backend
2. Calls `panel.show()` — a side panel UI appears on your webpage
3. Exposes `window.pageAgent` so you can call `window.pageAgent.execute(task)` from the console or your own scripts

The agent panel lets a user type a task in natural language (e.g. "click the login button" or "fill in the form with test data") and watch the agent execute it step by step on the live page.

> **Note:** The built-in demo backend is a shared public endpoint intended for quick testing. For production use, supply your own model and API key via URL params (see below).

---

## Supplying Your Own Model

The script reads configuration from its own URL query params. All params are optional — omitting any falls back to the Alibaba demo defaults.

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.5.7/dist/iife/page-agent.demo.js
  ?model=YOUR_MODEL
  &baseURL=YOUR_BASE_URL
  &apiKey=YOUR_API_KEY
  &lang=en-US">
</script>
```

| Param | Default | Description |
|---|---|---|
| `model` | `qwen3.5-plus` | Model name |
| `baseURL` | Alibaba demo endpoint | Base URL of an OpenAI-compatible API |
| `apiKey` | `NA` | API key (the demo endpoint requires none) |
| `lang` | `zh-CN` | Panel language: `en-US` or `zh-CN` |

---

## Using Gemini

Google Gemini exposes an OpenAI-compatible endpoint, so it works with the same script and URL params — no extra code needed:

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

## Running a Task from JavaScript

After the agent initializes, `window.pageAgent` is available. You can trigger tasks from any script on the page:

```html
<script>
  // The agent is created in a setTimeout by the demo script,
  // so wrap calls in your own setTimeout to ensure it's ready.
  setTimeout(function() {
    document.getElementById('my-button').addEventListener('click', async function() {
      var result = await window.pageAgent.execute('Fill in the search box and search for "hello"')
      console.log(result.success) // true | false
      console.log(result.data)    // agent's summary of what it did
    })
  })
</script>
```

---

## Configuration Reference

When creating an instance manually (instead of using the auto-init demo), the full set of options is:

| Option | Default | Description |
|---|---|---|
| `model` | — | Model name |
| `baseURL` | — | Base URL of the OpenAI-compatible API |
| `apiKey` | — | API key |
| `language` | `'zh-CN'` | Panel language: `'en-US'` or `'zh-CN'` |
| `maxSteps` | `40` | Max agent steps per task |
| `temperature` | `0.7` | LLM temperature |
| `maxRetries` | `2` | LLM call retry count on failure |
| `customFetch` | — | Override HTTP requests (for APIs with non-OpenAI format) |
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
  setTimeout(function() {
    // Status changes: 'idle' → 'running' → 'completed' | 'error'
    window.pageAgent.addEventListener('statuschange', function() {
      console.log('Status:', window.pageAgent.status)
    })

    // History updated (persistent agent memory, shown in the panel)
    window.pageAgent.addEventListener('historychange', function() {
      console.log('History:', window.pageAgent.history)
    })

    // Real-time activity (transient — what the agent is doing right now)
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
  // Stop current task (agent stays reusable, panel stays visible)
  window.pageAgent.stop()

  // Fully tear down the agent and remove the panel from the page
  window.pageAgent.dispose()
</script>
```
