/**
 * Utility functions for LLM integration
 */
import chalk from 'chalk'
import * as z from 'zod/v4'

import type { Tool } from './types'

const debug = console.debug.bind(console, chalk.gray('[LLM]'))

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
 * Patch model specific parameters. Only patches known models.
 *
 * @purpose
 * - Reconcile the differences in the parameter schema each model accepts.
 * - Disable thinking/reasoning, or lower it to the minimum where a full disable is impossible.
 * - Minimize returned tokens.
 * - Raise temperature for known smaller models to improve auto-recovery odds.
 * @note Honor temperature if explicitly set by the user
 *
 * @todo Need vendor-specific patches.
 * Local and 3rd-party hosted models may have different schema.
 */
export function modelPatch(body: Record<string, any>, baseURL?: string) {
	const model: string = body.model || ''
	if (!model) return body

	const provider = getProvider(baseURL)

	const modelName = normalizeModelName(model)

	if (modelName.startsWith('qwen')) {
		debug('Patch Qwen: disable thinking')
		body.enable_thinking = false
		if (body.temperature === undefined && !/max|plus/.test(modelName)) {
			debug('Patch Qwen: raise temperature to 1.0')
			body.temperature = 1.0
		}
	}

	if (modelName.startsWith('deepseek')) {
		debug('Patch DeepSeek: disable thinking, remove tool_choice')
		body.thinking = { type: 'disabled' }
		delete body.tool_choice
	}

	if (modelName.startsWith('gpt')) {
		if (modelName.startsWith('gpt-5')) {
			body.verbosity = 'low'
		}

		// Since gpt-5.4, /chat/completions rejects any explicit reasoning_effort
		// when function tools are present. Newer models are expected to follow.
		// - gpt-5.1 / gpt-5.2 can fully disable reasoning
		// - gpt-5 / -mini / -nano bottom out at "minimal"
		// - everything else (gpt-4.x, chat-latest, gpt-5.4+) must not receive it
		if (modelName.includes('chat-latest')) {
			debug('Patch chat-latest: omit reasoning_effort and temperature')
			delete body.reasoning_effort
			delete body.temperature
		} else if (/^gpt-5[12](-|$)/.test(modelName)) {
			debug('Patch GPT-5.1/5.2: reasoning_effort=none')
			body.reasoning_effort = 'none'
		} else if (/^gpt-5(-|$)/.test(modelName)) {
			debug('Patch GPT-5: reasoning_effort=minimal')
			body.reasoning_effort = 'minimal'
		} else {
			debug('Patch GPT: omit reasoning_effort')
			delete body.reasoning_effort
		}
	}

	if (modelName.startsWith('claude')) {
		if (/opus|sonnet|haiku/.test(modelName)) {
			debug('Patch Claude: disable thinking')
			body.thinking = { type: 'disabled' }

			if (provider !== 'openrouter') {
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
		} else {
			debug('Patch Claude: reasoning_effort=low')
			body.reasoning_effort = 'low'

			// Fable and mythos can not disable adaptive thinking.
			// Claude does not support tool_choice with extended thinking.
			// These 2 concepts are blurred. Basically no tool_choice with thinking.
			delete body.tool_choice
		}
	}

	if (modelName.startsWith('gemini')) {
		debug('Patch Gemini: reasoning_effort=low')
		body.reasoning_effort = 'low'
		if (/^gemini-25(?!.*pro)/.test(modelName)) {
			debug('Patch Gemini 2.5 non-Pro: reasoning_effort=none')
			body.reasoning_effort = 'none'
		} else if (
			modelName.startsWith('gemini-35-flash') ||
			modelName.startsWith('gemini-31-flash-lite') ||
			modelName.startsWith('gemini-3-flash')
		) {
			debug('Patch Gemini 3.x Flash/Lite: reasoning_effort=minimal')
			body.reasoning_effort = 'minimal'
		}
	}

	if (modelName.startsWith('glm')) {
		debug('Patch GLM: disable thinking')
		body.thinking = { type: 'disabled' }
	}

	if (modelName.startsWith('hy')) {
		debug('Patch Hunyuan: disable thinking, reasoning_effort=low')
		body.thinking = { type: 'disabled' }
		body.reasoning_effort = 'low'
	}

	if (modelName.startsWith('grok')) {
		if (/^grok-4-?3/.test(modelName)) {
			debug('Patch Grok 4.3: reasoning_effort=none')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('grok-3-mini') || modelName.startsWith('grok-code-fast')) {
			debug('Patch Grok mini/code: reasoning_effort=low')
			body.reasoning_effort = 'low'
		}
	}

	if (modelName.startsWith('kimi')) {
		if (modelName.startsWith('kimi-k3')) {
			// Kimi K3 always thinks and rejects named tool choice while thinking.
			debug('Patch Kimi K3: use required tool choice, remove parallel tool calls')
			delete body.parallel_tool_calls
			if (body.tool_choice?.function?.name) body.tool_choice = 'required'
		} else if (!modelName.includes('code')) {
			// kimi-k2.7-code cannot disable thinking
			debug('Patch Kimi: disable thinking')
			body.thinking = { type: 'disabled' }
		}
	}

	if (modelName.startsWith('minimax')) {
		debug('Patch MiniMax: remove parallel_tool_calls')
		delete body.parallel_tool_calls

		if (modelName.includes('m3')) {
			// Only M3 can disable thinking
			debug('Patch MiniMax: disable thinking')
			body.thinking = { type: 'disabled' }
		}
	}

	// provider patches

	if (provider === 'openrouter') {
		// openrouter use reasoning object instead of reasoning_effort

		const reasoningEffort = body.reasoning_effort
		const reasoningDisabled =
			body.thinking?.type === 'disabled' ||
			body.enable_thinking === false ||
			reasoningEffort === 'none'

		if (reasoningDisabled) {
			body.reasoning = { enabled: false }
		} else if (reasoningEffort) {
			body.reasoning = { enabled: true, effort: reasoningEffort }
		}
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
export function normalizeModelName(modelName: string): string {
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

export function getProvider(baseURL?: string): 'openrouter' | undefined {
	if (!baseURL) return undefined
	try {
		const url = new URL(baseURL)
		const hostname = url.hostname
		if (hostname === 'openrouter.ai') return 'openrouter'
		return undefined
	} catch (e) {
		return undefined
	}
}
