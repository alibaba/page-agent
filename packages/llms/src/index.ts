import { ChromeBuiltInAIClient } from './ChromeBuiltInAIClient'
import { LLMRouter } from './LLMRouter'
import { OpenAIClient } from './OpenAIClient'
import { WebMCPClient } from './WebMCPClient'
import type {
	WebMCPClientConfig,
	WebMCPResourceDefinition,
	WebMCPServer as WebMCPServerInfo,
	WebMCPToolDefinition,
} from './WebMCPClient'
import { WebMCPServer } from './WebMCPServer'
import type { WebMCPResourceProvider, WebMCPServerConfig } from './WebMCPServer'
import { DEFAULT_TEMPERATURE, LLM_MAX_RETRIES } from './constants'
import { InvokeError, InvokeErrorType } from './errors'
import type {
	ChromeAIConfig,
	ChromeAISession,
	InvokeOptions,
	InvokeResult,
	LLMClient,
	LLMConfig,
	LLMProvider,
	LLMRouterConfig,
	Message,
	RoutingStrategy,
	Tool,
} from './types'

export { ChromeBuiltInAIClient }
export { InvokeError, InvokeErrorType }
export { LLMRouter }
export { WebMCPClient }
export { WebMCPServer }
export type {
	ChromeAIConfig,
	ChromeAISession,
	InvokeOptions,
	InvokeResult,
	LLMClient,
	LLMConfig,
	LLMProvider,
	LLMRouterConfig,
	Message,
	RoutingStrategy,
	Tool,
	WebMCPClientConfig,
	WebMCPResourceDefinition,
	WebMCPResourceProvider,
	WebMCPServerConfig,
	WebMCPServerInfo,
	WebMCPToolDefinition,
}

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	// Runtime validation as defensive programming (types already guarantee these)
	if (!config.baseURL || !config.apiKey || !config.model) {
		throw new Error(
			'[PageAgent] LLM configuration required. Please provide: baseURL, apiKey, model. ' +
				'See: https://alibaba.github.io/page-agent/docs/features/models'
		)
	}

	return {
		baseURL: config.baseURL,
		apiKey: config.apiKey,
		model: config.model,
		temperature: config.temperature ?? DEFAULT_TEMPERATURE,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
		customFetch: (config.customFetch ?? fetch).bind(globalThis), // fetch will be illegal unless bound
	}
}

export class LLM extends EventTarget {
	config: Required<LLMConfig>
	client: LLMClient

	constructor(config: LLMConfig) {
		super()
		this.config = parseLLMConfig(config)

		// Default to OpenAI client
		this.client = new OpenAIClient(this.config)
	}

	/**
	 * Create an LLM instance with routing support.
	 * Enables multiple providers (OpenAI, Chrome AI) with fallback strategies.
	 *
	 * @example
	 * ```ts
	 * const llm = LLM.withRouter({
	 *   strategy: 'prefer-local',
	 *   openai: { baseURL: '...', apiKey: '...', model: 'gpt-4' },
	 *   chromeAI: { temperature: 0.7 },
	 * })
	 * ```
	 */
	static withRouter(routerConfig: LLMRouterConfig): LLM {
		// Create a minimal LLMConfig for the base LLM class
		const openaiConfig = routerConfig.openai || {
			baseURL: 'chrome-ai://local',
			apiKey: 'local',
			model: 'chrome-built-in',
		}

		const llm = new LLM(openaiConfig)
		// Replace the default OpenAI client with the router
		llm.client = new LLMRouter(routerConfig)
		return llm
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
		return await withRetry(
			async () => {
				// in case user aborted before invoking
				if (abortSignal.aborted) throw new Error('AbortError')

				const result = await this.client.invoke(messages, tools, abortSignal, options)

				return result
			},
			// retry settings
			{
				maxRetries: this.config.maxRetries,
				onRetry: (attempt: number) => {
					this.dispatchEvent(
						new CustomEvent('retry', { detail: { attempt, maxAttempts: this.config.maxRetries } })
					)
				},
				onError: (error: Error) => {
					this.dispatchEvent(new CustomEvent('error', { detail: { error } }))
				},
			}
		)
	}
}

async function withRetry<T>(
	fn: () => Promise<T>,
	settings: {
		maxRetries: number
		onRetry: (attempt: number) => void
		onError: (error: Error) => void
	}
): Promise<T> {
	let attempt = 0
	let lastError: Error | null = null
	while (attempt <= settings.maxRetries) {
		if (attempt > 0) {
			settings.onRetry(attempt)
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		try {
			return await fn()
		} catch (error: unknown) {
			// do not retry if aborted by user
			if ((error as any)?.rawError?.name === 'AbortError') throw error

			console.error(error)
			settings.onError(error as Error)

			// do not retry if error is not retryable (InvokeError)
			if (error instanceof InvokeError && !error.retryable) throw error

			lastError = error as Error
			attempt++

			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	throw lastError!
}
