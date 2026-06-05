# Plan: Unified Abort Signal for Tool Cancellation

## Problem

When `stop()` or `dispose()` is called while a tool is executing, the agent's main loop remains blocked on `await tool.execute(...)`. The abort signal only reaches the LLM HTTP fetch — it never reaches tool execution or async callbacks like `onAskUser`.

Consequence: status never transitions, UI cannot clean up, panel cannot close. PR #188 patched this for `ask_user` alone by listening to `statuschange`/`dispose` events in Panel — a per-tool band-aid that doesn't scale.

### Current abort coverage

| Path                             | Receives abort?                     |
| -------------------------------- | ----------------------------------- |
| LLM HTTP request (`fetch`)       | Yes — signal passed to fetch        |
| MacroTool entry guard (line 382) | Yes — manual `signal.aborted` check |
| **In-flight tool execution**     | No                                  |
| `onAskUser` Promise              | No                                  |
| `wait` setTimeout                | No                                  |
| Custom tool async work           | No                                  |

## Design Principles

- **Expose errors, don't mask them.** If a tool doesn't respect abort, that's a bug in the tool. The framework should surface it loudly, not silently work around it.
- **AbortSignal as the single cancellation primitive.** Standard web platform pattern. All async work subscribes to it.
- **Internal tools must respect signal.** This solves the original issue (ask_user, wait). No forced unblock needed.
- **Abort trigger points must remain controlled.** The entire cancellation system hinges on this one signal. Its trigger conditions must be deliberate and auditable. See "Abort trigger audit" below.

## Design

Two layers, plus a diagnostic mechanism:

### Layer 1: Expose signal to tools (cooperative cancellation)

Pass signal into every tool execution. Well-behaved tools self-cancel immediately.

**Tool signature change:**

```ts
// Before
execute: (this: PageAgentCore, args: TParams) => Promise<string>

// After
execute: (this: PageAgentCore, args: TParams, ctx: { signal: AbortSignal }) => Promise<string>
```

Backward-compatible — tools that ignore ctx still compile and run.

**`onAskUser` signature change:**

```ts
// Before
onAskUser?: (question: string) => Promise<string>

// After
onAskUser?: (question: string, options?: { signal: AbortSignal }) => Promise<string>
```

### Layer 2: Abort deadline warning (diagnostic, not rescue)

Instead of silently unblocking the main loop when a tool ignores signal, detect the violation and warn loudly.

```ts
// packages/core/src/utils/index.ts
export function onAbortTimeout(signal: AbortSignal, ms: number, callback: () => void): () => void {
    if (signal.aborted) {
        callback()
        return () => {}
    }
    let timer: ReturnType<typeof setTimeout> | null = null
    const onAbort = () => {
        timer = setTimeout(callback, ms)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    return () => {
        signal.removeEventListener('abort', onAbort)
        if (timer) clearTimeout(timer)
    }
}
```

Applied at the tool execution site in `#packMacroTool`:

```ts
// PageAgentCore.ts — inside macroTool.execute
const signal = this.#abortController.signal

const unsubscribe = onAbortTimeout(signal, 3000, () => {
    console.warn(
        `[PageAgent] Tool "${toolName}" did not respond to abort signal within 3s. ` +
            `Tools MUST honor ctx.signal for proper cancellation. ` +
            `See: https://page-agent.dev/docs/custom-tools#abort`
    )
})

const result = await tool.execute.bind(this)(toolInput, { signal })
unsubscribe()
```

**This does NOT unblock the loop.** If a custom tool hangs, the agent hangs — visibly. The warning tells the developer exactly which tool is at fault. Hiding the problem (via forced unblock) would make bugs harder to diagnose and give false confidence that stop() always works instantly.

### Layer 3 (future): PageController guard

Not implemented now. Future enhancement: `PageController.arm(signal)` + `#assertAlive()` at the top of every public method. Would prevent orphaned tools from executing DOM side-effects. Adds hardening for custom tools that ignore signal but still call controller methods.

## Abort trigger audit

`#abortController.abort()` is called from exactly 4 sites:

| Call site         | Context                                                                | Can fire during tool execution?                   |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| `stop()`          | User clicks stop                                                       | Yes — this is the primary cancel path             |
| `dispose()`       | Agent destroyed                                                        | Yes — equivalent to stop + teardown               |
| `execute()` entry | Reset before new task, immediately followed by `new AbortController()` | No — new signal replaces old before any tool runs |
| `#onDone()`       | Task already finished (loop exited)                                    | No — defensive cleanup, no tool in flight         |

Only `stop()` and `dispose()` can fire the signal while a tool is executing. Both represent explicit, user-initiated intent to cancel.

**Invariant:** No code path should call `abort()` as a side-effect, cleanup shortcut, or error-recovery mechanism. If a new call site is ever added, it must be audited against this table. Adding an accidental abort trigger would silently kill in-flight tools — a class of bug that's extremely hard to reproduce and diagnose.

## Changes Required

### `packages/core/src/utils/index.ts`

- Add `onAbortTimeout()` utility.

### `packages/core/src/tools/index.ts`

- Update `PageAgentTool` interface: add `ctx: { signal: AbortSignal }` as second param to `execute`.
- `ask_user` tool: listen to signal, reject with AbortError on abort. Pass `{ signal }` to `this.onAskUser`.
- `wait` tool: race setTimeout against signal. On abort, resolve immediately with AbortError.

### `packages/core/src/PageAgentCore.ts`

- Expose `get abortSignal(): AbortSignal`.
- In `#packMacroTool` execute: pass `{ signal }` as ctx to tool. Add `onAbortTimeout` diagnostic.
- Keep the manual `if (signal.aborted) throw` guard at entry (cheap fast-path before tool runs).
- `stop()`: remains simple — `abort()` + cleanup. No `#setStatus('error')` hack. Status transitions naturally when the tool throws AbortError → catch block → `#onDone(false)`.
- Update `onAskUser` type to accept optional `{ signal }`.

### `packages/ui/src/panel/Panel.ts`

- `#askUser`: subscribe to signal abort → clean up question card, reset state, reject promise.
- No need for `statuschange`/`dispose` event listeners for cancellation (PR #188 approach eliminated).

### `packages/core/src/types.ts`

- Update `onAskUser` type in public API.

## Error identification

Unify abort detection in the main loop catch block:

```ts
const isAbortError = this.#abortController.signal.aborted
```

Use `signal.aborted` as the canonical check — it's always true when we intentionally stop, regardless of how the error was thrown or wrapped.

## Trade-offs

| Decision                                         | Rationale                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| No forced unblock (`abortable` rejected)         | Exposing misbehaving tools is better than masking their bugs. Developers see the warning and fix their tool. |
| Internal tools guarantee signal compliance       | Solves the original issue without framework-level workarounds.                                               |
| PageController guard deferred                    | Adds coupling. Not needed when tools comply with signal. Revisit if custom tool ecosystem grows.             |
| `ctx` as second param (not merged into `this`)   | Keeps tool `this` clean as PageAgentCore. Signal is per-invocation context, not agent identity.              |
| `onAskUser` signal is optional in options object | Non-breaking for existing consumers.                                                                         |
| 3s deadline for warning                          | Long enough for legitimate async (DOM animations), short enough to surface bugs quickly.                     |

## Validation

- `stop()` during `ask_user` → signal fires → Panel rejects promise → tool throws → loop catches → `#onDone(false)` → status = error, panel closes.
- `stop()` during `wait` → signal fires → setTimeout race resolves → tool throws → same flow.
- `stop()` during `click_element` → PageController ops are near-instant, returns before timeout. If somehow blocked, the 3s warning fires.
- `dispose()` during any tool → same as stop, plus dispose event fires after.
- Non-compliant custom tool → loop blocks, 3s warning prints tool name, developer knows exactly what to fix.
- Normal execution (no abort) → zero behavioral change, `onAbortTimeout` is cleaned up before it fires.
