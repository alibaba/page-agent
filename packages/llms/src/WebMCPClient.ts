/**
 * WebMCP Client - Consumes tools/resources from pages that implement WebMCP
 *
 * WebMCP (Web Model Context Protocol) allows web pages to expose tools and
 * resources that can be consumed by AI agents. This client discovers and
 * invokes those tools through the browser's messaging infrastructure.
 *
 * Communication is done via:
 * - window.postMessage for same-origin pages
 * - MessageChannel for cross-origin iframes
 * - BroadcastChannel for same-origin cross-tab communication
 *
 * @see https://github.com/nicolo-ribaudo/nicolo-ribaudo/
 */

/**
 * WebMCP tool definition as exposed by a page
 */
export interface WebMCPToolDefinition {
	name: string
	description: string
	inputSchema: Record<string, unknown> // JSON Schema
}

/**
 * WebMCP resource definition as exposed by a page
 */
export interface WebMCPResourceDefinition {
	uri: string
	name: string
	description?: string
	mimeType?: string
}

/**
 * WebMCP message types following the MCP protocol adapted for web
 */
export type WebMCPMessageType =
	| 'webmcp:discover'
	| 'webmcp:discover_response'
	| 'webmcp:tool_call'
	| 'webmcp:tool_result'
	| 'webmcp:resource_read'
	| 'webmcp:resource_response'
	| 'webmcp:error'
	| 'webmcp:ping'
	| 'webmcp:pong'

/**
 * Base WebMCP message
 */
export interface WebMCPMessage {
	type: WebMCPMessageType
	id: string
	source?: string
}

/**
 * Discovery request
 */
export interface WebMCPDiscoverMessage extends WebMCPMessage {
	type: 'webmcp:discover'
}

/**
 * Discovery response from a WebMCP server page
 */
export interface WebMCPDiscoverResponse extends WebMCPMessage {
	type: 'webmcp:discover_response'
	serverName: string
	serverVersion?: string
	tools: WebMCPToolDefinition[]
	resources?: WebMCPResourceDefinition[]
}

/**
 * Tool call request
 */
export interface WebMCPToolCallMessage extends WebMCPMessage {
	type: 'webmcp:tool_call'
	toolName: string
	arguments: Record<string, unknown>
}

/**
 * Tool call result
 */
export interface WebMCPToolResultMessage extends WebMCPMessage {
	type: 'webmcp:tool_result'
	requestId: string
	result: unknown
	error?: string
}

/**
 * Resource read request
 */
export interface WebMCPResourceReadMessage extends WebMCPMessage {
	type: 'webmcp:resource_read'
	uri: string
}

/**
 * Resource read response
 */
export interface WebMCPResourceResponse extends WebMCPMessage {
	type: 'webmcp:resource_response'
	requestId: string
	contents: {
		uri: string
		mimeType?: string
		text?: string
		blob?: string // base64 encoded
	}[]
}

/**
 * Error response
 */
export interface WebMCPErrorMessage extends WebMCPMessage {
	type: 'webmcp:error'
	requestId: string
	code: string
	message: string
}

/**
 * A discovered WebMCP server with its capabilities
 */
export interface WebMCPServer {
	name: string
	version?: string
	tools: WebMCPToolDefinition[]
	resources: WebMCPResourceDefinition[]
	origin: string
	port?: MessagePort
}

/**
 * Configuration for the WebMCP client
 */
export interface WebMCPClientConfig {
	/** Timeout for discovery and tool calls in ms (default: 5000) */
	timeout?: number
	/** Origins allowed to communicate with (default: all) */
	allowedOrigins?: string[]
	/** Name of this client for identification */
	clientName?: string
}

let messageIdCounter = 0

function generateMessageId(): string {
	return `webmcp-${Date.now()}-${++messageIdCounter}`
}

/**
 * WebMCP Client that discovers and invokes tools from WebMCP-enabled pages.
 *
 * Usage:
 * ```ts
 * const client = new WebMCPClient({ clientName: 'page-agent' })
 * const servers = await client.discover()
 * const result = await client.callTool('pizza-maker', 'order_pizza', { size: 'large', toppings: ['cheese'] })
 * ```
 */
export class WebMCPClient {
	private config: Required<WebMCPClientConfig>
	private servers = new Map<string, WebMCPServer>()
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: unknown) => void
			reject: (reason: unknown) => void
			timeout: ReturnType<typeof setTimeout>
		}
	>()
	private messageHandler: ((event: MessageEvent) => void) | null = null
	private broadcastChannel: BroadcastChannel | null = null
	private disposed = false

	constructor(config?: WebMCPClientConfig) {
		this.config = {
			timeout: config?.timeout ?? 5000,
			allowedOrigins: config?.allowedOrigins ?? [],
			clientName: config?.clientName ?? 'page-agent-webmcp-client',
		}

		this.setupMessageListener()
	}

	/**
	 * Set up the message listener for incoming WebMCP messages
	 */
	private setupMessageListener(): void {
		this.messageHandler = (event: MessageEvent) => {
			// Origin check
			if (
				this.config.allowedOrigins.length > 0 &&
				!this.config.allowedOrigins.includes(event.origin) &&
				event.origin !== location?.origin
			) {
				return
			}

			const data = event.data
			if (!data || typeof data.type !== 'string' || !data.type.startsWith('webmcp:')) {
				return
			}

			this.handleMessage(data as WebMCPMessage, event)
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('message', this.messageHandler)
		}

		// Also set up BroadcastChannel for same-origin cross-tab
		try {
			if (typeof BroadcastChannel !== 'undefined') {
				this.broadcastChannel = new BroadcastChannel('webmcp')
				this.broadcastChannel.onmessage = (event: MessageEvent) => {
					const data = event.data
					if (!data || typeof data.type !== 'string' || !data.type.startsWith('webmcp:')) {
						return
					}
					this.handleMessage(data as WebMCPMessage, event)
				}
			}
		} catch {
			// BroadcastChannel may not be available
		}
	}

	/**
	 * Handle an incoming WebMCP message
	 */
	private handleMessage(message: WebMCPMessage, event: MessageEvent): void {
		switch (message.type) {
			case 'webmcp:discover_response': {
				const response = message as WebMCPDiscoverResponse
				const server: WebMCPServer = {
					name: response.serverName,
					version: response.serverVersion,
					tools: response.tools || [],
					resources: response.resources || [],
					origin: (event as any).origin || 'unknown',
					port: event.ports?.[0],
				}
				this.servers.set(server.name, server)

				// Resolve pending discovery request
				const pending = this.pendingRequests.get(message.id)
				if (pending) {
					clearTimeout(pending.timeout)
					pending.resolve(server)
					this.pendingRequests.delete(message.id)
				}
				break
			}

			case 'webmcp:tool_result': {
				const result = message as WebMCPToolResultMessage
				const pending = this.pendingRequests.get(result.requestId)
				if (pending) {
					clearTimeout(pending.timeout)
					if (result.error) {
						pending.reject(new Error(result.error))
					} else {
						pending.resolve(result.result)
					}
					this.pendingRequests.delete(result.requestId)
				}
				break
			}

			case 'webmcp:resource_response': {
				const response = message as WebMCPResourceResponse
				const pending = this.pendingRequests.get(response.requestId)
				if (pending) {
					clearTimeout(pending.timeout)
					pending.resolve(response.contents)
					this.pendingRequests.delete(response.requestId)
				}
				break
			}

			case 'webmcp:error': {
				const error = message as WebMCPErrorMessage
				const pending = this.pendingRequests.get(error.requestId)
				if (pending) {
					clearTimeout(pending.timeout)
					pending.reject(new Error(`WebMCP Error [${error.code}]: ${error.message}`))
					this.pendingRequests.delete(error.requestId)
				}
				break
			}

			case 'webmcp:pong': {
				const pending = this.pendingRequests.get(message.id)
				if (pending) {
					clearTimeout(pending.timeout)
					pending.resolve(true)
					this.pendingRequests.delete(message.id)
				}
				break
			}
		}
	}

	/**
	 * Send a WebMCP message to a target
	 */
	private sendMessage(
		message: WebMCPMessage,
		target?: Window | MessagePort,
		targetOrigin?: string
	): void {
		const fullMessage = { ...message, source: this.config.clientName }

		if (target && 'postMessage' in target) {
			if (target instanceof MessagePort) {
				target.postMessage(fullMessage)
			} else {
				;(target as Window).postMessage(fullMessage, targetOrigin || '*')
			}
		} else if (typeof window !== 'undefined') {
			// Broadcast to current window (for same-page WebMCP servers)
			window.postMessage(fullMessage, '*')
		}

		// Also broadcast via BroadcastChannel
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(fullMessage)
			} catch {
				// Channel may be closed
			}
		}
	}

	/**
	 * Create a promise that resolves when a response is received
	 */
	private waitForResponse<T>(requestId: string, timeoutMs?: number): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestId)
				reject(new Error(`WebMCP request ${requestId} timed out`))
			}, timeoutMs || this.config.timeout)

			this.pendingRequests.set(requestId, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timeout,
			})
		})
	}

	/**
	 * Discover WebMCP servers in the current page and iframes
	 */
	async discover(target?: Window | MessagePort, targetOrigin?: string): Promise<WebMCPServer[]> {
		if (this.disposed) throw new Error('WebMCPClient has been disposed')

		const id = generateMessageId()
		const message: WebMCPDiscoverMessage = {
			type: 'webmcp:discover',
			id,
		}

		// Collect responses over a timeout period
		const servers: WebMCPServer[] = []

		const collectPromise = new Promise<void>((resolve) => {
			setTimeout(() => resolve(), this.config.timeout)
		})

		// Set up a temporary handler to collect multiple responses
		const originalHandler = this.messageHandler
		const discoveryHandler = (event: MessageEvent) => {
			originalHandler?.(event)
			const data = event.data
			if (data?.type === 'webmcp:discover_response' && data.id === id) {
				const server: WebMCPServer = {
					name: data.serverName,
					version: data.serverVersion,
					tools: data.tools || [],
					resources: data.resources || [],
					origin: event.origin || 'unknown',
					port: event.ports?.[0],
				}
				this.servers.set(server.name, server)
				servers.push(server)
			}
		}

		if (typeof window !== 'undefined') {
			window.removeEventListener('message', originalHandler!)
			window.addEventListener('message', discoveryHandler)
		}

		// Send discovery message
		this.sendMessage(message, target, targetOrigin)

		// Also send to all iframes
		if (typeof document !== 'undefined') {
			const iframes = document.querySelectorAll('iframe')
			for (const iframe of iframes) {
				try {
					if (iframe.contentWindow) {
						iframe.contentWindow.postMessage({ ...message, source: this.config.clientName }, '*')
					}
				} catch {
					// Cross-origin iframe access may be restricted
				}
			}
		}

		await collectPromise

		// Restore original handler
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', discoveryHandler)
			window.addEventListener('message', originalHandler!)
		}

		return servers
	}

	/**
	 * Call a tool on a specific WebMCP server
	 */
	async callTool(
		serverName: string,
		toolName: string,
		args: Record<string, unknown>
	): Promise<unknown> {
		if (this.disposed) throw new Error('WebMCPClient has been disposed')

		const server = this.servers.get(serverName)
		if (!server) {
			throw new Error(`WebMCP server "${serverName}" not found. Run discover() first.`)
		}

		const tool = server.tools.find((t) => t.name === toolName)
		if (!tool) {
			throw new Error(`Tool "${toolName}" not found on server "${serverName}"`)
		}

		const requestId = generateMessageId()
		const message: WebMCPToolCallMessage = {
			type: 'webmcp:tool_call',
			id: requestId,
			toolName,
			arguments: args,
		}

		const responsePromise = this.waitForResponse<unknown>(requestId)

		// Send to the server's port if available, otherwise broadcast
		if (server.port) {
			this.sendMessage(message, server.port)
		} else {
			this.sendMessage(message, undefined, server.origin)
		}

		return responsePromise
	}

	/**
	 * Read a resource from a WebMCP server
	 */
	async readResource(
		serverName: string,
		uri: string
	): Promise<{ uri: string; mimeType?: string; text?: string; blob?: string }[]> {
		if (this.disposed) throw new Error('WebMCPClient has been disposed')

		const server = this.servers.get(serverName)
		if (!server) {
			throw new Error(`WebMCP server "${serverName}" not found. Run discover() first.`)
		}

		const requestId = generateMessageId()
		const message: WebMCPResourceReadMessage = {
			type: 'webmcp:resource_read',
			id: requestId,
			uri,
		}

		const responsePromise =
			this.waitForResponse<{ uri: string; mimeType?: string; text?: string; blob?: string }[]>(
				requestId
			)

		if (server.port) {
			this.sendMessage(message, server.port)
		} else {
			this.sendMessage(message, undefined, server.origin)
		}

		return responsePromise
	}

	/**
	 * Ping a WebMCP server to check if it's still alive
	 */
	async ping(serverName: string): Promise<boolean> {
		if (this.disposed) return false

		const server = this.servers.get(serverName)
		if (!server) return false

		const id = generateMessageId()
		const message: WebMCPMessage = { type: 'webmcp:ping', id }

		try {
			const responsePromise = this.waitForResponse<boolean>(id, 2000)
			if (server.port) {
				this.sendMessage(message, server.port)
			} else {
				this.sendMessage(message, undefined, server.origin)
			}
			return await responsePromise
		} catch {
			return false
		}
	}

	/**
	 * Get all discovered servers
	 */
	getServers(): WebMCPServer[] {
		return [...this.servers.values()]
	}

	/**
	 * Get all discovered tools across all servers
	 */
	getAllTools(): (WebMCPToolDefinition & { serverName: string })[] {
		const tools: (WebMCPToolDefinition & { serverName: string })[] = []
		for (const server of this.servers.values()) {
			for (const tool of server.tools) {
				tools.push({ ...tool, serverName: server.name })
			}
		}
		return tools
	}

	/**
	 * Dispose the client and clean up listeners
	 */
	dispose(): void {
		this.disposed = true

		if (this.messageHandler && typeof window !== 'undefined') {
			window.removeEventListener('message', this.messageHandler)
		}

		if (this.broadcastChannel) {
			this.broadcastChannel.close()
			this.broadcastChannel = null
		}

		// Reject all pending requests
		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout)
			pending.reject(new Error('WebMCPClient disposed'))
			this.pendingRequests.delete(id)
		}

		this.servers.clear()
	}
}
