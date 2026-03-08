/**
 * Chrome Built-in AI Client implementation
 *
 * Supports Chrome's built-in language model APIs across API versions:
 * - New API: self.LanguageModel / window.LanguageModel (2025+)
 * - Legacy API: self.ai.languageModel (2024)
 *
 * Includes session management, caching, and proxy patterns
 * based on GoogleChromeLabs/web-ai-demos patterns.
 *
 * @see https://github.com/nicolo-ribaudo/nicolo-ribaudo/
 * @see https://developer.chrome.com/docs/ai/built-in
 */
import { InvokeError, InvokeErrorType } from './errors'
import type {
	ChromeAIConfig,
	ChromeAISession,
	InvokeOptions,
	InvokeResult,
	LLMClient,
	Message,
	Tool,
} from './types'
import { zodToOpenAITool } from './utils'

/**
 * Cache entry for prompt results
 */
interface CacheEntry {
	result: string
	timestamp: number
	hitCount: number
}

/**
 * Managed session with metadata
 */
interface ManagedSession {
	session: ChromeAISession
	createdAt: number
	lastUsedAt: number
	tokenCount: number
	maxTokens: number
	id: string
}

/**
 * Chrome Built-in AI client implementing LLMClient interface.
 *
 * Features:
 * - Session pooling and reuse
 * - Response caching with TTL
 * - Automatic session recycling when token limits are approached
 * - Support for system prompts via initial prompts
 * - Tool calling emulation via structured prompting
 * - Both old and new Chrome AI API shape support
 */
export class ChromeBuiltInAIClient implements LLMClient {
	private config: ChromeAIConfig
	private sessions = new Map<string, ManagedSession>()
	private cache = new Map<string, CacheEntry>()
	private cacheTTL: number
	private maxCacheSize: number
	private sessionIdCounter = 0

	constructor(config: ChromeAIConfig) {
		this.config = config
		this.cacheTTL = config.cacheTTL ?? 5 * 60 * 1000 // 5 minutes default
		this.maxCacheSize = config.maxCacheSize ?? 100
	}

	/**
	 * Check if Chrome Built-in AI is available in this environment.
	 * Checks both new (LanguageModel) and legacy (ai.languageModel) API shapes.
	 */
	static async isAvailable(): Promise<boolean> {
		try {
			const factory = ChromeBuiltInAIClient.getLanguageModelFactory()
			if (!factory) return false

			// New API uses .availability(), legacy uses .capabilities()
			if (typeof factory.availability === 'function') {
				const result = await factory.availability()
				return result === 'available' || result === 'readily' || result === 'after-download'
			}
			if (typeof factory.capabilities === 'function') {
				const caps = await factory.capabilities()
				return caps.available === 'readily' || caps.available === 'after-download'
			}
			return false
		} catch {
			return false
		}
	}

	/**
	 * Get capabilities of the built-in AI model.
	 * Supports both new (.availability()) and legacy (.capabilities()) API shapes.
	 */
	static async getCapabilities(): Promise<{
		available: string
		defaultTemperature?: number
		defaultTopK?: number
		maxTopK?: number
	} | null> {
		try {
			const factory = ChromeBuiltInAIClient.getLanguageModelFactory()
			if (!factory) return null

			// New API: availability() returns a string
			if (typeof factory.availability === 'function') {
				const available = await factory.availability()
				return { available }
			}
			// Legacy API: capabilities() returns an object
			if (typeof factory.capabilities === 'function') {
				return await factory.capabilities()
			}
			return null
		} catch {
			return null
		}
	}

	/**
	 * Get the LanguageModel factory from the global scope.
	 * Supports both new (self.LanguageModel) and legacy (self.ai.languageModel) API shapes.
	 */
	private static getLanguageModelFactory(): any {
		// New API (2025+): self.LanguageModel / window.LanguageModel
		if (typeof self !== 'undefined' && 'LanguageModel' in self) {
			return (self as any).LanguageModel
		}
		if (typeof globalThis !== 'undefined' && 'LanguageModel' in globalThis) {
			return (globalThis as any).LanguageModel
		}

		// Legacy API (2024): self.ai.languageModel
		if (typeof self !== 'undefined' && (self as any).ai?.languageModel) {
			return (self as any).ai.languageModel
		}
		if (typeof globalThis !== 'undefined' && (globalThis as any).ai?.languageModel) {
			return (globalThis as any).ai.languageModel
		}

		return null
	}

	/**
	 * Get the token usage from a session, supporting both old and new API shapes.
	 * New API: session.inputQuota / session.inputUsage
	 * Old API: session.maxTokens / session.tokensSoFar / session.tokensLeft
	 */
	private static getSessionTokenInfo(session: ChromeAISession): {
		maxTokens: number
		tokensUsed: number
	} {
		const s = session as any
		// New API shape
		if (typeof s.inputQuota === 'number') {
			return {
				maxTokens: s.inputQuota,
				tokensUsed: s.inputUsage ?? 0,
			}
		}
		// Old API shape
		if (typeof s.maxTokens === 'number') {
			return {
				maxTokens: s.maxTokens,
				tokensUsed: s.tokensSoFar ?? 0,
			}
		}
		// Fallback
		return { maxTokens: 4096, tokensUsed: 0 }
	}

	/**
	 * Count tokens for a prompt if the API supports it.
	 * New API: session.measureInputUsage(text)
	 * Old API: session.countPromptTokens(text)
	 */
	private static async countTokens(session: ChromeAISession, text: string): Promise<number> {
		const s = session as any
		try {
			if (typeof s.measureInputUsage === 'function') {
				return await s.measureInputUsage(text)
			}
			if (typeof s.countPromptTokens === 'function') {
				return await s.countPromptTokens(text)
			}
		} catch {
			// Token counting may not be supported
		}
		// Rough estimate: ~4 chars per token
		return Math.ceil(text.length / 4)
	}

	/**
	 * Create or retrieve a managed session
	 */
	private async getOrCreateSession(
		systemPrompt?: string,
		signal?: AbortSignal
	): Promise<ManagedSession> {
		const sessionKey = systemPrompt || '__default__'

		// Check for existing session that's still usable
		const existing = this.sessions.get(sessionKey)
		if (existing) {
			// Re-check real token usage from the session object
			const tokenInfo = ChromeBuiltInAIClient.getSessionTokenInfo(existing.session)
			existing.tokenCount = tokenInfo.tokensUsed
			existing.maxTokens = tokenInfo.maxTokens

			// Check if session is still under token limit (80% threshold)
			if (existing.tokenCount < existing.maxTokens * 0.8) {
				existing.lastUsedAt = Date.now()
				return existing
			}
			// Session is approaching limit, destroy and create new one
			await this.destroySession(sessionKey)
		}

		// Create new session
		const factory = ChromeBuiltInAIClient.getLanguageModelFactory()
		if (!factory) {
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				'Chrome Built-in AI is not available. ' +
					'Checked: self.LanguageModel (new API), self.ai.languageModel (legacy API)'
			)
		}

		const sessionOptions: Record<string, unknown> = {
			temperature: this.config.temperature ?? 0.7,
			topK: this.config.topK,
		}

		// System prompt: use initialPrompts with system role for session context
		if (systemPrompt) {
			sessionOptions.systemPrompt = systemPrompt
		}

		if (this.config.initialPrompts) {
			sessionOptions.initialPrompts = this.config.initialPrompts
		}

		// New API supports expectedInputs/expectedOutputs for language capability checks
		if (this.config.expectedInputLanguages || this.config.expectedOutputLanguages) {
			sessionOptions.expectedInputs = (this.config.expectedInputLanguages || ['en']).map(
				(lang) => ({ type: 'text', languages: [lang] })
			)
			sessionOptions.expectedOutputs = (this.config.expectedOutputLanguages || ['en']).map(
				(lang) => ({ type: 'text', languages: [lang] })
			)
		}

		if (signal) {
			sessionOptions.signal = signal
		}

		let session: ChromeAISession
		try {
			session = await factory.create(sessionOptions)
		} catch (error: unknown) {
			const msg = (error as Error)?.message || String(error)
			if (msg.includes('abort') || (error as any)?.name === 'AbortError') {
				throw new InvokeError(InvokeErrorType.NETWORK_ERROR, 'Session creation aborted', error)
			}
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				`Failed to create Chrome AI session: ${msg}`,
				error
			)
		}

		const tokenInfo = ChromeBuiltInAIClient.getSessionTokenInfo(session)

		const managed: ManagedSession = {
			session,
			createdAt: Date.now(),
			lastUsedAt: Date.now(),
			tokenCount: tokenInfo.tokensUsed,
			maxTokens: tokenInfo.maxTokens,
			id: `chrome-ai-${++this.sessionIdCounter}`,
		}

		this.sessions.set(sessionKey, managed)
		return managed
	}

	/**
	 * Destroy a managed session
	 */
	private async destroySession(key: string): Promise<void> {
		const managed = this.sessions.get(key)
		if (managed) {
			try {
				managed.session.destroy()
			} catch {
				// Session may already be destroyed
			}
			this.sessions.delete(key)
		}
	}

	/**
	 * Look up a cached response
	 */
	private getCached(key: string): string | undefined {
		const entry = this.cache.get(key)
		if (!entry) return undefined

		if (Date.now() - entry.timestamp > this.cacheTTL) {
			this.cache.delete(key)
			return undefined
		}

		entry.hitCount++
		return entry.result
	}

	/**
	 * Store a response in the cache
	 */
	private setCached(key: string, result: string): void {
		// Evict oldest entries if cache is full
		if (this.cache.size >= this.maxCacheSize) {
			let oldestKey: string | null = null
			let oldestTime = Infinity
			for (const [k, v] of this.cache) {
				if (v.timestamp < oldestTime) {
					oldestTime = v.timestamp
					oldestKey = k
				}
			}
			if (oldestKey) this.cache.delete(oldestKey)
		}

		this.cache.set(key, {
			result,
			timestamp: Date.now(),
			hitCount: 0,
		})
	}

	/**
	 * Build a cache key from messages
	 */
	private buildCacheKey(messages: Message[]): string {
		return JSON.stringify(messages.map((m) => ({ role: m.role, content: m.content })))
	}

	/**
	 * Invoke the Chrome Built-in AI model
	 *
	 * Since Chrome's built-in AI doesn't natively support tool calling,
	 * we emulate it by formatting tools into the prompt and parsing
	 * structured JSON output from the model.
	 */
	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal?: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		// Extract system prompt from messages
		const systemMessage = messages.find((m) => m.role === 'system')
		const systemPrompt = systemMessage?.content || undefined

		// Build the prompt with tool instructions
		const promptText = this.buildToolCallingPrompt(messages, tools, options)

		// Check cache
		if (this.config.enableCache !== false) {
			const cacheKey = this.buildCacheKey(messages)
			const cached = this.getCached(cacheKey)
			if (cached) {
				return this.parseToolCallResponse(cached, tools)
			}
		}

		// Get or create session
		const managed = await this.getOrCreateSession(systemPrompt, abortSignal)

		// Count input tokens if available
		const inputTokens = await ChromeBuiltInAIClient.countTokens(managed.session, promptText)

		// Prompt the model
		let responseText: string
		try {
			responseText = await managed.session.prompt(promptText, {
				signal: abortSignal,
			})
		} catch (error: unknown) {
			const msg = (error as Error)?.message || String(error)
			if (msg.includes('abort') || (error as any)?.name === 'AbortError') {
				throw new InvokeError(InvokeErrorType.NETWORK_ERROR, 'Prompt aborted', error)
			}
			// Session may be invalid, destroy it
			const sessionKey = systemPrompt || '__default__'
			await this.destroySession(sessionKey)
			throw new InvokeError(InvokeErrorType.UNKNOWN, `Chrome AI prompt failed: ${msg}`, error)
		}

		// Update token tracking from the actual session state
		const tokenInfo = ChromeBuiltInAIClient.getSessionTokenInfo(managed.session)
		managed.tokenCount = tokenInfo.tokensUsed
		managed.maxTokens = tokenInfo.maxTokens
		managed.lastUsedAt = Date.now()

		// Estimate output tokens
		const outputTokens = await ChromeBuiltInAIClient.countTokens(managed.session, responseText)

		// Cache the response
		if (this.config.enableCache !== false) {
			const cacheKey = this.buildCacheKey(messages)
			this.setCached(cacheKey, responseText)
		}

		// Parse tool call from response
		return this.parseToolCallResponse(responseText, tools, inputTokens, outputTokens)
	}

	/**
	 * Build a prompt that instructs the model to output structured tool calls
	 */
	private buildToolCallingPrompt(
		messages: Message[],
		tools: Record<string, Tool>,
		options?: InvokeOptions
	): string {
		const openaiTools = Object.entries(tools).map(([name, t]) => zodToOpenAITool(name, t))

		let prompt = ''

		// Add non-system messages as context
		for (const msg of messages) {
			if (msg.role === 'system') continue
			prompt += `<${msg.role}>\n${msg.content}\n</${msg.role}>\n\n`
		}

		// Add tool instructions
		prompt += '<tool_instructions>\n'
		prompt += 'You MUST respond with a JSON object that calls one of the available tools.\n'
		prompt += 'Your response must be valid JSON with this structure:\n'
		prompt += '{"name": "tool_name", "arguments": { ... }}\n\n'
		prompt += 'Available tools:\n'

		for (const tool of openaiTools) {
			prompt += `\n--- ${tool.function.name} ---\n`
			if (tool.function.description) {
				prompt += `Description: ${tool.function.description}\n`
			}
			prompt += `Parameters: ${JSON.stringify(tool.function.parameters, null, 2)}\n`
		}

		if (options?.toolChoiceName) {
			prompt += `\nYou MUST call the tool named "${options.toolChoiceName}".\n`
		}

		prompt += '\nRespond ONLY with the JSON tool call. No other text.\n'
		prompt += '</tool_instructions>'

		return prompt
	}

	/**
	 * Parse a tool call from the model's text response
	 */
	private async parseToolCallResponse(
		responseText: string,
		tools: Record<string, Tool>,
		inputTokens = 0,
		outputTokens = 0
	): Promise<InvokeResult> {
		// Try to extract JSON from the response
		let parsed: { name: string; arguments: Record<string, unknown> }

		try {
			// Try direct parse first
			parsed = JSON.parse(responseText.trim())
		} catch {
			// Try to find JSON in the response
			const jsonMatch = /\{[\s\S]*\}/.exec(responseText)
			if (!jsonMatch) {
				throw new InvokeError(
					InvokeErrorType.NO_TOOL_CALL,
					'Chrome AI response did not contain a valid tool call JSON',
					undefined,
					responseText
				)
			}
			try {
				parsed = JSON.parse(jsonMatch[0])
			} catch {
				throw new InvokeError(
					InvokeErrorType.NO_TOOL_CALL,
					'Chrome AI response contained malformed JSON',
					undefined,
					responseText
				)
			}
		}

		const toolName = parsed.name
		if (!toolName) {
			throw new InvokeError(
				InvokeErrorType.NO_TOOL_CALL,
				'Chrome AI response JSON missing "name" field',
				undefined,
				responseText
			)
		}

		const tool = tools[toolName]
		if (!tool) {
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				`Tool "${toolName}" not found in tools`,
				undefined,
				responseText
			)
		}

		// Validate with schema
		const validation = tool.inputSchema.safeParse(parsed.arguments || {})
		if (!validation.success) {
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				'Chrome AI tool arguments validation failed',
				validation.error,
				responseText
			)
		}

		const toolInput = validation.data

		// Execute tool
		let toolResult: unknown
		try {
			toolResult = await tool.execute(toolInput)
		} catch (e) {
			throw new InvokeError(
				InvokeErrorType.TOOL_EXECUTION_ERROR,
				`Tool execution failed: ${(e as Error).message}`,
				e,
				responseText
			)
		}

		return {
			toolCall: {
				name: toolName,
				args: toolInput,
			},
			toolResult,
			usage: {
				promptTokens: inputTokens,
				completionTokens: outputTokens,
				totalTokens: inputTokens + outputTokens,
			},
			rawResponse: responseText,
		}
	}

	/**
	 * Perform a simple prompt without tool calling (utility method)
	 */
	async prompt(text: string, systemPrompt?: string, signal?: AbortSignal): Promise<string> {
		const managed = await this.getOrCreateSession(systemPrompt, signal)
		return await managed.session.prompt(text, { signal })
	}

	/**
	 * Perform a streaming prompt (utility method).
	 *
	 * Handles both cumulative (old API) and delta (new API) stream behavior.
	 * The old Chrome API returned cumulative strings where each chunk contains
	 * all previous content. The new API returns delta chunks. This method
	 * normalizes both to emit only new content (deltas).
	 */
	async *promptStreaming(
		text: string,
		systemPrompt?: string,
		signal?: AbortSignal
	): AsyncGenerator<string> {
		const managed = await this.getOrCreateSession(systemPrompt, signal)
		const stream = managed.session.promptStreaming(text, { signal })

		let previousChunk = ''

		// The Chrome API returns a ReadableStream
		const asyncIterator = (stream as any)?.[Symbol.asyncIterator]
		if (stream && typeof asyncIterator === 'function') {
			for await (const chunk of stream as unknown as AsyncIterable<string>) {
				// Handle cumulative vs delta streaming:
				// Old API sends cumulative strings, new API sends deltas.
				// Detect cumulative by checking if new chunk starts with previous.
				if (chunk.startsWith(previousChunk)) {
					// Cumulative: extract only the new portion
					const delta = chunk.slice(previousChunk.length)
					if (delta) yield delta
				} else {
					// Delta: emit as-is
					yield chunk
				}
				previousChunk = chunk
			}
		} else if (stream && typeof stream.getReader === 'function') {
			const reader = stream.getReader()
			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					if (typeof value === 'string') {
						if (value.startsWith(previousChunk)) {
							const delta = value.slice(previousChunk.length)
							if (delta) yield delta
						} else {
							yield value
						}
						previousChunk = value
					} else {
						yield value
					}
				}
			} finally {
				reader.releaseLock()
			}
		}
	}

	/**
	 * Destroy all sessions and clear cache
	 */
	async dispose(): Promise<void> {
		for (const [key] of this.sessions) {
			await this.destroySession(key)
		}
		this.cache.clear()
	}

	/**
	 * Get session statistics
	 */
	getStats(): {
		activeSessions: number
		cacheSize: number
		cacheHits: number
	} {
		let cacheHits = 0
		for (const entry of this.cache.values()) {
			cacheHits += entry.hitCount
		}
		return {
			activeSessions: this.sessions.size,
			cacheSize: this.cache.size,
			cacheHits,
		}
	}
}
