import { describe, expect, it } from 'vitest'
import * as z from 'zod/v4'

import { modelPatch, zodToOpenAITool } from '../utils'

describe('modelPatch', () => {
	it('applies qwen patch: higher temperature + disable thinking', () => {
		const body = { model: 'qwen-turbo', temperature: 0.3 }
		modelPatch(body)
		expect(body.temperature).toBe(1.0)
		expect(body.enable_thinking).toBe(false)
	})

	it('applies claude patch: disable thinking + convert tool_choice', () => {
		const body = { model: 'claude-3-opus', tool_choice: 'required' }
		modelPatch(body)
		expect(body.thinking).toEqual({ type: 'disabled' })
		expect(body.tool_choice).toEqual({ type: 'any' })
	})

	it('converts claude tool_choice function format', () => {
		const body = {
			model: 'claude-3-sonnet',
			tool_choice: { type: 'function', function: { name: 'myTool' } },
		}
		modelPatch(body)
		expect(body.tool_choice).toEqual({ type: 'tool', name: 'myTool' })
	})

	it('normalizes model names with prefix/dots/underscores', () => {
		// GPT variant with prefix — gets verbosity patch
		const body1 = { model: 'openai/GPT-4o', temperature: 0.5 }
		modelPatch(body1)
		expect(body1).toHaveProperty('verbosity')

		// qwen variant with underscores
		const body2 = { model: 'dashscope/qwen_plus_latest', temperature: 0.2 }
		modelPatch(body2)
		expect(body2.temperature).toBe(1.0)
	})

	it('returns body unchanged for empty model', () => {
		const body = { model: '', temperature: 0.5 }
		const result = modelPatch(body)
		expect(result).toBe(body)
		expect(body.temperature).toBe(0.5)
	})
})

describe('zodToOpenAITool', () => {
	it('converts zod schema to OpenAI function format', () => {
		const tool = {
			description: 'Test tool',
			inputSchema: z.object({ name: z.string(), count: z.number().optional() }),
			execute: async () => 'ok',
		}
		const result = zodToOpenAITool('myTool', tool)

		expect(result.type).toBe('function')
		expect(result.function.name).toBe('myTool')
		expect(result.function.description).toBe('Test tool')
		expect(result.function.parameters).toHaveProperty('properties')
		expect(result.function.parameters.properties).toHaveProperty('name')
	})
})
