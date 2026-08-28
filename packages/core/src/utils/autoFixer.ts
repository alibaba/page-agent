import { InvokeError, InvokeErrorTypes } from '@eb-agent/llms'
import chalk from 'chalk'
import { jsonrepair } from 'jsonrepair'
import * as z from 'zod/v4'

import type { EBAgentTool } from '../tools'

const log = console.log.bind(console, chalk.yellow('[autoFixer]'))

/**
 * Detect `done` text that states an unresolved question or an unexecuted
 * intention ("would you like X or Y?", "let me search...", "I'm unable to
 * proceed without...") instead of an actual completed result or a genuine
 * dead end. Deliberately broad/over-inclusive: a false positive here just
 * means we pause for confirmation instead of ending the task, which is
 * always recoverable — a false negative reproduces the "done ends the task,
 * next message starts an unrelated new task" bug.
 */
export function looksNonTerminal(text: string | undefined): boolean {
	if (!text) return false
	const trimmed = text.trim()
	if (!trimmed) return false

	return /\?\s*["')\]]*$|\b(let me\b|i will\b|i['’]ll\b|i need to\b|i should now\b|i['’]m going to\b|next[,]? i\b|unable to proceed\b|i can['’]t (proceed|continue)\b)/i.test(
		trimmed
	)
}

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
export function normalizeResponse(response: any, tools?: Map<string, EBAgentTool>): any {
	let resolvedArguments: any

	const choice = (response as { choices?: Choice[] }).choices?.[0]
	if (!choice) throw new Error('No choices in response')

	const message = choice.message
	if (!message) throw new Error('No message in choice')

	const toolCall = message.tool_calls?.[0]

	// fix level and location of arguments

	if (toolCall?.function?.arguments) {
		resolvedArguments = safeJsonParse(toolCall.function.arguments)

		// case: sometimes the model calls the leaf tool directly instead of wrapping in AgentOutput
		if (toolCall.function.name && toolCall.function.name !== 'AgentOutput') {
			log(`#1: fixing tool_call`)
			resolvedArguments = { action: { [toolCall.function.name]: safeJsonParse(resolvedArguments) } }
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
					log(`#2: fixing tool_call`)
					resolvedArguments = safeJsonParse(resolvedArguments.arguments)
				}

				// case: sometimes even 2-levels of wrapping
				if (resolvedArguments?.type === 'function') {
					log(`#3: fixing tool_call`)
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
					log(`#4: fixing tool_call`)
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

	// case: arguments never became valid JSON (e.g. model emitted an unquoted
	// string value, breaking JSON syntax). `safeJsonParse` falls back to
	// returning the original string rather than throwing, so without this
	// check `resolvedArguments` stays a string primitive and every later
	// `resolvedArguments.action = ...` write below throws an opaque native
	// TypeError ("Cannot create property 'action' on string ..."). Fail
	// loudly and retryably instead so the caller's retry loop can re-sample
	// the model for a well-formed response.
	if (typeof resolvedArguments !== 'object' || resolvedArguments === null) {
		// jsonrepair (and the {...} extraction fallback) couldn't recover this one — log the
		// exact offending text so it's visible in the console without digging through the
		// raw response payload, in case this repair still doesn't cover every case.
		console.error('[autoFixer] unrecoverable malformed model response:', resolvedArguments)
		throw new InvokeError(
			InvokeErrorTypes.INVALID_TOOL_ARGS,
			'Model response is not valid JSON (likely an unescaped/unquoted string value)',
			undefined,
			response
		)
	}

	if (resolvedArguments.action) {
		resolvedArguments.action = safeJsonParse(resolvedArguments.action)
	}

	// case: model re-nests the whole macro object one level too deep inside `action`
	// (e.g. { action: { evaluation_previous_goal, memory, next_goal, action: {...} } })
	// instead of just { toolName: toolInput }. Unwrap until we hit the real action,
	// promoting any reflection fields only set at the nested level.
	for (let depth = 0; depth < 3; depth++) {
		const nested = resolvedArguments.action
		if (!nested || typeof nested !== 'object' || !nested.action) break

		log(`#6: fixing tool_call (unwrapping re-nested macro object, depth ${depth + 1})`)
		resolvedArguments.evaluation_previous_goal =
			resolvedArguments.evaluation_previous_goal ?? nested.evaluation_previous_goal
		resolvedArguments.memory = resolvedArguments.memory ?? nested.memory
		resolvedArguments.next_goal = resolvedArguments.next_goal ?? nested.next_goal
		resolvedArguments.action = safeJsonParse(nested.action)
	}

	// validate and fix action input using tool schemas
	if (resolvedArguments.action && tools) {
		resolvedArguments.action = validateAction(resolvedArguments.action, tools)
	}

	// fix incomplete formats
	if (!resolvedArguments.action) {
		log(`#5: fixing tool_call`)
		resolvedArguments.action = { wait: { seconds: 1 } }
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
function validateAction(action: any, tools: Map<string, EBAgentTool>): any {
	if (typeof action !== 'object' || action === null) return action

	const toolName = Object.keys(action)[0]
	if (!toolName) return action

	const tool = tools.get(toolName)
	if (!tool) {
		const available = Array.from(tools.keys()).join(', ')
		throw new InvokeError(
			InvokeErrorTypes.INVALID_TOOL_ARGS,
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
			log(`coercing primitive action input for "${toolName}"`)
			value = { [requiredKey]: value }
		}
	}

	const result = schema.safeParse(value)
	if (!result.success) {
		throw new InvokeError(
			InvokeErrorTypes.INVALID_TOOL_ARGS,
			`Invalid input for action "${toolName}": ${z.prettifyError(result.error)}`
		)
	}

	return { [toolName]: result.data }
}

/**
 * Safely parse JSON, return original input if not json.
 *
 * Smaller/local models frequently emit near-JSON (missing quotes around a
 * string value, trailing commas, etc.) instead of retrying into the same
 * mistake — see the bug this guards against in `normalizeResponse` above.
 * `jsonrepair` fixes these common near-misses; genuinely non-JSON input
 * either comes back as a JSON string literal (safe: callers type-check for
 * an object) or throws, in which case we fall back to the original input
 * exactly as before.
 */
function safeJsonParse(input: any): any {
	if (typeof input === 'string') {
		const trimmed = input.trim()
		try {
			return JSON.parse(trimmed)
		} catch {
			// The model wrapped the intended JSON in prose/code fences (```json ... ```
			// or leading/trailing commentary). Try repairing just the extracted {...}
			// span FIRST when there's surrounding text: jsonrepair treats newline-
			// separated "prose, then JSON, then stray token" input as multiple loose
			// values and repairs it into a wrapping array (silently discarding the
			// object shape we actually want), so repairing the raw string as-is would
			// "succeed" with the wrong shape instead of failing loudly.
			const extracted = /({[\s\S]*})/.exec(trimmed)?.[1]
			if (extracted && extracted !== trimmed) {
				try {
					const repaired = jsonrepair(extracted)
					log('repaired malformed JSON from model response (after extracting {...} span)')
					return JSON.parse(repaired)
				} catch {
					// fall through to repairing the whole string
				}
			}

			// repair near-JSON as-is (missing quotes, trailing commas, etc.)
			try {
				const repaired = jsonrepair(trimmed)
				log('repaired malformed JSON from model response')
				return JSON.parse(repaired)
			} catch {
				return input
			}
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
