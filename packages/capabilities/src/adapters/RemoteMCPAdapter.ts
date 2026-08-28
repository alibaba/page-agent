/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Remote MCP adapter (§19) — Streamable HTTP transport.
 *
 * @remarks
 * Lets the Capability Registry hold backend tools alongside in-page ones, so a
 * single workflow can interleave them:
 *
 * ```
 * WebMCP get_order() → Remote MCP check_inventory() → DOM verify confirmation
 * ```
 *
 * Implements the client half of the 2025-06-18 Streamable HTTP transport: POST
 * JSON-RPC to one endpoint, carry `Mcp-Session-Id` once the server assigns it,
 * send `MCP-Protocol-Version` on every subsequent request, and accept either a
 * plain JSON response or an SSE stream.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */
import type { CapabilityResult, JSONSchema } from '../types'
import { normalizeResult } from '../utils'

const PROTOCOL_VERSION = '2025-06-18'

/** A tool as advertised by an MCP server's `tools/list`. */
export interface RemoteMCPTool {
	name: string
	title?: string
	description?: string
	inputSchema?: JSONSchema
	outputSchema?: JSONSchema
	annotations?: {
		readOnlyHint?: boolean
		destructiveHint?: boolean
		idempotentHint?: boolean
		openWorldHint?: boolean
	}
}

export interface RemoteMCPServerConfig {
	/** Label used in capability ids and logs. */
	name: string
	/** The server's single MCP endpoint, e.g. `https://example.com/mcp`. */
	url: string
	/** Extra headers, e.g. `{ Authorization: 'Bearer …' }`. */
	headers?: Record<string, string>
	/** Per-request timeout in ms. @default 30000 */
	timeoutMs?: number
}

interface JsonRpcResponse {
	jsonrpc: '2.0'
	id?: number | string
	result?: any
	error?: { code: number; message: string; data?: unknown }
}

/**
 * Minimal MCP client over Streamable HTTP.
 *
 * Deliberately dependency-free: pulling the official SDK into a browser bundle
 * that ships on customer pages would cost far more than the ~150 lines of
 * JSON-RPC the tool surface actually needs.
 */
export class RemoteMCPAdapter {
	readonly config: RemoteMCPServerConfig
	#sessionId: string | null = null
	#negotiatedVersion = PROTOCOL_VERSION
	#nextId = 1
	#initialized = false

	constructor(config: RemoteMCPServerConfig) {
		this.config = config
	}

	get connected(): boolean {
		return this.#initialized
	}

	/** Perform the MCP initialize handshake. Safe to call repeatedly. */
	async connect(signal?: AbortSignal): Promise<void> {
		if (this.#initialized) return

		const result = await this.#request(
			'initialize',
			{
				protocolVersion: PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: { name: 'eb-agent', version: '1.11.0' },
			},
			signal
		)

		if (typeof result?.protocolVersion === 'string') {
			this.#negotiatedVersion = result.protocolVersion
		}

		// The server is not required to accept our version; it answers with one it
		// supports. We carry that back on every later request via MCP-Protocol-Version.
		await this.#notify('notifications/initialized', undefined, signal)

		this.#initialized = true
	}

	/** List the server's tools, following pagination to the end. */
	async listTools(signal?: AbortSignal): Promise<RemoteMCPTool[]> {
		await this.connect(signal)

		const tools: RemoteMCPTool[] = []
		let cursor: string | undefined

		do {
			const result = await this.#request('tools/list', cursor ? { cursor } : {}, signal)
			if (Array.isArray(result?.tools)) tools.push(...(result.tools as RemoteMCPTool[]))
			cursor = typeof result?.nextCursor === 'string' ? result.nextCursor : undefined
			// Guard against a server that returns the same cursor forever.
			if (tools.length > 500) break
		} while (cursor)

		return tools.filter((tool) => typeof tool?.name === 'string')
	}

	/** Invoke one tool. Tool-level failures surface as thrown errors, per `isError`. */
	async callTool(name: string, args: unknown, signal?: AbortSignal): Promise<CapabilityResult> {
		await this.connect(signal)

		const result = await this.#request('tools/call', { name, arguments: args ?? {} }, signal)

		const normalized = normalizeResult(result)

		if (result?.isError) {
			throw new Error(normalized.content || `Remote MCP tool "${name}" failed.`)
		}

		// A tool with an output schema returns `structuredContent` alongside the text.
		if (result?.structuredContent !== undefined) {
			normalized.structured = result.structuredContent
		}

		return normalized
	}

	/** End the session so the server can release it. */
	async disconnect(): Promise<void> {
		if (!this.#sessionId) {
			this.#initialized = false
			return
		}

		try {
			await fetch(this.config.url, {
				method: 'DELETE',
				headers: this.#headers(),
			})
		} catch {
			// The server may not allow client-side termination (405). Nothing to do.
		}

		this.#sessionId = null
		this.#initialized = false
	}

	#headers(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			// The spec requires the client to accept both response shapes.
			Accept: 'application/json, text/event-stream',
			...this.config.headers,
		}

		if (this.#initialized) headers['MCP-Protocol-Version'] = this.#negotiatedVersion
		if (this.#sessionId) headers['Mcp-Session-Id'] = this.#sessionId

		return headers
	}

	async #notify(method: string, params: unknown, signal?: AbortSignal): Promise<void> {
		const response = await this.#post({ jsonrpc: '2.0', method, params }, signal)
		// A notification gets 202 Accepted with no body. Nothing to parse.
		if (!response.ok && response.status !== 202) {
			console.warn(`[remote-mcp] ${method} returned ${response.status}`)
		}
	}

	async #request(method: string, params: unknown, signal?: AbortSignal): Promise<any> {
		const id = this.#nextId++
		const response = await this.#post({ jsonrpc: '2.0', id, method, params }, signal)

		// The session expired — re-initialize from scratch, as the spec requires.
		if (response.status === 404 && this.#sessionId) {
			this.#sessionId = null
			this.#initialized = false
			if (method !== 'initialize') return this.#request(method, params, signal)
		}

		if (!response.ok) {
			throw new Error(
				`Remote MCP server "${this.config.name}" returned ${response.status} for ${method}.`
			)
		}

		const sessionId = response.headers.get('Mcp-Session-Id')
		if (sessionId) this.#sessionId = sessionId

		const message = await this.#readMessage(response, id)

		if (message?.error) {
			throw new Error(`Remote MCP error (${message.error.code}): ${message.error.message}`)
		}

		return message?.result
	}

	#post(body: unknown, signal?: AbortSignal): Promise<Response> {
		const timeoutMs = this.config.timeoutMs ?? 30_000
		const timeout = AbortSignal.timeout(timeoutMs)
		// Either the caller cancelling or the timeout should abort the request.
		const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

		return fetch(this.config.url, {
			method: 'POST',
			headers: this.#headers(),
			body: JSON.stringify(body),
			signal: combined,
		})
	}

	/**
	 * Read one JSON-RPC response, from either a plain JSON body or an SSE stream.
	 * For a stream we take the first event carrying the response to our request id
	 * and stop reading — the spec allows the server to send unrelated messages first.
	 */
	async #readMessage(response: Response, id: number): Promise<JsonRpcResponse | null> {
		const contentType = response.headers.get('Content-Type') ?? ''

		if (!contentType.includes('text/event-stream')) {
			const text = await response.text()
			if (!text) return null
			return JSON.parse(text) as JsonRpcResponse
		}

		const reader = response.body?.getReader()
		if (!reader) return null

		const decoder = new TextDecoder()
		let buffer = ''

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })

				// SSE events are separated by a blank line.
				let boundary = buffer.indexOf('\n\n')
				while (boundary !== -1) {
					const rawEvent = buffer.slice(0, boundary)
					buffer = buffer.slice(boundary + 2)

					const data = rawEvent
						.split('\n')
						.filter((line) => line.startsWith('data:'))
						.map((line) => line.slice(5).trim())
						.join('')

					if (data) {
						try {
							const message = JSON.parse(data) as JsonRpcResponse
							if (message.id === id) return message
						} catch {
							// Not JSON, or a partial frame — keep reading.
						}
					}

					boundary = buffer.indexOf('\n\n')
				}
			}
		} finally {
			await reader.cancel().catch(() => undefined)
		}

		return null
	}
}
