/**
 * OpenAI Client implementation
 */
import type { MacroToolInput } from '../PageAgent'
import { InvokeError, InvokeErrorType } from './errors'
import type { InvokeResult, LLMClient, Message, OpenAIClientConfig, Tool } from './types'
import { lenientParseMacroToolCall, modelPatch, zodToOpenAITool } from './utils'

export class OpenAIClient implements LLMClient {
	config: OpenAIClientConfig

	constructor(config: OpenAIClientConfig) {
		this.config = config
	}

	async invoke(
		messages: Message[],
		tools: { AgentOutput: Tool<MacroToolInput> },
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

		// parse response

		const data = await response.json()
		const tool = tools.AgentOutput
		const macroToolInput = lenientParseMacroToolCall(data, tool.inputSchema as any)

		// Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(macroToolInput)
		} catch (e) {
			throw new InvokeError(
				InvokeErrorType.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(e as Error).message}`,
				e
			)
		}

		// Return result (including cache tokens)
		return {
			toolCall: {
				// id: toolCall.id,
				name: 'AgentOutput',
				args: macroToolInput,
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
