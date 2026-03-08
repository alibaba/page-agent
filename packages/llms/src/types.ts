/**
 * Core types for LLM integration
 */
import type * as z from 'zod/v4'

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

/**
 * Chrome Built-in AI session interface.
 * Supports both old and new API shapes:
 * - New (2025+): self.LanguageModel.create() -> session with inputQuota/inputUsage
 * - Legacy (2024): self.ai.languageModel.create() -> session with maxTokens/tokensSoFar
 */
export interface ChromeAISession {
	prompt(text: string, options?: { signal?: AbortSignal }): Promise<string>
	promptStreaming(text: string, options?: { signal?: AbortSignal }): ReadableStream<string>
	destroy(): void
	// New API token properties
	readonly inputQuota?: number
	readonly inputUsage?: number
	// Legacy API token properties
	readonly maxTokens?: number
	readonly tokensSoFar?: number
	readonly tokensLeft?: number
	// Token counting methods
	measureInputUsage?: (text: string) => Promise<number>
	countPromptTokens?: (text: string) => Promise<number>
}

/**
 * Configuration for Chrome Built-in AI client
 */
export interface ChromeAIConfig {
	/** Temperature for generation */
	temperature?: number
	/** Top-K sampling parameter */
	topK?: number
	/** Enable response caching */
	enableCache?: boolean
	/** Cache TTL in milliseconds (default: 5 minutes) */
	cacheTTL?: number
	/** Maximum cache entries (default: 100) */
	maxCacheSize?: number
	/** Initial prompts for session context (Chrome AI specific) */
	initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[]
	/**
	 * Expected input languages for session creation (new API).
	 * Passed as expectedInputs: [{ type: 'text', languages: [...] }]
	 * @example ['en', 'zh']
	 */
	expectedInputLanguages?: string[]
	/**
	 * Expected output languages for session creation (new API).
	 * Passed as expectedOutputs: [{ type: 'text', languages: [...] }]
	 * @example ['en']
	 */
	expectedOutputLanguages?: string[]
}

/**
 * Provider type for the LLM router
 */
export type LLMProvider = 'openai' | 'chrome-ai'

/**
 * Routing strategy for the LLM router
 */
export type RoutingStrategy =
	| 'fallback' // Try providers in order, fall back on failure
	| 'prefer-local' // Prefer Chrome AI, fall back to OpenAI
	| 'prefer-remote' // Prefer OpenAI, fall back to Chrome AI
	| 'local-only' // Only use Chrome AI
	| 'remote-only' // Only use OpenAI (default, equivalent to current behavior)

/**
 * Configuration for the LLM Router
 */
export interface LLMRouterConfig {
	/** Strategy for choosing a provider */
	strategy?: RoutingStrategy
	/** OpenAI-compatible API configuration (for remote providers) */
	openai?: LLMConfig
	/** Chrome Built-in AI configuration (for local/on-device models) */
	chromeAI?: ChromeAIConfig
	/** Maximum retries per provider before falling back */
	maxRetries?: number
	/** Custom routing function for advanced use cases */
	customRouter?: (
		messages: Message[],
		tools: Record<string, Tool>,
		availableProviders: LLMProvider[]
	) => LLMProvider
}
