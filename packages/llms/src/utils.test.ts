import { describe, expect, it } from 'vitest'

import { modelPatch } from './utils'

/**
 * Baseline request body used as starting point for each provider test.
 * Mirrors what OpenAIClient builds before calling modelPatch.
 */
function baseBody(model: string) {
	return {
		model,
		temperature: 0.7,
		messages: [],
		tools: [],
		parallel_tool_calls: false,
		tool_choice: 'required' as unknown,
	}
}

describe('modelPatch', () => {
	it('returns body unchanged when model is missing', () => {
		const body = { temperature: 0.7 }
		expect(modelPatch(body)).toBe(body)
		expect(body).toEqual({ temperature: 0.7 })
	})

	it('qwen: bumps temperature and disables thinking', () => {
		const body = baseBody('qwen-max')
		modelPatch(body)
		expect(body.temperature).toBe(1.0)
		expect(body).toMatchObject({ enable_thinking: false })
	})

	it('qwen: keeps higher caller-provided temperature', () => {
		const body = baseBody('qwen-max')
		body.temperature = 1.5
		modelPatch(body)
		expect(body.temperature).toBe(1.5)
	})

	it('claude: disables thinking and converts tool_choice "required" -> { type: "any" }', () => {
		const body = baseBody('claude-3-5-sonnet')
		modelPatch(body)
		expect(body).toMatchObject({
			thinking: { type: 'disabled' },
			tool_choice: { type: 'any' },
		})
	})

	it('claude: converts named tool_choice to { type: "tool", name }', () => {
		const body = baseBody('claude-3-5-sonnet')
		body.tool_choice = { type: 'function', function: { name: 'doStuff' } }
		modelPatch(body)
		expect(body.tool_choice).toEqual({ type: 'tool', name: 'doStuff' })
	})

	it('claude-opus-4-7: drops temperature', () => {
		const body = baseBody('claude-opus-4-7')
		modelPatch(body)
		expect(body).not.toHaveProperty('temperature')
	})

	it('claude-opus-47 (alt id form): drops temperature', () => {
		// Provider sometimes ships ids with the dot stripped; modelPatch normalizes.
		const body = baseBody('claude-opus-47-20251029')
		modelPatch(body)
		expect(body).not.toHaveProperty('temperature')
	})

	it('claude-opus-4-8: drops temperature', () => {
		const body = baseBody('claude-opus-4-8')
		modelPatch(body)
		expect(body).not.toHaveProperty('temperature')
	})

	it('claude-opus-48 (alt id form): drops temperature', () => {
		const body = baseBody('claude-opus-48-20251210')
		modelPatch(body)
		expect(body).not.toHaveProperty('temperature')
	})

	it('grok: removes tool_choice and disables reasoning/thinking', () => {
		const body = baseBody('grok-4')
		modelPatch(body)
		expect(body).not.toHaveProperty('tool_choice')
		expect(body).toMatchObject({
			thinking: { type: 'disabled', effort: 'minimal' },
			reasoning: { enabled: false, effort: 'low' },
		})
	})

	it('gpt-5: sets verbosity=low and reasoning_effort=low', () => {
		const body = baseBody('gpt-5')
		modelPatch(body)
		expect(body).toMatchObject({ verbosity: 'low', reasoning_effort: 'low' })
	})

	it('gpt-5-mini: low effort, temperature=1', () => {
		const body = baseBody('gpt-5-mini')
		modelPatch(body)
		expect(body).toMatchObject({
			verbosity: 'low',
			reasoning_effort: 'low',
			temperature: 1,
		})
	})

	it('gpt-5.1 (gpt-51): disables reasoning', () => {
		const body = baseBody('gpt-5.1')
		modelPatch(body)
		expect(body).toMatchObject({ verbosity: 'low', reasoning_effort: 'none' })
	})

	it('gpt-5.4 (gpt-54): drops reasoning_effort', () => {
		const body = baseBody('gpt-5.4')
		modelPatch(body)
		expect(body).toMatchObject({ verbosity: 'low' })
		expect(body).not.toHaveProperty('reasoning_effort')
	})

	it('gpt-5.5 (gpt-55): drops reasoning_effort and temperature', () => {
		const body = baseBody('gpt-5.5')
		modelPatch(body)
		expect(body).toMatchObject({ verbosity: 'low' })
		expect(body).not.toHaveProperty('reasoning_effort')
		expect(body).not.toHaveProperty('temperature')
	})

	it('gemini: sets reasoning_effort=minimal', () => {
		const body = baseBody('gemini-2.5-pro')
		modelPatch(body)
		expect(body).toMatchObject({ reasoning_effort: 'minimal' })
	})

	it('deepseek: removes tool_choice', () => {
		const body = baseBody('deepseek-chat')
		modelPatch(body)
		expect(body).not.toHaveProperty('tool_choice')
	})

	it('minimax: clamps temperature into (0, 1] and removes parallel_tool_calls', () => {
		const body = baseBody('minimax-m2')
		body.temperature = 0
		modelPatch(body)
		expect(body.temperature).toBeGreaterThan(0)
		expect(body.temperature).toBeLessThanOrEqual(1)
		expect(body).not.toHaveProperty('parallel_tool_calls')
	})

	it('minimax: caps temperature at 1', () => {
		const body = baseBody('minimax-m2')
		body.temperature = 2
		modelPatch(body)
		expect(body.temperature).toBe(1)
	})

	it('normalizes provider-prefixed model id (openai/gpt-5)', () => {
		const body = baseBody('openai/gpt-5')
		modelPatch(body)
		expect(body).toMatchObject({ verbosity: 'low', reasoning_effort: 'low' })
	})
})
