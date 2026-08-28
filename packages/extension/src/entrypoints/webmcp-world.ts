/**
 * Main-world bridge for WebMCP.
 *
 * @remarks
 * Content scripts run in an isolated world, where `document.modelContext` is
 * invisible — the page's WebMCP tools simply do not exist from there. This script
 * is injected into the MAIN world so it can reach the real `modelContext`, and it
 * answers `postMessage` requests from our content script.
 *
 * Kept deliberately tiny and free of imports: it executes inside the customer's
 * page, so every byte and every global it touches is the page's business.
 */

interface WebMCPToolDescriptor {
	name: string
	description: string
	inputSchema: unknown
	annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
	origin?: string
	title?: string
}

interface ModelContextLike extends EventTarget {
	getTools?: (options?: { fromOrigins?: string[] }) => Promise<WebMCPToolDescriptor[]>
	executeTool?: (
		tool: WebMCPToolDescriptor | string,
		args: unknown,
		options?: { signal?: AbortSignal }
	) => Promise<unknown>
}

const REQUEST = 'EB_AGENT_WEBMCP_REQUEST'
const RESPONSE = 'EB_AGENT_WEBMCP_RESPONSE'

export default defineUnlistedScript(() => {
	/** Read on every call: the origin trial can activate after this script runs. */
	function getModelContext(): ModelContextLike | null {
		const fromDocument = (document as unknown as { modelContext?: ModelContextLike }).modelContext
		if (fromDocument) return fromDocument
		// Deprecated in Chrome 150, still present in 149.
		const fromNavigator = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext
		return fromNavigator ?? null
	}

	function reply(id: number, payload: unknown, error?: string): void {
		window.postMessage({ channel: RESPONSE, id, payload, error }, '*')
	}

	window.addEventListener('message', (event: MessageEvent) => {
		if (event.source !== window) return

		const data: unknown = event.data
		if (typeof data !== 'object' || data === null) return

		const message = data as { channel?: string; id?: number; action?: string; payload?: any }
		if (message.channel !== REQUEST || typeof message.id !== 'number') return

		const id = message.id
		const context = getModelContext()

		switch (message.action) {
			case 'is_supported': {
				reply(id, {
					supported: Boolean(context),
					canDiscover: typeof context?.getTools === 'function',
				})
				return
			}

			case 'get_tools': {
				if (typeof context?.getTools !== 'function') {
					reply(id, [])
					return
				}
				context
					.getTools()
					.then((tools) => {
						// Structured-clone the descriptors: functions and exotic objects
						// cannot cross postMessage, and we only need the metadata.
						reply(
							id,
							(Array.isArray(tools) ? tools : []).map((tool) => ({
								name: tool?.name ?? '',
								description: tool?.description ?? '',
								inputSchema: tool?.inputSchema ?? { type: 'object', properties: {} },
								annotations: tool?.annotations,
								origin: tool?.origin,
								title: tool?.title,
							}))
						)
					})
					.catch((error: unknown) => reply(id, null, String(error)))
				return
			}

			case 'execute_tool': {
				if (typeof context?.executeTool !== 'function') {
					reply(id, null, 'WebMCP executeTool is not available on this page.')
					return
				}
				context
					.executeTool(message.payload?.name, message.payload?.args)
					.then((result) => {
						// `executeTool` resolves null when the call caused a navigation.
						reply(id, result === null ? { navigated: true } : result)
					})
					.catch((error: unknown) => reply(id, null, String(error)))
				return
			}

			default:
				return
		}
	})

	// Tools are dynamic; tell the content script when the page's set changes.
	const context = getModelContext()
	if (context && typeof context.addEventListener === 'function') {
		context.addEventListener('toolchange', () => {
			window.postMessage({ channel: RESPONSE, id: -1, payload: { toolchange: true } }, '*')
		})
	}

	window.postMessage({ channel: RESPONSE, id: 0, payload: { ready: true } }, '*')
})
