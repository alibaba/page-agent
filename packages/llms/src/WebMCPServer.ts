/**
 * WebMCP Server/Gateway - Exposes tools to WebMCP clients
 *
 * This server makes page-agent's tools available to external WebMCP clients
 * (such as Chrome's built-in AI assistant, the WebMCP browser extension,
 * or other agents using the WebMCP client interface).
 *
 * Supports both:
 * 1. W3C native API (navigator.modelContext.registerTool) - Chrome 146+
 * 2. postMessage-based transport for broader compatibility
 *
 * Acts as a "gateway" for pages that don't natively expose WebMCP,
 * making page capabilities available through the WebMCP protocol.
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://github.com/webmachinelearning/webmcp
 */
import * as z from 'zod/v4'

import type {
	ModelContextAPI,
	WebMCPDiscoverResponse,
	WebMCPErrorMessage,
	WebMCPMessage,
	WebMCPNativeTool,
	WebMCPResourceDefinition,
	WebMCPResourceReadMessage,
	WebMCPResourceResponse,
	WebMCPToolCallMessage,
	WebMCPToolDefinition,
} from './WebMCPClient'
import type { Tool } from './types'
import { zodToOpenAITool } from './utils'

/**
 * Configuration for the WebMCP server
 */
export interface WebMCPServerConfig {
	/** Server name for identification */
	name: string
	/** Server version */
	version?: string
	/** Origins allowed to communicate with (default: all) */
	allowedOrigins?: string[]
	/** Whether to respond to discovery requests (default: true) */
	discoverable?: boolean
	/** Custom resource providers */
	resources?: WebMCPResourceProvider[]
	/**
	 * Register tools via the native W3C navigator.modelContext API
	 * in addition to the postMessage transport (default: true).
	 * When enabled, tools are accessible to Chrome's built-in AI.
	 */
	registerNative?: boolean
}

/**
 * Resource provider for serving dynamic resources
 */
export interface WebMCPResourceProvider {
	/** URI pattern this provider handles (supports simple wildcards) */
	uriPattern: string
	/** Resource metadata */
	name: string
	description?: string
	mimeType?: string
	/** Handler to read the resource content */
	read: (uri: string) => Promise<{ text?: string; blob?: string; mimeType?: string }>
}

/**
 * WebMCP Server that exposes tools and resources via the WebMCP protocol.
 *
 * Automatically uses the W3C native API (navigator.modelContext) when
 * available, with postMessage as a fallback transport.
 *
 * @example
 * ```ts
 * const server = new WebMCPServer({
 *   name: 'page-agent-gateway',
 *   version: '1.0.0',
 * })
 *
 * // Register tools (from page-agent's tool definitions)
 * server.registerTool('click', clickTool)
 * server.registerTool('type_text', typeTextTool)
 *
 * // Start listening for WebMCP messages
 * server.start()
 * ```
 */
export class WebMCPServer {
	private config: Required<WebMCPServerConfig>
	private tools = new Map<string, Tool>()
	private nativeToolNames = new Set<string>()
	private resourceProviders: WebMCPResourceProvider[] = []
	private messageHandler: ((event: MessageEvent) => void) | null = null
	private broadcastChannel: BroadcastChannel | null = null
	private running = false
	private executionContext: unknown = null

	constructor(config: WebMCPServerConfig) {
		this.config = {
			name: config.name,
			version: config.version ?? '1.0.0',
			allowedOrigins: config.allowedOrigins ?? [],
			discoverable: config.discoverable ?? true,
			resources: config.resources ?? [],
			registerNative: config.registerNative ?? true,
		}
		this.resourceProviders = [...this.config.resources]
	}

	/**
	 * Check if the W3C native WebMCP API is available
	 */
	private static getModelContext(): ModelContextAPI | null {
		if (
			typeof navigator !== 'undefined' &&
			'modelContext' in navigator &&
			typeof (navigator as any).modelContext?.registerTool === 'function'
		) {
			return (navigator as any).modelContext as ModelContextAPI
		}
		return null
	}

	/**
	 * Register a tool to be exposed via WebMCP.
	 * If the native API is available and registerNative is enabled,
	 * the tool is also registered via navigator.modelContext.registerTool().
	 */
	registerTool(name: string, tool: Tool): void {
		this.tools.set(name, tool)

		// Also register via native API if available and server is running
		if (this.running && this.config.registerNative) {
			this.registerToolNative(name, tool)
		}
	}

	/**
	 * Register multiple tools at once
	 */
	registerTools(tools: Record<string, Tool> | Map<string, Tool>): void {
		const entries = tools instanceof Map ? tools.entries() : Object.entries(tools)
		for (const [name, tool] of entries) {
			this.registerTool(name, tool)
		}
	}

	/**
	 * Unregister a tool from both native and postMessage transports
	 */
	unregisterTool(name: string): void {
		this.tools.delete(name)

		// Also unregister from native API
		if (this.nativeToolNames.has(name)) {
			const modelContext = WebMCPServer.getModelContext()
			if (modelContext) {
				try {
					modelContext.unregisterTool(name)
				} catch {
					// May fail if tool was already unregistered
				}
			}
			this.nativeToolNames.delete(name)
		}
	}

	/**
	 * Register a resource provider
	 */
	registerResource(provider: WebMCPResourceProvider): void {
		this.resourceProviders.push(provider)
	}

	/**
	 * Set the execution context for tool calls (e.g., the PageAgent instance).
	 * Tools' execute functions will be called with this context as `this`.
	 */
	setExecutionContext(context: unknown): void {
		this.executionContext = context
	}

	/**
	 * Register a single tool via the native W3C API
	 */
	private registerToolNative(name: string, tool: Tool): void {
		const modelContext = WebMCPServer.getModelContext()
		if (!modelContext) return

		const openaiTool = zodToOpenAITool(name, tool)
		const ctx = this.executionContext

		const nativeTool: WebMCPNativeTool = {
			name,
			description: openaiTool.function.description || '',
			inputSchema: openaiTool.function.parameters,
			execute: async (input: Record<string, unknown>) => {
				// Validate input
				const validation = tool.inputSchema.safeParse(input)
				if (!validation.success) {
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									error: true,
									message: `Invalid arguments: ${z.prettifyError(validation.error)}`,
								}),
							},
						],
					}
				}

				try {
					const result = ctx
						? await tool.execute.call(ctx, validation.data)
						: await tool.execute(validation.data)

					// Return in MCP-compatible content format
					return {
						content: [
							{
								type: 'text',
								text: typeof result === 'string' ? result : JSON.stringify(result),
							},
						],
					}
				} catch (error: unknown) {
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									error: true,
									message: `Tool execution failed: ${(error as Error).message}`,
								}),
							},
						],
					}
				}
			},
		}

		try {
			modelContext.registerTool(nativeTool)
			this.nativeToolNames.add(name)
		} catch {
			// Registration may fail if name is already taken or API is restricted
		}
	}

	/**
	 * Start the WebMCP server.
	 * Begins listening for postMessage requests and registers tools
	 * via the native API if available.
	 */
	start(): void {
		if (this.running) return
		this.running = true

		// Register existing tools via native API
		if (this.config.registerNative) {
			for (const [name, tool] of this.tools) {
				this.registerToolNative(name, tool)
			}
		}

		// Set up postMessage listener
		this.messageHandler = (event: MessageEvent) => {
			if (
				this.config.allowedOrigins.length > 0 &&
				!this.config.allowedOrigins.includes(event.origin)
			) {
				return
			}

			const data = event.data
			if (!data || typeof data.type !== 'string' || !data.type.startsWith('webmcp:')) {
				return
			}

			// Don't process our own messages
			if (data.source === this.config.name) {
				return
			}

			this.handleMessage(data as WebMCPMessage, event)
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('message', this.messageHandler)
		}

		// Also listen on BroadcastChannel
		try {
			if (typeof BroadcastChannel !== 'undefined') {
				this.broadcastChannel = new BroadcastChannel('webmcp')
				this.broadcastChannel.onmessage = (event: MessageEvent) => {
					const data = event.data
					if (!data || typeof data.type !== 'string' || !data.type.startsWith('webmcp:')) {
						return
					}
					if (data.source === this.config.name) return
					this.handleMessage(data as WebMCPMessage, event)
				}
			}
		} catch {
			// BroadcastChannel may not be available
		}
	}

	/**
	 * Stop the WebMCP server.
	 * Unregisters native tools and removes message listeners.
	 */
	stop(): void {
		this.running = false

		// Unregister native tools
		const modelContext = WebMCPServer.getModelContext()
		if (modelContext) {
			for (const name of this.nativeToolNames) {
				try {
					modelContext.unregisterTool(name)
				} catch {
					// May fail
				}
			}
		}
		this.nativeToolNames.clear()

		if (this.messageHandler && typeof window !== 'undefined') {
			window.removeEventListener('message', this.messageHandler)
			this.messageHandler = null
		}

		if (this.broadcastChannel) {
			this.broadcastChannel.close()
			this.broadcastChannel = null
		}
	}

	// ─── Message handling ─────────────────────────────────────────────────────

	private handleMessage(message: WebMCPMessage, event: MessageEvent): void {
		switch (message.type) {
			case 'webmcp:discover':
				if (this.config.discoverable) {
					this.handleDiscover(message, event)
				}
				break

			case 'webmcp:tool_call':
				this.handleToolCall(message as WebMCPToolCallMessage, event)
				break

			case 'webmcp:resource_read':
				this.handleResourceRead(message as WebMCPResourceReadMessage, event)
				break

			case 'webmcp:ping':
				this.sendResponse({ type: 'webmcp:pong', id: message.id, source: this.config.name }, event)
				break
		}
	}

	private handleDiscover(message: WebMCPMessage, event: MessageEvent): void {
		const toolDefs: WebMCPToolDefinition[] = []

		for (const [name, tool] of this.tools) {
			const openaiTool = zodToOpenAITool(name, tool)
			toolDefs.push({
				name,
				description: openaiTool.function.description || '',
				inputSchema: openaiTool.function.parameters,
			})
		}

		const resourceDefs: WebMCPResourceDefinition[] = this.resourceProviders.map((p) => ({
			uri: p.uriPattern,
			name: p.name,
			description: p.description,
			mimeType: p.mimeType,
		}))

		const response: WebMCPDiscoverResponse = {
			type: 'webmcp:discover_response',
			id: message.id,
			source: this.config.name,
			serverName: this.config.name,
			serverVersion: this.config.version,
			tools: toolDefs,
			resources: resourceDefs,
		}

		this.sendResponse(response, event)
	}

	private async handleToolCall(message: WebMCPToolCallMessage, event: MessageEvent): Promise<void> {
		const tool = this.tools.get(message.toolName)
		if (!tool) {
			this.sendResponse(
				{
					type: 'webmcp:error',
					id: `${message.id}-error`,
					requestId: message.id,
					source: this.config.name,
					code: 'TOOL_NOT_FOUND',
					message: `Tool "${message.toolName}" not found`,
				} as WebMCPErrorMessage,
				event
			)
			return
		}

		try {
			const validation = tool.inputSchema.safeParse(message.arguments)
			if (!validation.success) {
				this.sendResponse(
					{
						type: 'webmcp:error',
						id: `${message.id}-error`,
						requestId: message.id,
						source: this.config.name,
						code: 'INVALID_ARGS',
						message: `Invalid arguments: ${z.prettifyError(validation.error)}`,
					} as WebMCPErrorMessage,
					event
				)
				return
			}

			const result = this.executionContext
				? await tool.execute.call(this.executionContext, validation.data)
				: await tool.execute(validation.data)

			this.sendResponse(
				{
					type: 'webmcp:tool_result',
					id: `${message.id}-result`,
					requestId: message.id,
					source: this.config.name,
					result,
				},
				event
			)
		} catch (error: unknown) {
			this.sendResponse(
				{
					type: 'webmcp:error',
					id: `${message.id}-error`,
					requestId: message.id,
					source: this.config.name,
					code: 'EXECUTION_ERROR',
					message: `Tool execution failed: ${(error as Error).message}`,
				} as WebMCPErrorMessage,
				event
			)
		}
	}

	private async handleResourceRead(
		message: WebMCPResourceReadMessage,
		event: MessageEvent
	): Promise<void> {
		const provider = this.resourceProviders.find((p) => this.matchUri(p.uriPattern, message.uri))

		if (!provider) {
			this.sendResponse(
				{
					type: 'webmcp:error',
					id: `${message.id}-error`,
					requestId: message.id,
					source: this.config.name,
					code: 'RESOURCE_NOT_FOUND',
					message: `No resource provider for URI: ${message.uri}`,
				} as WebMCPErrorMessage,
				event
			)
			return
		}

		try {
			const content = await provider.read(message.uri)
			const response: WebMCPResourceResponse = {
				type: 'webmcp:resource_response',
				id: `${message.id}-response`,
				requestId: message.id,
				source: this.config.name,
				contents: [
					{
						uri: message.uri,
						mimeType: content.mimeType || provider.mimeType,
						text: content.text,
						blob: content.blob,
					},
				],
			}
			this.sendResponse(response, event)
		} catch (error: unknown) {
			this.sendResponse(
				{
					type: 'webmcp:error',
					id: `${message.id}-error`,
					requestId: message.id,
					source: this.config.name,
					code: 'RESOURCE_READ_ERROR',
					message: `Failed to read resource: ${(error as Error).message}`,
				} as WebMCPErrorMessage,
				event
			)
		}
	}

	private sendResponse(
		message: WebMCPMessage | Record<string, unknown>,
		event: MessageEvent
	): void {
		const responseMsg = { ...message, source: this.config.name }

		if (event.ports?.[0]) {
			event.ports[0].postMessage(responseMsg)
			return
		}

		if (event.source && typeof (event.source as Window).postMessage === 'function') {
			;(event.source as Window).postMessage(responseMsg, event.origin || '*')
			return
		}

		if (typeof window !== 'undefined') {
			window.postMessage(responseMsg, '*')
		}

		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(responseMsg)
			} catch {
				// Channel may be closed
			}
		}
	}

	private matchUri(pattern: string, uri: string): boolean {
		if (pattern === uri) return true
		if (pattern === '*') return true

		const regexStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')
		return new RegExp(`^${regexStr}$`).test(uri)
	}

	// ─── Accessors ────────────────────────────────────────────────────────────

	getTools(): Map<string, Tool> {
		return new Map(this.tools)
	}

	isRunning(): boolean {
		return this.running
	}

	/**
	 * Check if native W3C WebMCP API is being used
	 */
	isNativeRegistered(): boolean {
		return this.nativeToolNames.size > 0
	}

	dispose(): void {
		this.stop()
		this.tools.clear()
		this.resourceProviders = []
	}
}
