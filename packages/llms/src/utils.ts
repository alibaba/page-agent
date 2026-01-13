/**
 * Utility functions for LLM integration
 */
import chalk from 'chalk'
import { z } from 'zod'

import type { Tool } from './types'

function debug(message: string) {
	console.debug(chalk.gray('[LLM]'), message)
}

/**
 * Convert Zod schema to OpenAI tool format
 * Uses Zod 4 native z.toJSONSchema()
 */
export function zodToOpenAITool(name: string, tool: Tool) {
	return {
		type: 'function' as const,
		function: {
			name,
			description: tool.description,
			parameters: z.toJSONSchema(tool.inputSchema, { target: 'openapi-3.0' }),
		},
	}
}

/**
 * Patch model specific parameters
 */
export function modelPatch(body: Record<string, any>) {
	const model: string = body.model || ''
	if (!model) return body

	const modelName = normalizeModelName(model)

	if (modelName === 'qwen3') {
		debug('Applying Qwen-3 patch: use higher temperature for auto fixing')
		body.temperature = Math.max(body.temperature || 0, 1.0)
	}

	if (modelName.startsWith('claude')) {
		debug('Applying Claude patch: disable thinking')
		body.thinking = { type: 'disabled' }

		// Convert tool_choice to Claude format
		if (body.tool_choice === 'required') {
			// 'required' -> { type: 'any' } (must call some tool)
			debug('Applying Claude patch: convert tool_choice "required" to { type: "any" }')
			body.tool_choice = { type: 'any' }
		} else if (body.tool_choice?.function?.name) {
			// { type: 'function', function: { name: '...' } } -> { type: 'tool', name: '...' }
			debug('Applying Claude patch: convert tool_choice format')
			body.tool_choice = { type: 'tool', name: body.tool_choice.function.name }
		}
	}

	if (modelName.startsWith('grok')) {
		debug('Applying Grok patch: removing tool_choice')
		delete body.tool_choice
		debug('Applying Grok patch: disable reasoning and thinking')
		body.thinking = { type: 'disabled', effort: 'minimal' }
		body.reasoning = { enabled: false, effort: 'low' }
	}

	if (modelName.startsWith('gpt')) {
		debug('Applying GPT patch: set verbosity to low')
		body.verbosity = 'low'

		if (modelName.startsWith('gpt-52')) {
			debug('Applying GPT-52 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-51')) {
			debug('Applying GPT-51 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-5')) {
			debug('Applying GPT-5 patch: set reasoning effort to low')
			body.reasoning_effort = 'low'
		}
	}

	if (modelName.startsWith('gemini')) {
		debug('Applying Gemini patch: set reasoning effort to minimal')
		body.reasoning_effort = 'minimal'
	}

	return body
}

/**
 * check if a given model ID fits a specific model name
 *
 * @note
 * Different model providers may use different model IDs for the same model.
 * For example, openai's `gpt-5.2` may called:
 *
 * - `gpt-5.2-version`
 * - `gpt-5_2-date`
 * - `GPT-52-version-date`
 * - `openai/gpt-5.2-chat`
 *
 * They should be treated as the same model.
 * Normalize them to `gpt-52`
 */
function normalizeModelName(modelName: string): string {
	let normalizedName = modelName.toLowerCase()

	// remove prefix before '/'
	if (normalizedName.includes('/')) {
		normalizedName = normalizedName.split('/')[1]
	}

	// remove '_'
	normalizedName = normalizedName.replace(/_/g, '')

	// remove '.'
	normalizedName = normalizedName.replace(/\./g, '')

	return normalizedName
}
