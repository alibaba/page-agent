/**
 * OpenAI Client implementation
 */
import { InvokeError, InvokeErrorType } from './errors'
import type { InvokeResult, LLMClient, Message, OpenAIClientConfig, Tool } from './types'
import { modelPatch, zodToOpenAITool } from './utils'

export class OpenAIClient implements LLMClient {
	config: OpenAIClientConfig

	constructor(config: OpenAIClientConfig) {
		this.config = config
	}

	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal
	): Promise<InvokeResult> {
		// 1. Convert tools to OpenAI format
		const openaiTools = Object.entries(tools).map(([name, tool]) => zodToOpenAITool(name, tool))

		// 2. Call API
		let response: Response
		try {
			response = await fetch(`${this.config.baseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: JSON.stringify(
					modelPatch({
						model: this.config.model,
						temperature: this.config.temperature,
						max_tokens: this.config.maxTokens,
						messages,

						tools: openaiTools,
						// tool_choice: 'required',
						tool_choice: { type: 'function', function: { name: 'AgentOutput' } },

						// model specific params

						// reasoning_effort: 'minimal',
						// verbosity: 'low',
						parallel_tool_calls: false,
					})
				),
				signal: abortSignal,
			})
		} catch (error: unknown) {
			// Network error
			throw new InvokeError(InvokeErrorType.NETWORK_ERROR, 'Network request failed', error)
		}

		// 3. Handle HTTP errors
		if (!response.ok) {
			const errorData = await response.json().catch()
			const errorMessage =
				(errorData as { error?: { message?: string } }).error?.message || response.statusText

			if (response.status === 401 || response.status === 403) {
				throw new InvokeError(
					InvokeErrorType.AUTH_ERROR,
					`Authentication failed: ${errorMessage}`,
					errorData
				)
			}
			if (response.status === 429) {
				throw new InvokeError(
					InvokeErrorType.RATE_LIMIT,
					`Rate limit exceeded: ${errorMessage}`,
					errorData
				)
			}
			if (response.status >= 500) {
				throw new InvokeError(
					InvokeErrorType.SERVER_ERROR,
					`Server error: ${errorMessage}`,
					errorData
				)
			}
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				`HTTP ${response.status}: ${errorMessage}`,
				errorData
			)
		}

		const data = await response.json()

		// 4. Check finish_reason
		const choice = data.choices?.[0]
		if (!choice) {
			throw new InvokeError(InvokeErrorType.UNKNOWN, 'No choices in response', data)
		}

		switch (choice.finish_reason) {
			case 'tool_calls':
				// ✅ Normal
				break
			case 'length':
				// ⚠️ Token limit reached
				throw new InvokeError(
					InvokeErrorType.CONTEXT_LENGTH,
					'Response truncated: max tokens reached',
					data
				)
			case 'content_filter':
				// ❌ Content filtered
				throw new InvokeError(
					InvokeErrorType.CONTENT_FILTER,
					'Content filtered by safety system',
					data
				)
			case 'stop':
				// ❌ Did not call tool (we require tool call)
				throw new InvokeError(InvokeErrorType.NO_TOOL_CALL, 'Model did not call any tool', data)
			default:
				throw new InvokeError(
					InvokeErrorType.UNKNOWN,
					`Unexpected finish_reason: ${choice.finish_reason}`,
					data
				)
		}

		// 5. Parse tool call
		const toolCall = choice.message?.tool_calls?.[0]
		if (!toolCall) {
			throw new InvokeError(InvokeErrorType.NO_TOOL_CALL, 'No tool call found in response', data)
		}

		const toolName = toolCall.function.name
		const tool = tools[toolName]
		if (!tool) {
			throw new InvokeError(InvokeErrorType.UNKNOWN, `Tool ${toolName} not found`, data)
		}

		// 6. Parse and validate arguments
		let toolArgs: unknown
		try {
			toolArgs = JSON.parse(toolCall.function.arguments)
		} catch (e) {
			throw new InvokeError(InvokeErrorType.INVALID_TOOL_ARGS, 'Invalid JSON in tool arguments', e)
		}

		// Validate against zod schema
		const validation = tool.inputSchema.safeParse(toolArgs)
		if (!validation.success) {
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				`Tool arguments validation failed: ${validation.error.message}`,
				validation.error
			)
		}

		// 7. Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(validation.data)
		} catch (e) {
			throw new InvokeError(
				InvokeErrorType.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(e as Error).message}`,
				e
			)
		}

		// 8. Return result (including cache tokens)
		return {
			toolCall: {
				// id: toolCall.id,
				name: toolName,
				args: validation.data as Record<string, unknown>,
			},
			toolResult,
			usage: {
				promptTokens: data.usage?.prompt_tokens ?? 0,
				completionTokens: data.usage?.completion_tokens ?? 0,
				totalTokens: data.usage?.total_tokens ?? 0,
				cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
				reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
			},
			rawResponse: data,
		}
	}
}
