/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * WebMCP adapter — the ONLY module that touches `modelContext` directly.
 *
 * @remarks
 * WebMCP is an unshipped, actively changing proposal (W3C Web Machine Learning CG,
 * Chrome origin trial 149→156). Everything experimental about it is quarantined here
 * so the rest of eb-agent depends on the Capability layer instead of a browser API
 * that is explicitly "subject to change".
 *
 * Known moving parts this adapter absorbs:
 * - The entry point moved from `navigator.modelContext` to `document.modelContext`
 *   (`navigator` deprecated in Chrome 150). Both are probed.
 * - `execute` return shape differs between the spec explainer
 *   (`{ content: [{ type: 'text', text }] }`) and Chrome's imperative-API docs
 *   (a bare string). Both are accepted, in and out.
 * - Unregistration via `AbortSignal` needs Chrome 153+; older builds get a
 *   best-effort `unregisterTool`/`provideContext` fallback.
 *
 * @see https://github.com/webmachinelearning/webmcp
 * @see https://developer.chrome.com/docs/ai/webmcp/imperative-api
 */
import type { Capability, CapabilityResult, JSONSchema } from '../types'
import { BUDGETS, normalizeResult, resolveAnnotations, truncate } from '../utils'

/** A tool as declared to (or discovered from) WebMCP. */
export interface WebMCPToolDescriptor {
	name: string
	description: string
	inputSchema: JSONSchema
	annotations?: {
		readOnlyHint?: boolean
		untrustedContentHint?: boolean
	}
	/** Present on discovered tools; identifies the declaring origin. */
	origin?: string
	title?: string
}

interface WebMCPToolRegistration extends WebMCPToolDescriptor {
	execute: (input: any, context?: { signal?: AbortSignal }) => unknown
}

export interface RegisterOptions {
	signal?: AbortSignal
	/** Secure origins allowed to discover this tool. Omit to keep it same-origin. */
	exposedTo?: string[]
}

/**
 * What the capability layer needs from a WebMCP implementation.
 *
 * @remarks
 * Extracted so the surface can be backed by something other than this page's own
 * `document.modelContext`. The browser extension, for instance, runs its agent in
 * an isolated world where `modelContext` is invisible, and supplies a port that
 * proxies to a main-world script over `postMessage`.
 */
export interface WebMCPPort {
	/**
	 * Optional async warm-up. Ports that must probe another context (rather than
	 * read a global synchronously) resolve their support state here; the capability
	 * layer awaits it before consulting {@link isSupported} or {@link canDiscover}.
	 */
	ready?(): Promise<void>
	isSupported(): boolean
	canDiscover(): boolean
	getTools(fromOrigins?: string[]): Promise<WebMCPToolDescriptor[]>
	executeTool(
		tool: WebMCPToolDescriptor | string,
		args: unknown,
		signal?: AbortSignal
	): Promise<CapabilityResult>
	registerCapability(capability: Capability, options?: RegisterOptions): Promise<boolean>
	unregisterTool(name: string): Promise<boolean>
	registeredNames(): string[]
	onToolChange(listener: () => void): () => void
	dispose(): Promise<void>
}

/** Structural type for the `modelContext` object; intentionally permissive. */
interface ModelContextLike extends EventTarget {
	registerTool?: (tool: WebMCPToolRegistration, options?: RegisterOptions) => Promise<unknown>
	unregisterTool?: (name: string) => Promise<unknown>
	getTools?: (options?: { fromOrigins?: string[] }) => Promise<WebMCPToolDescriptor[]>
	executeTool?: (
		tool: WebMCPToolDescriptor | string,
		args: unknown,
		options?: { signal?: AbortSignal }
	) => Promise<unknown>
	provideContext?: (context: { tools: WebMCPToolRegistration[] }) => unknown
}

/**
 * Resolve the live `modelContext`, preferring the current `document` entry point.
 * Read on every call rather than cached: the origin trial token can activate the
 * API after our script has already run.
 */
function getModelContext(): ModelContextLike | null {
	if (typeof document === 'undefined') return null

	const fromDocument = (document as unknown as { modelContext?: ModelContextLike }).modelContext
	if (fromDocument) return fromDocument

	if (typeof navigator !== 'undefined') {
		// Deprecated in Chrome 150, still present in 149.
		const fromNavigator = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext
		if (fromNavigator) return fromNavigator
	}

	return null
}

/**
 * Thin, defensive wrapper over the WebMCP browser API.
 *
 * Every method is safe to call when WebMCP is unavailable: discovery returns an
 * empty list and registration reports `false` instead of throwing, so a page that
 * loads eb-agent in Firefox behaves exactly as it did before.
 */
export class WebMCPAdapter implements WebMCPPort {
	/** Tracks what we registered, so we can unregister precisely on dispose. */
	readonly #registered = new Map<string, AbortController>()

	/** Whether the browser exposes a usable WebMCP surface right now. */
	isSupported(): boolean {
		const context = getModelContext()
		return Boolean(context && (context.registerTool || context.provideContext))
	}

	/** Whether tool discovery specifically is available. */
	canDiscover(): boolean {
		const context = getModelContext()
		return typeof context?.getTools === 'function'
	}

	/**
	 * Discover tools the application declared itself.
	 *
	 * @param fromOrigins - Additional secure origins to include. Same-origin tools
	 * are returned by default; cross-origin ones require both this and the declaring
	 * page's `exposedTo`.
	 */
	async getTools(fromOrigins?: string[]): Promise<WebMCPToolDescriptor[]> {
		const context = getModelContext()
		if (typeof context?.getTools !== 'function') return []

		try {
			const tools = await context.getTools(fromOrigins ? { fromOrigins } : undefined)
			if (!Array.isArray(tools)) return []

			return tools
				.filter((tool) => tool && typeof tool.name === 'string')
				.map((tool) => ({
					name: tool.name,
					description: truncate(tool.description ?? '', BUDGETS.description),
					inputSchema: (tool.inputSchema as JSONSchema) ?? { type: 'object', properties: {} },
					annotations: tool.annotations,
					origin: tool.origin,
					title: tool.title,
				}))
		} catch (error) {
			console.warn('[WebMCP] getTools failed:', error)
			return []
		}
	}

	/**
	 * Publish one of our capabilities as a WebMCP tool so external agents
	 * (Chrome's own, ChatGPT, …) can call it.
	 *
	 * Returns `false` when WebMCP is unavailable — that is the normal case today,
	 * not an error.
	 */
	async registerCapability(capability: Capability, options?: RegisterOptions): Promise<boolean> {
		const annotations = resolveAnnotations(capability)

		return this.registerTool(
			{
				name: capability.name,
				description: capability.description,
				inputSchema: capability.inputSchema,
				annotations,
				execute: async (input: unknown, context?: { signal?: AbortSignal }) => {
					const signal = context?.signal ?? new AbortController().signal
					const result = await capability.execute(input, { signal })
					// Hand WebMCP the spec's content-array shape; agents that expect a
					// bare string still read `.content[0].text` correctly in Chrome.
					return { content: [{ type: 'text', text: result.content }] }
				},
			},
			options
		)
	}

	/** Register a raw tool definition. */
	async registerTool(tool: WebMCPToolRegistration, options?: RegisterOptions): Promise<boolean> {
		const context = getModelContext()
		if (!context) return false

		// Replace any previous registration under the same name.
		await this.unregisterTool(tool.name)

		const controller = new AbortController()

		try {
			if (typeof context.registerTool === 'function') {
				await context.registerTool(tool, {
					signal: options?.signal ?? controller.signal,
					...(options?.exposedTo ? { exposedTo: options.exposedTo } : {}),
				})
				this.#registered.set(tool.name, controller)
				return true
			}

			// Older drafts only offered a bulk `provideContext`.
			if (typeof context.provideContext === 'function') {
				await context.provideContext({ tools: [tool] })
				this.#registered.set(tool.name, controller)
				return true
			}

			return false
		} catch (error) {
			console.warn(`[WebMCP] Failed to register tool "${tool.name}":`, error)
			return false
		}
	}

	/**
	 * Update a published tool by re-registering it. WebMCP has no dedicated update
	 * call; registration is last-write-wins per name.
	 */
	async updateTool(tool: WebMCPToolRegistration, options?: RegisterOptions): Promise<boolean> {
		return this.registerTool(tool, options)
	}

	/** Withdraw a published tool. Safe to call for names we never registered. */
	async unregisterTool(name: string): Promise<boolean> {
		const controller = this.#registered.get(name)
		if (!controller) return false

		this.#registered.delete(name)

		// Chrome 153+ unregisters via the AbortSignal passed at registration; this
		// does not disturb an execution already in flight.
		controller.abort()

		const context = getModelContext()
		if (typeof context?.unregisterTool === 'function') {
			try {
				await context.unregisterTool(name)
			} catch (error) {
				console.debug(`[WebMCP] unregisterTool("${name}") failed:`, error)
			}
		}

		return true
	}

	/** Names of the tools this adapter currently has published. */
	registeredNames(): string[] {
		return Array.from(this.#registered.keys())
	}

	/**
	 * Call a tool the *application* declared. Used when a native WebMCP capability
	 * is selected by the planner.
	 */
	async executeTool(
		tool: WebMCPToolDescriptor | string,
		args: unknown,
		signal?: AbortSignal
	): Promise<CapabilityResult> {
		const context = getModelContext()
		if (typeof context?.executeTool !== 'function') {
			throw new Error('WebMCP executeTool is not available in this browser.')
		}

		const raw = await context.executeTool(tool, args, signal ? { signal } : undefined)

		// `executeTool` resolves to null when the call triggered a navigation.
		if (raw === null) {
			return { content: '✅ Tool executed. The page navigated as a result.' }
		}

		return normalizeResult(raw)
	}

	/**
	 * Subscribe to the page's `toolchange` event. Returns an unsubscribe function.
	 * Tools are dynamic — a site may declare `checkout` only once a cart is non-empty.
	 */
	onToolChange(listener: () => void): () => void {
		const context = getModelContext()
		if (!context || typeof context.addEventListener !== 'function') return () => {}

		context.addEventListener('toolchange', listener)
		return () => context.removeEventListener('toolchange', listener)
	}

	/** Withdraw everything we published. */
	async dispose(): Promise<void> {
		const names = this.registeredNames()
		for (const name of names) {
			await this.unregisterTool(name)
		}
	}
}
