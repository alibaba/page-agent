import { OpenAIClient } from './OpenAIClient'
import { InvokeError, InvokeErrorTypes } from './errors'
import type {
	InvokeOptions,
	InvokeResult,
	LLMClient,
	LLMConfig,
	Message,
	ResolvedLLMConfig,
	Tool,
} from './types'

export { InvokeError, InvokeErrorTypes }
export type { InvokeOptions, InvokeResult, LLMClient, LLMConfig, Message, Tool }

/**
 * LLM module
 */
export class LLM extends EventTarget {
	config: ResolvedLLMConfig
	client: LLMClient

	constructor(config: LLMConfig) {
		super()
		this.config = parseLLMConfig(config)

		// Default to OpenAI client
		this.client = new OpenAIClient(this.config)
	}

	/**
	 * - call llm api *once*
	 * - invoke tool call *once*
	 * - return the result of the tool
	 */
	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		return await withRetry(async () => this.client.invoke(messages, tools, abortSignal, options), {
			maxRetries: this.config.maxRetries,
			onRetry: (attempt, lastError) => {
				this.dispatchEvent(
					new CustomEvent('retry', {
						detail: { attempt, maxAttempts: this.config.maxRetries, lastError },
					})
				)
			},
		})
	}
}

/**
 * Retry a function until it succeeds or reaches the maximum number of retries.
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	settings: {
		maxRetries: number
		onRetry: (attempt: number, lastError: Error) => void
	}
): Promise<T> {
	let attempt = 0
	while (true) {
		try {
			return await fn()
		} catch (error: unknown) {
			if ((error as any)?.name === 'AbortError') throw error
			if (error instanceof InvokeError && !error.retryable) throw error
			attempt++
			if (attempt > settings.maxRetries) throw error

			console.debug('[LLM] retryable failure, will retry:', error)
			settings.onRetry(attempt, error as Error)

			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}
}

export function parseLLMConfig(config: LLMConfig): ResolvedLLMConfig {
	// Runtime validation as defensive programming (types already guarantee these)
	if (!config.baseURL || !config.model) {
		throw new Error(
			'[PageAgent] LLM configuration required. Please provide: baseURL, model. ' +
				'See: https://alibaba.github.io/page-agent/docs/features/models'
		)
	}

	if (config.temperature !== undefined) {
		console.warn(
			'[PageAgent] LLMConfig.temperature is deprecated and will be removed in a future version. ' +
				'Use transformRequestBody to set it only for models you have verified accept it.'
		)
	}

	return {
		baseURL: config.baseURL,
		model: config.model,
		apiKey: config.apiKey || '',
		temperature: config.temperature,
		maxRetries: config.maxRetries ?? 2,
		transformRequestBody: config.transformRequestBody ?? ((requestBody) => requestBody),
		disableNamedToolChoice: config.disableNamedToolChoice ?? false,
		customFetch: (config.customFetch ?? fetch).bind(globalThis), // fetch will be illegal unless bound
	}
}
