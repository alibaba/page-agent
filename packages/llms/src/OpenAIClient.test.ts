import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod/v4'

import { OpenAIClient } from './OpenAIClient'
import { InvokeError, InvokeErrorTypes } from './errors'
import { parseLLMConfig } from './index'
import type { LLMConfig, Tool } from './types'

// ---------- Fixtures ----------

function makeClient(overrides: Partial<LLMConfig> = {}) {
	const fetchMock = vi.fn<typeof fetch>()
	const config = parseLLMConfig({
		baseURL: 'http://test.local/v1',
		model: 'test-model',
		apiKey: 'sk-test',
		customFetch: fetchMock,
		...overrides,
	})
	const client = new OpenAIClient(config)
	return { client, fetchMock }
}

function makeTool(): Tool<{ name: string }, string> {
	return {
		description: 'greet',
		inputSchema: z.object({ name: z.string() }),
		execute: vi.fn(async (args) => `hello ${args.name}`),
	}
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

function toolCallBody(toolName: string, args: unknown, finishReason = 'tool_calls') {
	return {
		choices: [
			{
				finish_reason: finishReason,
				message: {
					tool_calls: [
						{
							id: 'call_1',
							type: 'function',
							function: {
								name: toolName,
								arguments: typeof args === 'string' ? args : JSON.stringify(args),
							},
						},
					],
				},
			},
		],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
	}
}

function abortError(message = 'aborted'): Error {
	const err = new Error(message)
	err.name = 'AbortError'
	return err
}

function getSentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const init = fetchMock.mock.calls[0][1] as RequestInit
	return JSON.parse(init.body as string)
}

const signal = new AbortController().signal

// ---------- Request construction ----------

describe('OpenAIClient.invoke — request construction', () => {
	let setup: ReturnType<typeof makeClient>
	const tools = { greet: makeTool() }

	beforeEach(() => {
		setup = makeClient()
		setup.fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'world' })))
	})

	it('defaults tool_choice to "required" when no toolChoiceName is given', async () => {
		await setup.client.invoke([], tools, signal)
		expect(getSentBody(setup.fetchMock).tool_choice).toBe('required')
	})

	it('uses named tool_choice when toolChoiceName is given', async () => {
		await setup.client.invoke([], tools, signal, { toolChoiceName: 'greet' })
		expect(getSentBody(setup.fetchMock).tool_choice).toEqual({
			type: 'function',
			function: { name: 'greet' },
		})
	})

	it('falls back to "required" when disableNamedToolChoice is true', async () => {
		const { client, fetchMock } = makeClient({ disableNamedToolChoice: true })
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'world' })))
		await client.invoke([], tools, signal, { toolChoiceName: 'greet' })
		expect(getSentBody(fetchMock).tool_choice).toBe('required')
	})

	it('sends Authorization header when apiKey is set', async () => {
		await setup.client.invoke([], tools, signal)
		const init = setup.fetchMock.mock.calls[0][1]!
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
	})

	it('omits Authorization header when apiKey is empty', async () => {
		const { client, fetchMock } = makeClient({ apiKey: '' })
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'world' })))
		await client.invoke([], tools, signal)
		const init = fetchMock.mock.calls[0][1]!
		expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
	})

	it('applies transformRequestBody (in-place form, returns undefined)', async () => {
		const { client, fetchMock } = makeClient({
			transformRequestBody: (body) => {
				body.custom_flag = 42
				return undefined
			},
		})
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'world' })))
		await client.invoke([], tools, signal)
		expect(getSentBody(fetchMock).custom_flag).toBe(42)
	})

	it('applies transformRequestBody (returning a new object)', async () => {
		const { client, fetchMock } = makeClient({
			transformRequestBody: () => ({ replaced: true }),
		})
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'world' })))
		await client.invoke([], tools, signal)
		expect(getSentBody(fetchMock)).toEqual({ replaced: true })
	})

	it('wraps transformRequestBody throws as CONFIG_ERROR', async () => {
		const { client } = makeClient({
			transformRequestBody: () => {
				throw new Error('bad transform')
			},
		})
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			name: 'InvokeError',
			type: InvokeErrorTypes.CONFIG_ERROR,
		})
	})
})

// ---------- Success path ----------

describe('OpenAIClient.invoke — success', () => {
	it('returns toolCall, toolResult and usage', async () => {
		const { client, fetchMock } = makeClient()
		const tool = makeTool()
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'Alice' })))

		const result = await client.invoke([], { greet: tool }, signal)

		expect(result.toolCall).toEqual({ name: 'greet', args: { name: 'Alice' } })
		expect(result.toolResult).toBe('hello Alice')
		expect(result.usage).toEqual({
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			cachedTokens: undefined,
			reasoningTokens: undefined,
		})
		expect(tool.execute).toHaveBeenCalledWith({ name: 'Alice' })
	})

	it('accepts finish_reason="stop" with tool calls', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'Bob' }, 'stop')))
		const result = await client.invoke([], { greet: makeTool() }, signal)
		expect(result.toolResult).toBe('hello Bob')
	})
})

// ---------- HTTP errors ----------

describe('OpenAIClient.invoke — HTTP errors', () => {
	const tools = { greet: makeTool() }

	it.each([
		[401, InvokeErrorTypes.AUTH_ERROR],
		[403, InvokeErrorTypes.AUTH_ERROR],
		[429, InvokeErrorTypes.RATE_LIMIT],
		[500, InvokeErrorTypes.SERVER_ERROR],
		[502, InvokeErrorTypes.SERVER_ERROR],
		[418, InvokeErrorTypes.UNKNOWN],
	])('maps status %i to %s', async (status, type) => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, status))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			name: 'InvokeError',
			type,
		})
	})

	it('falls back to statusText when body has no error.message', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(
			new Response('not json', { status: 500, statusText: 'Internal Boom' })
		)
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.SERVER_ERROR,
			message: expect.stringContaining('Internal Boom'),
		})
	})
})

// ---------- Response anomalies ----------

describe('OpenAIClient.invoke — response anomalies', () => {
	const tools = { greet: makeTool() }

	it('throws CONTEXT_LENGTH on finish_reason="length"', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(
			jsonResponse({ choices: [{ finish_reason: 'length', message: {} }] })
		)
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.CONTEXT_LENGTH,
		})
	})

	it('throws CONTENT_FILTER on finish_reason="content_filter"', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(
			jsonResponse({ choices: [{ finish_reason: 'content_filter', message: {} }] })
		)
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.CONTENT_FILTER,
		})
	})

	it('throws INVALID_SCHEMA when there are no choices', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(jsonResponse({}))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.INVALID_SCHEMA,
		})
	})

	it('throws NO_TOOL_CALL when message has no tool_calls', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(
			jsonResponse({ choices: [{ finish_reason: 'tool_calls', message: {} }] })
		)
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.NO_TOOL_CALL,
		})
	})

	it('throws INVALID_TOOL_ARGS when arguments are not valid JSON', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', 'not-json{')))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.INVALID_TOOL_ARGS,
			message: expect.stringContaining('JSON'),
		})
	})

	it('throws INVALID_TOOL_ARGS when args fail Zod validation', async () => {
		const { client, fetchMock } = makeClient()
		// tool expects { name: string }, send { name: 123 }
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 123 })))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.INVALID_TOOL_ARGS,
		})
	})

	it('throws UNKNOWN when model calls a tool that does not exist', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('mystery', { name: 'x' })))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.UNKNOWN,
			message: expect.stringContaining('mystery'),
		})
	})

	it('wraps tool.execute failures as TOOL_EXECUTION_ERROR', async () => {
		const { client, fetchMock } = makeClient()
		const tool: Tool<{ name: string }, string> = {
			inputSchema: z.object({ name: z.string() }),
			execute: vi.fn(async () => {
				throw new Error('downstream blew up')
			}),
		}
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'x' })))
		await expect(client.invoke([], { greet: tool }, signal)).rejects.toMatchObject({
			type: InvokeErrorTypes.TOOL_EXECUTION_ERROR,
			message: expect.stringContaining('downstream blew up'),
		})
	})
})

// ---------- Abort handling (the important part) ----------

describe('OpenAIClient.invoke — abort', () => {
	const tools = { greet: makeTool() }

	it('throws AbortError immediately when signal is already aborted', async () => {
		const { client, fetchMock } = makeClient()
		const controller = new AbortController()
		controller.abort()

		await expect(client.invoke([], tools, controller.signal)).rejects.toMatchObject({
			name: 'AbortError',
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('propagates AbortError thrown by fetch (does NOT wrap as NETWORK_ERROR)', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockRejectedValue(abortError())

		const err = await client.invoke([], tools, signal).catch((e) => e)
		expect(err).toBeInstanceOf(Error)
		expect(err).not.toBeInstanceOf(InvokeError)
		expect(err.name).toBe('AbortError')
	})

	it('propagates AbortError thrown by response.json() (does NOT wrap as INVALID_RESPONSE)', async () => {
		const { client, fetchMock } = makeClient()
		// Fake Response whose .json() rejects with AbortError mid-read
		const fakeResponse = {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: () => Promise.reject(abortError()),
		} as unknown as Response
		fetchMock.mockResolvedValue(fakeResponse)

		const err = await client.invoke([], tools, signal).catch((e) => e)
		expect(err).not.toBeInstanceOf(InvokeError)
		expect(err.name).toBe('AbortError')
	})

	it('propagates AbortError thrown by tool.execute (does NOT wrap as TOOL_EXECUTION_ERROR)', async () => {
		const { client, fetchMock } = makeClient()
		const tool: Tool<{ name: string }, string> = {
			inputSchema: z.object({ name: z.string() }),
			execute: vi.fn(async () => {
				throw abortError()
			}),
		}
		fetchMock.mockResolvedValue(jsonResponse(toolCallBody('greet', { name: 'x' })))

		const err = await client.invoke([], { greet: tool }, signal).catch((e) => e)
		expect(err).not.toBeInstanceOf(InvokeError)
		expect(err.name).toBe('AbortError')
	})

	// Sanity check: the wrappers we deliberately bypass for AbortError still work for normal errors
	it('still wraps non-Abort fetch errors as NETWORK_ERROR', async () => {
		const { client, fetchMock } = makeClient()
		fetchMock.mockRejectedValue(new TypeError('ECONNREFUSED'))
		await expect(client.invoke([], tools, signal)).rejects.toMatchObject({
			name: 'InvokeError',
			type: InvokeErrorTypes.NETWORK_ERROR,
		})
	})
})
