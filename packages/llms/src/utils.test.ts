import { describe, expect, it } from 'vitest'

import { modelPatch, normalizeModelName } from './utils'

describe('normalizeModelName', () => {
	it.each([
		['gpt-5.2', 'gpt-52'],
		['gpt_5_2', 'gpt52'],
		['GPT-52-2026-01-01', 'gpt-52-2026-01-01'],
		['openai/gpt-5.2-chat', 'gpt-52-chat'],
		['claude_sonnet4_5', 'claudesonnet45'],
		// A gateway id can carry more than one prefix; the model name is the
		// last segment, not the second one.
		['together/meta-llama/llama-3-70b', 'llama-3-70b'],
		['openrouter/anthropic/claude-opus-4', 'claude-opus-4'],
		['openrouter/qwen/qwen3-max', 'qwen3-max'],
		['models/gpt-5.2/', 'gpt-52'],
	])('%s -> %s', (input, expected) => {
		expect(normalizeModelName(input)).toBe(expected)
	})

	it('applies model patches through a multi-prefix id', () => {
		// 'openrouter/anthropic/claude-opus-4' normalised to 'anthropic', so the
		// Claude patch below never ran.
		expect(modelPatch({ model: 'openrouter/anthropic/claude-opus-4' })).toMatchObject({
			thinking: { type: 'disabled' },
		})
		// 'openrouter/qwen/qwen3-max' normalised to 'qwen', which does not match
		// /max|plus/, so the temperature was raised on a model that excludes it.
		expect(modelPatch({ model: 'openrouter/qwen/qwen3-max' }).temperature).toBeUndefined()
	})
})
