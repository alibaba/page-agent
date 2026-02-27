import { InvokeError, InvokeErrorType } from '@page-agent/llms'
import chalk from 'chalk'
import * as z from 'zod'

import type { PageAgentTool } from '../tools'

/**
 * Normalize LLM response and fix common format issues.
 *
 * Handles:
 * - No tool_calls but JSON in message.content (fallback)
 * - Model returns action name as tool call instead of AgentOutput
 * - Arguments wrapped as double JSON string
 * - Nested function call format
 * - Missing action field (fallback to wait)
 * - Primitive action input for single-field tools (e.g. `{"click_element_by_index": 2}`)
 * - etc.
 */
export function normalizeResponse(response: any, tools?: Map<string, PageAgentTool>): any {
	let resolvedArguments = null as any

	const choice = (response as { choices?: Choice[] }).choices?.[0]
	if (!choice) throw new Error('No choices in response')

	const message = choice.message
	if (!message) throw new Error('No message in choice')

	const toolCall = message.tool_calls?.[0]

	// fix level and location of arguments

	if (toolCall?.function?.arguments) {
		resolvedArguments = safeJsonParse(toolCall.function.arguments)

		// case: sometimes the model only returns the action level
		if (toolCall.function.name && toolCall.function.name !== 'AgentOutput') {
			console.log(chalk.yellow(`[normalizeResponse] #1: fixing tool_call`))
			resolvedArguments = { action: safeJsonParse(resolvedArguments) }
		}
	} else {
		// case: sometimes the model returns json in content instead of tool_calls
		if (message.content) {
			const content = message.content.trim()
			const jsonInContent = retrieveJsonFromString(content)
			if (jsonInContent) {
				resolvedArguments = safeJsonParse(jsonInContent)

				// case: sometimes the content json includes upper level wrapper
				if (resolvedArguments?.name === 'AgentOutput') {
					console.log(chalk.yellow(`[normalizeResponse] #2: fixing tool_call`))
					resolvedArguments = safeJsonParse(resolvedArguments.arguments)
				}

				// case: sometimes even 2-levels of wrapping
				if (resolvedArguments?.type === 'function') {
					console.log(chalk.yellow(`[normalizeResponse] #3: fixing tool_call`))
					resolvedArguments = safeJsonParse(resolvedArguments.function.arguments)
				}

				// case: and sometimes action level only
				// todo: needs better detection logic
				if (
					!resolvedArguments?.action &&
					!resolvedArguments?.evaluation_previous_goal &&
					!resolvedArguments?.memory &&
					!resolvedArguments?.next_goal &&
					!resolvedArguments?.thinking
				) {
					console.log(chalk.yellow(`[normalizeResponse] #4: fixing tool_call`))
					resolvedArguments = { action: safeJsonParse(resolvedArguments) }
				}
			} else {
				throw new Error('No tool_call and the message content does not contain valid JSON')
			}
		} else {
			throw new Error('No tool_call nor message content is present')
		}
	}

	// fix double stringified arguments
	resolvedArguments = safeJsonParse(resolvedArguments)
	if (resolvedArguments.action) {
		resolvedArguments.action = safeJsonParse(resolvedArguments.action)
	}

	// validate and fix action input using tool schemas
	if (resolvedArguments.action && tools) {
		resolvedArguments.action = validateAction(resolvedArguments.action, tools)
	}

	// fix incomplete formats
	if (!resolvedArguments.action) {
		console.log(chalk.yellow(`[normalizeResponse] #5: fixing tool_call`))
		resolvedArguments.action = { name: 'wait', input: { seconds: 1 } }
	}

	// pack back to standard format
	return {
		...response,
		choices: [
			{
				...choice,
				message: {
					...message,
					tool_calls: [
						{
							...(toolCall || {}),
							function: {
								...(toolCall?.function || {}),
								name: 'AgentOutput',
								arguments: JSON.stringify(resolvedArguments),
							},
						},
					],
				},
			},
		],
	}
}

/**
 * Validate action against tool schemas. Provides clear error messages
 * instead of letting the union schema produce unreadable errors.
 *
 * Also coerces primitive inputs for single-field tools:
 * e.g. `{"click_element_by_index": 2}` → `{"click_element_by_index": {"index": 2}}`
 */
function validateAction(action: any, tools: Map<string, PageAgentTool>): any {
	if (typeof action !== 'object' || action === null) return action

	const toolName = Object.keys(action)[0]
	if (!toolName) return action

	const tool = tools.get(toolName)
	if (!tool) {
		const available = Array.from(tools.keys()).join(', ')
		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			`Unknown action "${toolName}". Available: ${available}`
		)
	}

	let value = action[toolName]
	const schema = tool.inputSchema

	// coerce primitive input for single-field tools
	if (schema instanceof z.ZodObject && value !== null && typeof value !== 'object') {
		const requiredKey = Object.keys(schema.shape).find(
			(k) => !(schema.shape as Record<string, z.ZodType>)[k].safeParse(undefined).success
		)
		if (requiredKey) {
			console.log(
				chalk.yellow(`[normalizeResponse] coercing primitive action input for "${toolName}"`)
			)
			value = { [requiredKey]: value }
		}
	}

	const result = schema.safeParse(value)
	if (!result.success) {
		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			`Invalid input for action "${toolName}": ${z.prettifyError(result.error)}`
		)
	}

	return { [toolName]: result.data }
}

/**
 * Safely parse JSON, return original input if not json.
 */
function safeJsonParse(input: any): any {
	if (typeof input === 'string') {
		try {
			return JSON.parse(input.trim())
		} catch {
			return input
		}
	}
	return input
}

/**
 * Extract and parse JSON from a string.
 * - Treat content between the first `{` and the last `}` as JSON.
 * - Try to parse that content as JSON and return the parsed value (object/array/primitive) if successful, otherwise return null.
 */
function retrieveJsonFromString(str: string): any {
	try {
		const json = /({[\s\S]*})/.exec(str) ?? []
		if (json.length === 0) {
			return null
		}
		return JSON.parse(json[0]!)
	} catch {
		return null
	}
}

interface Choice {
	message?: {
		role?: 'assistant'
		content?: string
		tool_calls?: {
			id?: string
			type?: 'function'
			function?: {
				name?: string
				arguments?: string
			}
		}[]
	}
	index?: 0
	finish_reason?: 'tool_calls'
}
