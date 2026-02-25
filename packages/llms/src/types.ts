/**
 * Core types for LLM integration
 */
import type * as z from 'zod'

/**
 * Message format - OpenAI standard (industry standard)
 */
export interface Message {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content?: string | null
	tool_calls?: {
		id: string
		type: 'function'
		function: {
			name: string
			arguments: string // JSON string
		}
	}[]
	tool_call_id?: string
	name?: string
}

/**
 * Tool definition - uses Zod schema (LLM-agnostic)
 * Supports generics for type-safe parameters and return values
 */
export interface Tool<TParams = any, TResult = any> {
	// name: string
	description?: string
	inputSchema: z.ZodType<TParams>
	execute: (args: TParams) => Promise<TResult>
}

/**
 * Invoke options for LLM call
 */
export interface InvokeOptions {
	/**
	 * Force LLM to call a specific tool by name.
	 * If provided: tool_choice = { type: 'function', function: { name: toolChoiceName } }
	 * If not provided: tool_choice = 'required' (must call some tool, but model chooses which)
	 */
	toolChoiceName?: string
	/**
	 * Response normalization function.
	 * Called before parsing the response.
	 * Used to fix various response format errors from the model.
	 */
	normalizeResponse?: (response: any) => any
}

/**
 * LLM Client interface
 * Note: Does not use generics because each tool in the tools array has different types
 */
export interface LLMClient {
	invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult>
}

/**
 * Invoke result (strict typing, supports generics)
 */
export interface InvokeResult<TResult = unknown> {
	toolCall: {
		// id?: string // OpenAI's tool_call_id
		name: string
		args: any
	}
	toolResult: TResult // Supports generics, but defaults to unknown
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
		cachedTokens?: number // Prompt cache hits
		reasoningTokens?: number // OpenAI o1 series reasoning tokens
	}
	rawResponse?: unknown // Raw response for debugging
	rawRequest?: unknown // Raw request for debugging
}

/**
 * LLM configuration
 */
export interface LLMConfig {
	baseURL: string
	apiKey: string
	model: string

	temperature?: number
	maxRetries?: number

	/**
	 * Custom fetch function for LLM API requests.
	 * Use this to customize headers, credentials, proxy, etc.
	 * The response should follow OpenAI API format.
	 */
	customFetch?: typeof globalThis.fetch
}
