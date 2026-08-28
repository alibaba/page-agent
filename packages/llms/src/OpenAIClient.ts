/**
 * OpenAI Client implementation
 */
import * as z from 'zod/v4'

import { InvokeError, InvokeErrorTypes } from './errors'
import type {
	InvokeOptions,
	InvokeResult,
	LLMClient,
	Message,
	ResolvedLLMConfig,
	Tool,
} from './types'
import { getProvider, modelPatch, zodToOpenAITool } from './utils'

/**
 * Client for OpenAI compatible APIs
 */
export class OpenAIClient implements LLMClient {
	config: ResolvedLLMConfig
	private fetch: typeof globalThis.fetch

	constructor(config: ResolvedLLMConfig) {
		this.config = config
		this.fetch = config.customFetch
	}

	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		abortSignal?.throwIfAborted()

		// 1. Convert tools to OpenAI format
		const openaiTools = Object.entries(tools).map(([name, t]) => zodToOpenAITool(name, t))

		// Build request body

		let toolChoice: unknown = 'required'
		if (options?.toolChoiceName && !this.config.disableNamedToolChoice) {
			toolChoice = { type: 'function', function: { name: options.toolChoiceName } }
		}

		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			messages,
			tools: openaiTools,
			parallel_tool_calls: false,
			tool_choice: toolChoice,
		}
		// Only sent if the caller explicitly set it. Most new models throw if this is set.
		if (this.config.temperature !== undefined) {
			requestBody.temperature = this.config.temperature
		}

		modelPatch(requestBody, this.config.baseURL)

		let transformedBody: Record<string, unknown> | undefined
		try {
			transformedBody = this.config.transformRequestBody(requestBody)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorTypes.CONFIG_ERROR,
				`transformRequestBody failed: ${(error as Error).message}`,
				error
			)
		}
		const finalRequestBody = transformedBody ?? requestBody

		// 2. Call API
		let response: Response
		try {
			response = await this.fetch(`${this.config.baseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
					// Anthropic's API rejects browser-origin requests unless this is set.
					// It forces an explicit opt-in, since calling it directly from a browser
					// exposes the API key to anyone reading the page's network traffic.
					...(getProvider(this.config.baseURL) === 'anthropic' && {
						'anthropic-dangerous-direct-browser-access': 'true',
					}),
				},
				body: JSON.stringify(finalRequestBody),
				signal: abortSignal,
			})
		} catch (error: unknown) {
			if ((error as any)?.name === 'AbortError') throw error
			console.error(error)
			throw new InvokeError(InvokeErrorTypes.NETWORK_ERROR, 'Network request failed', error)
		}

		// 3. Handle HTTP errors
		if (!response.ok) {
			let errorData: any
			try {
				errorData = await response.json()
			} catch (error) {
				if ((error as any)?.name === 'AbortError') throw error
			}
			const errorMessage = errorData?.error?.message || response.statusText

			if (response.status === 401 || response.status === 403) {
				throw new InvokeError(
					InvokeErrorTypes.AUTH_ERROR,
					`Authentication failed: ${errorMessage}`,
					errorData
				)
			}
			if (response.status === 429) {
				throw new InvokeError(
					InvokeErrorTypes.RATE_LIMIT,
					`Rate limit exceeded: ${errorMessage}`,
					errorData
				)
			}
			if (response.status >= 500) {
				throw new InvokeError(
					InvokeErrorTypes.SERVER_ERROR,
					`Server error: ${errorMessage}`,
					errorData
				)
			}
			// Other 4xx: malformed/unsupported request (e.g. bad params, unsupported content type).
			// Deterministic — retrying the identical request will not succeed.
			if (response.status >= 400) {
				throw new InvokeError(
					InvokeErrorTypes.CLIENT_ERROR,
					`HTTP ${response.status}: ${errorMessage}`,
					errorData
				)
			}
			throw new InvokeError(
				InvokeErrorTypes.UNKNOWN,
				`HTTP ${response.status}: ${errorMessage}`,
				errorData
			)
		}

		// 4. Parse and validate response
		let data: any
		try {
			data = await response.json()
		} catch (error) {
			if ((error as any)?.name === 'AbortError') throw error
			throw new InvokeError(
				InvokeErrorTypes.INVALID_RESPONSE,
				'Response body is not valid JSON',
				error
			)
		}

		const choice = data.choices?.[0]
		if (!choice) {
			throw new InvokeError(InvokeErrorTypes.INVALID_SCHEMA, 'No choices in response', data)
		}

		// Check finish_reason
		switch (choice.finish_reason) {
			case 'tool_calls':
			case 'function_call': // gemini
			case 'stop': // some models use this even with tool calls
				break
			case 'length':
				throw new InvokeError(
					InvokeErrorTypes.CONTEXT_LENGTH,
					'Response truncated: max tokens reached',
					undefined,
					data
				)
			case 'content_filter':
				throw new InvokeError(
					InvokeErrorTypes.CONTENT_FILTER,
					'Content filtered by safety system',
					undefined,
					data
				)
			default:
				throw new InvokeError(
					InvokeErrorTypes.INVALID_SCHEMA,
					`Unexpected finish_reason: ${choice.finish_reason}`,
					undefined,
					data
				)
		}

		// Apply normalizeResponse if provided (for fixing format issues automatically).
		// Wrapped because normalizeResponse repairs whatever malformed shape the model
		// returned — an unanticipated shape can throw a native error (e.g. writing a
		// property onto a string) which must still be classified as a retryable
		// InvokeError, not escape uncaught and abort the whole run.
		let normalizedData: any = data
		if (options?.normalizeResponse) {
			try {
				normalizedData = options.normalizeResponse(data)
			} catch (error) {
				if (error instanceof InvokeError) throw error
				throw new InvokeError(
					InvokeErrorTypes.INVALID_TOOL_ARGS,
					`Failed to normalize model response: ${error instanceof Error ? error.message : String(error)}`,
					error,
					data
				)
			}
		}
		const normalizedChoice = (normalizedData as any).choices?.[0]

		// Get tool name from response
		const toolCallName = normalizedChoice?.message?.tool_calls?.[0]?.function?.name
		if (!toolCallName) {
			throw new InvokeError(
				InvokeErrorTypes.NO_TOOL_CALL,
				'No tool call found in response',
				undefined,
				data
			)
		}

		const tool = tools[toolCallName]
		if (!tool) {
			throw new InvokeError(
				InvokeErrorTypes.UNKNOWN,
				`Tool "${toolCallName}" not found in tools`,
				undefined,
				data
			)
		}

		// Extract and parse tool arguments
		const argString = normalizedChoice.message?.tool_calls?.[0]?.function?.arguments
		if (!argString) {
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				'No tool call arguments found',
				undefined,
				data
			)
		}

		let parsedArgs: unknown
		try {
			parsedArgs = JSON.parse(argString)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				'Failed to parse tool arguments as JSON',
				error,
				data
			)
		}

		// Validate with schema
		const validation = tool.inputSchema.safeParse(parsedArgs)
		if (!validation.success) {
			const details = z.prettifyError(validation.error)
			console.error(details)
			throw new InvokeError(
				InvokeErrorTypes.INVALID_TOOL_ARGS,
				`Tool arguments validation failed for "${toolCallName}": ${details}`,
				validation.error,
				data
			)
		}
		const toolInput = validation.data

		// 5. Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(toolInput)
		} catch (error: unknown) {
			if ((error as any)?.name === 'AbortError') throw error
			throw new InvokeError(
				InvokeErrorTypes.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(error as Error)?.message}`,
				error,
				data
			)
		}

		// Return result
		return {
			toolCall: {
				name: toolCallName,
				args: toolInput,
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
			rawRequest: finalRequestBody,
		}
	}
}
