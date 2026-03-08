/**
 * LLM Router - Routes requests to appropriate LLM providers
 *
 * Supports multiple providers (OpenAI-compatible APIs and Chrome Built-in AI)
 * with configurable routing strategies including fallback, local-first,
 * and custom routing logic.
 */
import chalk from 'chalk'

import { ChromeBuiltInAIClient } from './ChromeBuiltInAIClient'
import { OpenAIClient } from './OpenAIClient'
import { InvokeError, InvokeErrorType } from './errors'
import type {
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

const debug = console.debug.bind(console, chalk.gray('[LLMRouter]'))

/**
 * LLM Router that manages multiple LLM providers and routes requests
 * based on configurable strategies.
 *
 * @example
 * ```ts
 * const router = new LLMRouter({
 *   strategy: 'prefer-local',
 *   openai: { baseURL: '...', apiKey: '...', model: 'gpt-4' },
 *   chromeAI: { temperature: 0.7 },
 * })
 * ```
 */
export class LLMRouter implements LLMClient {
	private clients = new Map<LLMProvider, LLMClient>()
	private config: LLMRouterConfig
	private strategy: RoutingStrategy
	private availableProviders: LLMProvider[] = []

	constructor(config: LLMRouterConfig) {
		this.config = config
		this.strategy = config.strategy || 'remote-only'

		// Initialize OpenAI client if configured
		if (config.openai) {
			const openaiConfig: Required<LLMConfig> = {
				baseURL: config.openai.baseURL,
				apiKey: config.openai.apiKey,
				model: config.openai.model,
				temperature: config.openai.temperature ?? 0.7,
				maxRetries: config.openai.maxRetries ?? 2,
				customFetch: (config.openai.customFetch ?? fetch).bind(globalThis),
			}
			this.clients.set('openai', new OpenAIClient(openaiConfig))
			this.availableProviders.push('openai')
		}

		// Initialize Chrome AI client if configured
		if (config.chromeAI && this.strategy !== 'remote-only') {
			this.clients.set('chrome-ai', new ChromeBuiltInAIClient(config.chromeAI))
			this.availableProviders.push('chrome-ai')
		}

		// Auto-detect Chrome AI availability for strategies that use it
		if (
			!this.clients.has('chrome-ai') &&
			(this.strategy === 'prefer-local' ||
				this.strategy === 'local-only' ||
				this.strategy === 'fallback')
		) {
			// Lazy initialization - will be set up on first invoke if available
			this.availableProviders.push('chrome-ai')
		}

		debug(
			`Initialized with strategy: ${this.strategy}, providers: ${this.availableProviders.join(', ')}`
		)
	}

	/**
	 * Get the ordered list of providers to try based on the routing strategy
	 */
	private getProviderOrder(messages: Message[], tools: Record<string, Tool>): LLMProvider[] {
		// Custom router takes precedence
		if (this.config.customRouter) {
			const chosen = this.config.customRouter(messages, tools, this.availableProviders)
			// Put chosen first, then others as fallback
			const others = this.availableProviders.filter((p) => p !== chosen)
			return [chosen, ...others]
		}

		switch (this.strategy) {
			case 'local-only':
				return ['chrome-ai']

			case 'remote-only':
				return ['openai']

			case 'prefer-local':
				return ['chrome-ai', 'openai']

			case 'prefer-remote':
				return ['openai', 'chrome-ai']

			case 'fallback':
				// Default fallback order: try remote first (more capable), then local
				return ['openai', 'chrome-ai']

			default:
				return ['openai']
		}
	}

	/**
	 * Ensure Chrome AI client is initialized (lazy initialization)
	 */
	private async ensureChromeAI(): Promise<boolean> {
		if (this.clients.has('chrome-ai')) return true

		const isAvailable = await ChromeBuiltInAIClient.isAvailable()
		if (!isAvailable) {
			debug('Chrome Built-in AI is not available')
			return false
		}

		this.clients.set('chrome-ai', new ChromeBuiltInAIClient(this.config.chromeAI || {}))
		debug('Chrome Built-in AI client initialized (lazy)')
		return true
	}

	/**
	 * Invoke the LLM with routing logic
	 */
	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		const providerOrder = this.getProviderOrder(messages, tools)

		let lastError: Error | null = null

		for (const provider of providerOrder) {
			// Lazy-init Chrome AI if needed
			if (provider === 'chrome-ai') {
				const available = await this.ensureChromeAI()
				if (!available) {
					debug(`Skipping ${provider}: not available`)
					continue
				}
			}

			const client = this.clients.get(provider)
			if (!client) {
				debug(`Skipping ${provider}: no client configured`)
				continue
			}

			try {
				debug(`Trying provider: ${provider}`)
				const result = await client.invoke(messages, tools, abortSignal, options)
				debug(`Provider ${provider} succeeded`)
				return result
			} catch (error: unknown) {
				lastError = error as Error

				// Don't fall back on abort errors
				if ((error as any)?.rawError?.name === 'AbortError') throw error
				if (error instanceof InvokeError && !error.retryable) {
					// Auth errors on remote -> try next provider
					if (error.type === InvokeErrorType.AUTH_ERROR) {
						debug(`Provider ${provider} auth failed, trying next`)
						continue
					}
					throw error
				}

				debug(`Provider ${provider} failed: ${(error as Error).message}`)
				// Try next provider
			}
		}

		throw (
			lastError ||
			new InvokeError(InvokeErrorType.UNKNOWN, 'No LLM providers available or all failed')
		)
	}

	/**
	 * Get the client for a specific provider
	 */
	getClient(provider: LLMProvider): LLMClient | undefined {
		return this.clients.get(provider)
	}

	/**
	 * Get available providers
	 */
	getAvailableProviders(): LLMProvider[] {
		return [...this.availableProviders]
	}

	/**
	 * Get the current routing strategy
	 */
	getStrategy(): RoutingStrategy {
		return this.strategy
	}

	/**
	 * Update the routing strategy at runtime
	 */
	setStrategy(strategy: RoutingStrategy): void {
		this.strategy = strategy
		debug(`Strategy updated to: ${strategy}`)
	}

	/**
	 * Dispose all clients
	 */
	async dispose(): Promise<void> {
		const chromeAI = this.clients.get('chrome-ai')
		if (chromeAI && chromeAI instanceof ChromeBuiltInAIClient) {
			await chromeAI.dispose()
		}
		this.clients.clear()
	}
}
