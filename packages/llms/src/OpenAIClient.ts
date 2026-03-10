/**
 * OpenAI Client implementation
 */
import * as z from 'zod/v4'

import { InvokeError, InvokeErrorType } from './errors'
import type { InvokeOptions, InvokeResult, LLMClient, LLMConfig, Message, Tool } from './types'
import { modelPatch, shouldUseResponsesApi, zodToOpenAITool } from './utils'

/**
 * Client for OpenAI compatible APIs
 */
export class OpenAIClient implements LLMClient {
	config: Required<LLMConfig>
	private fetch: typeof globalThis.fetch

	constructor(config: Required<LLMConfig>) {
		this.config = config
		this.fetch = config.customFetch
	}

	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		// 1. Convert tools to OpenAI format
		const openaiTools = Object.entries(tools).map(([name, t]) => zodToOpenAITool(name, t))
		const useResponsesApi = shouldUseResponsesApi(this.config.model)

		// Build request body
		const requestBody = useResponsesApi
			? this.buildResponsesRequestBody(messages, openaiTools, options)
			: this.buildChatCompletionsRequestBody(messages, openaiTools, options)

		// 2. Call API
		let response: Response
		try {
			response = await this.fetch(
				`${this.config.baseURL}/${useResponsesApi ? 'responses' : 'chat/completions'}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.config.apiKey}`,
					},
					body: JSON.stringify(requestBody),
					signal: abortSignal,
				}
			)
		} catch (error: unknown) {
			const isAbortError = (error as any)?.name === 'AbortError'
			const errorMessage = isAbortError ? 'Network request aborted' : 'Network request failed'
			if (!isAbortError) console.error(error)
			throw new InvokeError(InvokeErrorType.NETWORK_ERROR, errorMessage, error)
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

		// 4. Parse and validate response
		const data = useResponsesApi
			? this.normalizeResponsesApiResponse(await response.json())
			: await response.json()

		const choice = data.choices?.[0]
		if (!choice) {
			throw new InvokeError(InvokeErrorType.UNKNOWN, 'No choices in response', data)
		}

		// Check finish_reason
		switch (choice.finish_reason) {
			case 'tool_calls':
			case 'function_call': // gemini
			case 'stop': // some models use this even with tool calls
				break
			case 'length':
				throw new InvokeError(
					InvokeErrorType.CONTEXT_LENGTH,
					'Response truncated: max tokens reached',
					undefined,
					data
				)
			case 'content_filter':
				throw new InvokeError(
					InvokeErrorType.CONTENT_FILTER,
					'Content filtered by safety system',
					undefined,
					data
				)
			default:
				throw new InvokeError(
					InvokeErrorType.UNKNOWN,
					`Unexpected finish_reason: ${choice.finish_reason}`,
					undefined,
					data
				)
		}

		// Apply normalizeResponse if provided (for fixing format issues automatically)
		const normalizedData = options?.normalizeResponse ? options.normalizeResponse(data) : data
		const normalizedChoice = (normalizedData as any).choices?.[0]

		// Get tool name from response
		const toolCallName = normalizedChoice?.message?.tool_calls?.[0]?.function?.name
		if (!toolCallName) {
			throw new InvokeError(
				InvokeErrorType.NO_TOOL_CALL,
				'No tool call found in response',
				undefined,
				data
			)
		}

		const tool = tools[toolCallName]
		if (!tool) {
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				`Tool "${toolCallName}" not found in tools`,
				undefined,
				data
			)
		}

		// Extract and parse tool arguments
		const argString = normalizedChoice.message?.tool_calls?.[0]?.function?.arguments
		if (!argString) {
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
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
				InvokeErrorType.INVALID_TOOL_ARGS,
				'Failed to parse tool arguments as JSON',
				error,
				data
			)
		}

		// Validate with schema
		const validation = tool.inputSchema.safeParse(parsedArgs)
		if (!validation.success) {
			console.error(z.prettifyError(validation.error))
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				'Tool arguments validation failed',
				validation.error,
				data
			)
		}
		const toolInput = validation.data

		// 5. Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(toolInput)
		} catch (e) {
			throw new InvokeError(
				InvokeErrorType.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(e as Error).message}`,
				e,
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
			rawRequest: requestBody,
		}
	}

	private buildChatCompletionsRequestBody(
		messages: Message[],
		openaiTools: ReturnType<typeof zodToOpenAITool>[],
		options?: InvokeOptions
	): Record<string, unknown> {
		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			temperature: this.config.temperature,
			messages,
			tools: openaiTools,
			parallel_tool_calls: false,
			// Require tool call: specific tool if provided, otherwise any tool
			tool_choice: options?.toolChoiceName
				? { type: 'function', function: { name: options.toolChoiceName } }
				: 'required',
		}

		modelPatch(requestBody)
		return requestBody
	}

	private buildResponsesRequestBody(
		messages: Message[],
		openaiTools: ReturnType<typeof zodToOpenAITool>[],
		options?: InvokeOptions
	): Record<string, unknown> {
		const instructions = messages
			.filter((message) => message.role === 'system' && typeof message.content === 'string')
			.map((message) => message.content?.trim())
			.filter(Boolean)
			.join('\n\n')

		const input = messages
			.filter((message) => message.role !== 'system')
			.map((message) => this.toResponsesInputItem(message))
			.filter(Boolean)

		return {
			model: this.config.model,
			temperature: this.config.temperature,
			...(instructions ? { instructions } : {}),
			input,
			tools: openaiTools,
			tool_choice: options?.toolChoiceName
				? { type: 'function', function: { name: options.toolChoiceName } }
				: 'required',
		}
	}

	private toResponsesInputItem(message: Message): Record<string, unknown> | null {
		if (message.role === 'tool') {
			if (!message.tool_call_id || typeof message.content !== 'string') return null
			return {
				type: 'function_call_output',
				call_id: message.tool_call_id,
				output: message.content,
			}
		}

		if (typeof message.content !== 'string' || !message.content.trim()) return null

		return {
			type: 'message',
			role: message.role,
			content: message.content,
		}
	}

	private normalizeResponsesApiResponse(responseData: any) {
		const output: any[] = Array.isArray(responseData?.output) ? responseData.output : []
		const functionCall = output.find((item: any) => item?.type === 'function_call')
		const assistantMessage = output.find(
			(item: any) => item?.type === 'message' && item?.role === 'assistant'
		)
		const content = Array.isArray(assistantMessage?.content)
			? assistantMessage.content
					.filter((part: any) => part?.type === 'output_text' && typeof part?.text === 'string')
					.map((part: any) => part.text)
					.join('')
			: null

		return {
			...responseData,
			choices: [
				{
					finish_reason: functionCall ? 'tool_calls' : 'stop',
					message: {
						role: 'assistant',
						content,
						tool_calls: functionCall
							? [
									{
										id: functionCall.call_id || functionCall.id || 'call_0',
										type: 'function',
										function: {
											name: functionCall.name,
											arguments: functionCall.arguments,
										},
									},
								]
							: undefined,
					},
				},
			],
			usage: {
				prompt_tokens: responseData?.usage?.input_tokens ?? 0,
				completion_tokens: responseData?.usage?.output_tokens ?? 0,
				total_tokens: responseData?.usage?.total_tokens ?? 0,
			},
		}
	}
}
