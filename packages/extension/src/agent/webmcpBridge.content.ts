/**
 * Content-script half of the WebMCP main-world bridge.
 *
 * @remarks
 * Injects `webmcp-world.js` into the page's MAIN world on first use and exposes a
 * promise-based API over `postMessage`. Injection is lazy: a tab that the agent
 * never touches pays nothing.
 */

export interface BridgedWebMCPTool {
	name: string
	description: string
	inputSchema: any
	annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
	origin?: string
	title?: string
}

const REQUEST = 'EB_AGENT_WEBMCP_REQUEST'
const RESPONSE = 'EB_AGENT_WEBMCP_RESPONSE'
const TIMEOUT_MS = 5_000

let nextId = 1
let injected: Promise<void> | null = null
let toolsChanged = false

/** Whether the page's tool set changed since the last time this was read. */
export function consumeToolChange(): boolean {
	const changed = toolsChanged
	toolsChanged = false
	return changed
}

function listenForToolChanges(): void {
	window.addEventListener('message', (event: MessageEvent) => {
		if (event.source !== window) return
		const data = event.data as { channel?: string; payload?: { toolchange?: boolean } } | null
		if (data?.channel === RESPONSE && data.payload?.toolchange) toolsChanged = true
	})
}

async function ensureInjected(): Promise<void> {
	injected ??= (async () => {
		listenForToolChanges()
		await injectScript('/webmcp-world.js')
	})()

	return injected
}

/**
 * Send one request to the main world and await its reply.
 * Times out rather than hanging: the page may have no bridge at all (injection
 * blocked by CSP), and the agent must keep going with DOM automation.
 */
async function call<T>(action: string, payload?: unknown): Promise<T> {
	await ensureInjected()

	const id = nextId++

	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => {
			window.removeEventListener('message', onMessage)
			reject(new Error(`WebMCP bridge timed out on "${action}"`))
		}, TIMEOUT_MS)

		function onMessage(event: MessageEvent) {
			if (event.source !== window) return
			const data = event.data as {
				channel?: string
				id?: number
				payload?: unknown
				error?: string
			} | null
			if (data?.channel !== RESPONSE || data.id !== id) return

			window.clearTimeout(timer)
			window.removeEventListener('message', onMessage)

			if (data.error) reject(new Error(data.error))
			else resolve(data.payload as T)
		}

		window.addEventListener('message', onMessage)
		window.postMessage({ channel: REQUEST, id, action, payload }, '*')
	})
}

export async function isWebMCPSupported(): Promise<{ supported: boolean; canDiscover: boolean }> {
	try {
		return await call<{ supported: boolean; canDiscover: boolean }>('is_supported')
	} catch {
		return { supported: false, canDiscover: false }
	}
}

export async function getWebMCPTools(): Promise<BridgedWebMCPTool[]> {
	try {
		return (await call<BridgedWebMCPTool[]>('get_tools')) ?? []
	} catch (error) {
		console.debug('[webmcp-bridge] getTools failed', error)
		return []
	}
}

export async function executeWebMCPTool(name: string, args: unknown): Promise<unknown> {
	return call<unknown>('execute_tool', { name, args })
}
