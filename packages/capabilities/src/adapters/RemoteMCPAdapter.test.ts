import { afterEach, describe, expect, it, vi } from 'vitest'

import { RemoteMCPAdapter } from './RemoteMCPAdapter'

interface Call {
	url: string
	init: RequestInit
	body: any
}

/**
 * Stand-in MCP server. Records every request so the tests can assert on the
 * wire protocol — session id, protocol version header, message shapes — rather
 * than only on the adapter's return values.
 */
function mockServer(options: { sessionId?: string; sse?: boolean } = {}) {
	const calls: Call[] = []

	const handler = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
		const body = init?.body ? JSON.parse(init.body as string) : undefined
		const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
		calls.push({ url: href, init: init ?? {}, body })

		if (init?.method === 'DELETE') return new Response(null, { status: 200 })

		// Notifications get 202 with no body.
		if (body && body.id === undefined) return new Response(null, { status: 202 })

		let result: unknown
		if (body.method === 'initialize') {
			result = { protocolVersion: '2025-06-18', capabilities: { tools: {} } }
		} else if (body.method === 'tools/list') {
			result = {
				tools: [
					{
						name: 'check_inventory',
						description: 'Check stock for a SKU',
						inputSchema: { type: 'object', properties: { sku: { type: 'string' } } },
						annotations: { readOnlyHint: true },
					},
				],
			}
		} else if (body.method === 'tools/call') {
			result = { content: [{ type: 'text', text: 'in stock: 4' }], isError: false }
		}

		const message = JSON.stringify({ jsonrpc: '2.0', id: body.id, result })

		const headers: Record<string, string> = {}
		if (options.sessionId && body.method === 'initialize') {
			headers['Mcp-Session-Id'] = options.sessionId
		}

		if (options.sse) {
			headers['Content-Type'] = 'text/event-stream'
			return new Response(`event: message\ndata: ${message}\n\n`, { headers })
		}

		headers['Content-Type'] = 'application/json'
		return new Response(message, { headers })
	})

	return { handler, calls }
}

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe('RemoteMCPAdapter', () => {
	it('performs the initialize handshake before listing tools', async () => {
		const { handler, calls } = mockServer()
		globalThis.fetch = handler as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 'inventory', url: 'https://mcp.example/mcp' })
		const tools = await adapter.listTools()

		expect(calls[0].body.method).toBe('initialize')
		expect(calls[0].body.params.protocolVersion).toBe('2025-06-18')
		expect(calls[1].body.method).toBe('notifications/initialized')
		expect(calls[2].body.method).toBe('tools/list')

		expect(tools).toHaveLength(1)
		expect(tools[0].name).toBe('check_inventory')
	})

	it('sends both required Accept types', async () => {
		const { handler, calls } = mockServer()
		globalThis.fetch = handler as unknown as typeof fetch

		await new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' }).listTools()

		const accept = (calls[0].init.headers as Record<string, string>).Accept
		expect(accept).toContain('application/json')
		expect(accept).toContain('text/event-stream')
	})

	it('carries the session id and protocol version on later requests', async () => {
		const { handler, calls } = mockServer({ sessionId: 'sess-123' })
		globalThis.fetch = handler as unknown as typeof fetch

		await new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' }).listTools()

		const listHeaders = calls[2].init.headers as Record<string, string>
		expect(listHeaders['Mcp-Session-Id']).toBe('sess-123')
		expect(listHeaders['MCP-Protocol-Version']).toBe('2025-06-18')

		// The initialize request itself carries neither.
		const initHeaders = calls[0].init.headers as Record<string, string>
		expect(initHeaders['Mcp-Session-Id']).toBeUndefined()
	})

	it('calls a tool and normalizes the content array', async () => {
		const { handler, calls } = mockServer()
		globalThis.fetch = handler as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' })
		const result = await adapter.callTool('check_inventory', { sku: 'ABC' })

		expect(result.content).toBe('in stock: 4')

		const callBody = calls.at(-1)!.body
		expect(callBody.method).toBe('tools/call')
		expect(callBody.params).toEqual({ name: 'check_inventory', arguments: { sku: 'ABC' } })
	})

	it('reads a response delivered as an SSE stream', async () => {
		const { handler } = mockServer({ sse: true })
		globalThis.fetch = handler as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' })
		const result = await adapter.callTool('check_inventory', { sku: 'ABC' })

		expect(result.content).toBe('in stock: 4')
	})

	it('surfaces a tool-level failure as an error, not a silent success', async () => {
		globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
			const body = init?.body ? JSON.parse(init.body as string) : {}
			if (body.id === undefined) return new Response(null, { status: 202 })

			const result =
				body.method === 'initialize'
					? { protocolVersion: '2025-06-18', capabilities: {} }
					: { content: [{ type: 'text', text: 'rate limit exceeded' }], isError: true }

			return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}) as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' })

		await expect(adapter.callTool('x', {})).rejects.toThrow(/rate limit exceeded/)
	})

	it('surfaces a JSON-RPC protocol error', async () => {
		globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
			const body = init?.body ? JSON.parse(init.body as string) : {}
			if (body.id === undefined) return new Response(null, { status: 202 })

			if (body.method === 'initialize') {
				return new Response(
					JSON.stringify({
						jsonrpc: '2.0',
						id: body.id,
						result: { protocolVersion: '2025-06-18', capabilities: {} },
					}),
					{ headers: { 'Content-Type': 'application/json' } }
				)
			}

			return new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					id: body.id,
					error: { code: -32602, message: 'Unknown tool: nope' },
				}),
				{ headers: { 'Content-Type': 'application/json' } }
			)
		}) as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' })

		await expect(adapter.callTool('nope', {})).rejects.toThrow(/Unknown tool/)
	})

	it('follows pagination to collect every tool', async () => {
		let page = 0
		globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
			const body = init?.body ? JSON.parse(init.body as string) : {}
			if (body.id === undefined) return new Response(null, { status: 202 })

			let result: unknown
			if (body.method === 'initialize') {
				result = { protocolVersion: '2025-06-18', capabilities: {} }
			} else {
				page++
				result =
					page === 1
						? { tools: [{ name: 'first' }], nextCursor: 'page2' }
						: { tools: [{ name: 'second' }] }
			}

			return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}) as unknown as typeof fetch

		const adapter = new RemoteMCPAdapter({ name: 's', url: 'https://mcp.example/mcp' })
		const tools = await adapter.listTools()

		expect(tools.map((tool) => tool.name)).toEqual(['first', 'second'])
	})
})
