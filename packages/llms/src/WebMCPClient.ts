/**
 * WebMCP Client - Consumes tools/resources from pages that implement WebMCP
 *
 * Supports both:
 * 1. W3C WebMCP native API (navigator.modelContext) - Chrome 146+ with flag
 * 2. postMessage-based fallback for non-native environments
 *
 * The W3C WebMCP spec (https://webmachinelearning.github.io/webmcp/) defines
 * how web pages expose tools via `navigator.modelContext.registerTool()`.
 * This client can discover and invoke those tools whether exposed natively
 * or via the postMessage transport.
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://github.com/webmachinelearning/webmcp
 */

// ─── W3C WebMCP Native Types ────────────────────────────────────────────────

/**
 * W3C WebMCP ToolAnnotations
 */
export interface WebMCPToolAnnotations {
	readOnlyHint?: boolean
}

/**
 * W3C WebMCP ModelContextTool (as registered via navigator.modelContext)
 */
export interface WebMCPNativeTool {
	name: string
	description: string
	inputSchema?: Record<string, unknown> // JSON Schema
	execute: (input: Record<string, unknown>, client?: unknown) => Promise<unknown>
	annotations?: WebMCPToolAnnotations
}

/**
 * W3C navigator.modelContext interface
 */
export interface ModelContextAPI {
	registerTool(tool: WebMCPNativeTool): void
	unregisterTool(name: string): void
}

// ─── Transport-agnostic types ───────────────────────────────────────────────

/**
 * WebMCP tool definition as exposed by a page (transport-agnostic)
 */
export interface WebMCPToolDefinition {
	name: string
	description: string
	inputSchema: Record<string, unknown> // JSON Schema
	annotations?: WebMCPToolAnnotations
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

// ─── postMessage transport types ────────────────────────────────────────────

/**
 * WebMCP message types for postMessage transport
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

export interface WebMCPMessage {
	type: WebMCPMessageType
	id: string
	source?: string
}

export interface WebMCPDiscoverMessage extends WebMCPMessage {
	type: 'webmcp:discover'
}

export interface WebMCPDiscoverResponse extends WebMCPMessage {
	type: 'webmcp:discover_response'
	serverName: string
	serverVersion?: string
	tools: WebMCPToolDefinition[]
	resources?: WebMCPResourceDefinition[]
}

export interface WebMCPToolCallMessage extends WebMCPMessage {
	type: 'webmcp:tool_call'
	toolName: string
	arguments: Record<string, unknown>
}

export interface WebMCPToolResultMessage extends WebMCPMessage {
	type: 'webmcp:tool_result'
	requestId: string
	result: unknown
	error?: string
}

export interface WebMCPResourceReadMessage extends WebMCPMessage {
	type: 'webmcp:resource_read'
	uri: string
}

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

export interface WebMCPErrorMessage extends WebMCPMessage {
	type: 'webmcp:error'
	requestId: string
	code: string
	message: string
}

// ─── Server / Tool representations ──────────────────────────────────────────

/**
 * A discovered WebMCP server with its capabilities
 */
export interface WebMCPServer {
	name: string
	version?: string
	tools: WebMCPToolDefinition[]
	resources: WebMCPResourceDefinition[]
	origin: string
	/** For postMessage transport: port for direct communication */
	port?: MessagePort
	/** For native transport: direct tool execute functions */
	nativeTools?: Map<string, WebMCPNativeTool>
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
	/**
	 * Prefer native W3C API when available (default: true).
	 * When true and navigator.modelContext is available, tools registered
	 * natively will be discovered first.
	 */
	preferNative?: boolean
}

let messageIdCounter = 0

function generateMessageId(): string {
	return `webmcp-${Date.now()}-${++messageIdCounter}`
}

/**
 * WebMCP Client that discovers and invokes tools from WebMCP-enabled pages.
 *
 * Supports both the W3C native API (navigator.modelContext) and the
 * postMessage-based transport for broader compatibility.
 *
 * @example
 * ```ts
 * const client = new WebMCPClient({ clientName: 'page-agent' })
 *
 * // Discover tools (checks native API first, then postMessage)
 * const servers = await client.discover()
 *
 * // Call a tool
 * const result = await client.callTool('pizza-maker', 'order_pizza', {
 *   size: 'large',
 *   toppings: ['cheese']
 * })
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
			preferNative: config?.preferNative ?? true,
		}

		this.setupMessageListener()
	}

	/**
	 * Check if the W3C native WebMCP API is available
	 */
	static isNativeAvailable(): boolean {
		return (
			typeof navigator !== 'undefined' &&
			'modelContext' in navigator &&
			typeof (navigator as any).modelContext?.registerTool === 'function'
		)
	}

	/**
	 * Get the native ModelContext API if available
	 */
	private static getModelContext(): ModelContextAPI | null {
		if (WebMCPClient.isNativeAvailable()) {
			return (navigator as any).modelContext as ModelContextAPI
		}
		return null
	}

	// ─── Message transport setup ──────────────────────────────────────────────

	private setupMessageListener(): void {
		this.messageHandler = (event: MessageEvent) => {
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
			window.postMessage(fullMessage, '*')
		}

		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(fullMessage)
			} catch {
				// Channel may be closed
			}
		}
	}

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

	// ─── Discovery ────────────────────────────────────────────────────────────

	/**
	 * Discover WebMCP tools from the current page.
	 *
	 * Discovery order:
	 * 1. Native W3C API (navigator.modelContext) - if available and preferNative=true
	 * 2. postMessage transport - broadcasts to page, iframes, and BroadcastChannel
	 * 3. DOM declarative tools - scans for `<form toolname="...">` elements
	 */
	async discover(target?: Window | MessagePort, targetOrigin?: string): Promise<WebMCPServer[]> {
		if (this.disposed) throw new Error('WebMCPClient has been disposed')

		const allServers: WebMCPServer[] = []

		// 1. Discover native W3C WebMCP tools (via DOM inspection)
		if (this.config.preferNative) {
			const nativeServers = this.discoverNativeTools()
			allServers.push(...nativeServers)
		}

		// 2. Discover declarative tools (HTML forms with toolname attribute)
		const declarativeServers = this.discoverDeclarativeTools()
		allServers.push(...declarativeServers)

		// 3. Discover via postMessage transport
		const messageServers = await this.discoverViaMessages(target, targetOrigin)
		allServers.push(...messageServers)

		return allServers
	}

	/**
	 * Discover tools registered via the native navigator.modelContext API.
	 * Since the native API doesn't expose a listing method, we check for
	 * tools that page-agent knows about via toolactivated events.
	 */
	private discoverNativeTools(): WebMCPServer[] {
		if (!WebMCPClient.isNativeAvailable()) return []

		// The native API is present but doesn't provide a listing method.
		// Tools registered via navigator.modelContext.registerTool() are
		// consumed directly by the browser's AI (e.g. Gemini).
		// We register this as a known "native" server so the client
		// knows the native transport is available.
		const server: WebMCPServer = {
			name: '__native_webmcp__',
			version: '1.0.0',
			tools: [],
			resources: [],
			origin: typeof location !== 'undefined' ? location.origin : 'native',
		}

		this.servers.set(server.name, server)
		return [server]
	}

	/**
	 * Discover tools declared via HTML `<form toolname="...">` elements.
	 * This is the declarative W3C WebMCP approach.
	 */
	private discoverDeclarativeTools(): WebMCPServer[] {
		if (typeof document === 'undefined') return []

		const forms = document.querySelectorAll('form[toolname]')
		if (forms.length === 0) return []

		const tools: WebMCPToolDefinition[] = []
		const nativeTools = new Map<string, WebMCPNativeTool>()

		for (const form of forms) {
			const name = form.getAttribute('toolname')
			const description = form.getAttribute('tooldescription') || ''
			if (!name) continue

			// Build input schema from form elements
			const properties: Record<string, Record<string, unknown>> = {}
			const required: string[] = []

			const inputs = form.querySelectorAll('input[name], select[name], textarea[name]')
			for (const input of inputs) {
				const inputName = input.getAttribute('name')
				if (!inputName) continue

				const paramDesc = input.getAttribute('toolparamdescription') || ''
				const inputType = input.getAttribute('type') || 'text'
				const isRequired = input.hasAttribute('required')

				const prop: Record<string, unknown> = { description: paramDesc }

				if (inputType === 'number') {
					prop.type = 'number'
				} else if (inputType === 'checkbox') {
					prop.type = 'boolean'
				} else {
					prop.type = 'string'
				}

				// For select elements, extract enum values
				if (input.tagName === 'SELECT') {
					const options = input.querySelectorAll('option')
					prop.enum = Array.from(options).map((o) => o.getAttribute('value') || o.textContent)
				}

				properties[inputName] = prop
				if (isRequired) required.push(inputName)
			}

			const inputSchema: Record<string, unknown> = {
				type: 'object',
				properties,
			}
			if (required.length > 0) inputSchema.required = required

			tools.push({ name, description, inputSchema })

			// Create a native tool executor that fills and submits the form
			const formRef = form as HTMLFormElement
			nativeTools.set(name, {
				name,
				description,
				inputSchema,
				execute: async (input: Record<string, unknown>) => {
					// Fill form fields
					for (const [key, value] of Object.entries(input)) {
						const field = formRef.querySelector(`[name="${key}"]`) as
							| HTMLInputElement
							| HTMLSelectElement
							| null
						if (field) {
							field.value = String(value)
							field.dispatchEvent(new Event('input', { bubbles: true }))
							field.dispatchEvent(new Event('change', { bubbles: true }))
						}
					}

					// Submit the form via a synthetic submit event with agentInvoked flag
					return new Promise((resolve, reject) => {
						const submitHandler = (e: Event) => {
							e.preventDefault()
							formRef.removeEventListener('submit', submitHandler)

							// Check if the page responds via e.respondWith (W3C spec)
							const submitEvent = e as any
							if (typeof submitEvent.respondWith === 'function') {
								// The page will call e.respondWith(promise)
								// We can't intercept that directly, so resolve with form data
								const formData = Object.fromEntries(new FormData(formRef))
								resolve({ submitted: true, data: formData })
							} else {
								const formData = Object.fromEntries(new FormData(formRef))
								resolve({ submitted: true, data: formData })
							}
						}

						formRef.addEventListener('submit', submitHandler)

						// Create a SubmitEvent with agentInvoked flag
						const event = new SubmitEvent('submit', {
							bubbles: true,
							cancelable: true,
						})
						Object.defineProperty(event, 'agentInvoked', { value: true })

						const dispatched = formRef.dispatchEvent(event)
						if (dispatched) {
							// Form wasn't prevented, reject after timeout
							formRef.removeEventListener('submit', submitHandler)
							reject(new Error('Form submission was not handled'))
						}
					})
				},
			})
		}

		if (tools.length === 0) return []

		const server: WebMCPServer = {
			name: '__declarative_webmcp__',
			version: '1.0.0',
			tools,
			resources: [],
			origin: typeof location !== 'undefined' ? location.origin : 'declarative',
			nativeTools,
		}

		this.servers.set(server.name, server)
		return [server]
	}

	/**
	 * Discover servers via postMessage transport
	 */
	private async discoverViaMessages(
		target?: Window | MessagePort,
		targetOrigin?: string
	): Promise<WebMCPServer[]> {
		const id = generateMessageId()
		const message: WebMCPDiscoverMessage = {
			type: 'webmcp:discover',
			id,
		}

		const servers: WebMCPServer[] = []

		const collectPromise = new Promise<void>((resolve) => {
			setTimeout(() => resolve(), this.config.timeout)
		})

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

		if (typeof window !== 'undefined') {
			window.removeEventListener('message', discoveryHandler)
			window.addEventListener('message', originalHandler!)
		}

		return servers
	}

	// ─── Tool execution ───────────────────────────────────────────────────────

	/**
	 * Call a tool on a specific WebMCP server.
	 *
	 * For declarative tools (HTML forms), this fills the form and triggers submit.
	 * For postMessage servers, this sends a tool_call message.
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

		// Use native tool executor if available (declarative forms)
		if (server.nativeTools?.has(toolName)) {
			const nativeTool = server.nativeTools.get(toolName)!
			return nativeTool.execute(args)
		}

		// Fall back to postMessage transport
		const requestId = generateMessageId()
		const message: WebMCPToolCallMessage = {
			type: 'webmcp:tool_call',
			id: requestId,
			toolName,
			arguments: args,
		}

		const responsePromise = this.waitForResponse<unknown>(requestId)

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

		// Native and declarative servers are always "alive"
		if (server.name === '__native_webmcp__' || server.name === '__declarative_webmcp__') {
			return true
		}

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

	// ─── Accessors ────────────────────────────────────────────────────────────

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

		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout)
			pending.reject(new Error('WebMCPClient disposed'))
			this.pendingRequests.delete(id)
		}

		this.servers.clear()
	}
}
