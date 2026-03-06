import { describe, expect, it } from 'vitest'
import * as z from 'zod/v4'

import type { PageAgentTool } from '../tools'
import { normalizeResponse } from '../utils/autoFixer'

/** Helper to build a standard OpenAI-style response */
function makeResponse(toolName: string, args: any, content?: string) {
	return {
		choices: [
			{
				message: {
					role: 'assistant',
					content: content ?? null,
					tool_calls: [
						{
							id: 'call_1',
							type: 'function',
							function: { name: toolName, arguments: JSON.stringify(args) },
						},
					],
				},
			},
		],
	}
}

function makeContentResponse(content: string) {
	return { choices: [{ message: { role: 'assistant', content } }] }
}

/** Minimal tool map for testing */
function makeTools(): Map<string, PageAgentTool> {
	const map = new Map<string, PageAgentTool>()
	map.set('click_element_by_index', {
		description: 'Click',
		inputSchema: z.object({ index: z.number().int().min(0) }),
		execute: async () => 'ok',
	})
	map.set('wait', {
		description: 'Wait',
		inputSchema: z.object({ seconds: z.number().min(1).max(10).default(1) }),
		execute: async () => 'ok',
	})
	map.set('done', {
		description: 'Done',
		inputSchema: z.object({ text: z.string(), success: z.boolean().default(true) }),
		execute: async () => 'ok',
	})
	return map
}

describe('normalizeResponse', () => {
	it('passes through standard AgentOutput tool_call', () => {
		const args = { action: { click_element_by_index: { index: 3 } }, thinking: 'test' }
		const res = normalizeResponse(makeResponse('AgentOutput', args), makeTools())
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action.click_element_by_index.index).toBe(3)
		expect(res.choices[0].message.tool_calls[0].function.name).toBe('AgentOutput')
	})

	it('fixes wrong tool name (action name instead of AgentOutput)', () => {
		// Model returns click_element_by_index as tool name with its args directly
		// autoFixer wraps the parsed args into { action: ... }
		// So {index:5} becomes { action: {index:5} } — we pass without tools to skip validation
		const res = normalizeResponse(makeResponse('click_element_by_index', { index: 5 }))
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action).toBeDefined()
		expect(parsed.action.index).toBe(5)
		expect(res.choices[0].message.tool_calls[0].function.name).toBe('AgentOutput')
	})

	it('extracts JSON from content when no tool_calls', () => {
		const content = JSON.stringify({
			action: { wait: { seconds: 2 } },
			thinking: 'loading',
		})
		const res = normalizeResponse(makeContentResponse(content), makeTools())
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action.wait.seconds).toBe(2)
	})

	it('handles double-stringified arguments', () => {
		const inner = { action: { done: { text: 'hi', success: true } } }
		// Double stringify: arguments is a JSON string of a JSON string
		const response = {
			choices: [
				{
					message: {
						role: 'assistant',
						tool_calls: [
							{
								id: 'call_1',
								type: 'function',
								function: {
									name: 'AgentOutput',
									arguments: JSON.stringify(JSON.stringify(inner)),
								},
							},
						],
					},
				},
			],
		}
		const res = normalizeResponse(response, makeTools())
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action.done.text).toBe('hi')
	})

	it('falls back to wait when action is missing', () => {
		// Response with tool_call but no action in arguments
		const res = normalizeResponse(makeResponse('AgentOutput', { thinking: 'hmm' }), makeTools())
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action).toEqual({ name: 'wait', input: { seconds: 1 } })
	})

	it('coerces primitive action input for single-field tools', () => {
		// {"click_element_by_index": 2} → {"click_element_by_index": {"index": 2}}
		const args = { action: { click_element_by_index: 2 } }
		const res = normalizeResponse(makeResponse('AgentOutput', args), makeTools())
		const parsed = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments)
		expect(parsed.action.click_element_by_index.index).toBe(2)
	})

	it('throws on unknown tool name in action', () => {
		const args = { action: { nonexistent_tool: { foo: 1 } } }
		expect(() => normalizeResponse(makeResponse('AgentOutput', args), makeTools())).toThrow(
			'Unknown action'
		)
	})

	it('throws when no choices in response', () => {
		expect(() => normalizeResponse({ choices: [] })).toThrow('No choices')
	})

	it('throws when no message content and no tool_calls', () => {
		expect(() => normalizeResponse({ choices: [{ message: {} }] })).toThrow()
	})
})
