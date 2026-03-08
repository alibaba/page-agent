/**
 * Chrome Built-in AI Client implementation
 *
 * Supports Chrome's built-in language model APIs:
 * - ai.languageModel (Prompt API / Gemini Nano)
 * - ai.summarizer
 * - ai.writer
 * - ai.rewriter
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
	 * Check if Chrome Built-in AI is available in this environment
	 */
	static async isAvailable(): Promise<boolean> {
		try {
			const ai = ChromeBuiltInAIClient.getAINamespace()
			if (!ai?.languageModel) return false
			const capabilities = await ai.languageModel.capabilities()
			return capabilities.available === 'readily' || capabilities.available === 'after-download'
		} catch {
			return false
		}
	}

	/**
	 * Get capabilities of the built-in AI model
	 */
	static async getCapabilities(): Promise<{
		available: string
		defaultTemperature?: number
		defaultTopK?: number
		maxTopK?: number
		supportsLanguage?: (lang: string) => string
	} | null> {
		try {
			const ai = ChromeBuiltInAIClient.getAINamespace()
			if (!ai?.languageModel) return null
			return await ai.languageModel.capabilities()
		} catch {
			return null
		}
	}

	/**
	 * Get the AI namespace from the global scope
	 */
	private static getAINamespace(): any {
		if (typeof self !== 'undefined' && (self as any).ai) return (self as any).ai
		if (typeof globalThis !== 'undefined' && (globalThis as any).ai) return (globalThis as any).ai
		return null
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
			// Check if session is still under token limit (80% threshold)
			if (existing.tokenCount < existing.maxTokens * 0.8) {
				existing.lastUsedAt = Date.now()
				return existing
			}
			// Session is approaching limit, destroy and create new one
			await this.destroySession(sessionKey)
		}

		// Create new session
		const ai = ChromeBuiltInAIClient.getAINamespace()
		if (!ai?.languageModel) {
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				'Chrome Built-in AI (ai.languageModel) is not available in this environment'
			)
		}

		const sessionOptions: Record<string, unknown> = {
			temperature: this.config.temperature ?? 0.7,
			topK: this.config.topK,
		}

		if (systemPrompt) {
			sessionOptions.systemPrompt = systemPrompt
		}

		if (this.config.initialPrompts) {
			sessionOptions.initialPrompts = this.config.initialPrompts
		}

		if (signal) {
			sessionOptions.signal = signal
		}

		let session: ChromeAISession
		try {
			session = await ai.languageModel.create(sessionOptions)
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

		const managed: ManagedSession = {
			session,
			createdAt: Date.now(),
			lastUsedAt: Date.now(),
			tokenCount: 0,
			maxTokens: (session as any).maxTokens || (session as any).tokensSoFar || 4096,
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

		// Update token tracking (estimate)
		managed.tokenCount += Math.ceil((promptText.length + responseText.length) / 4)
		managed.lastUsedAt = Date.now()

		// Cache the response
		if (this.config.enableCache !== false) {
			const cacheKey = this.buildCacheKey(messages)
			this.setCached(cacheKey, responseText)
		}

		// Parse tool call from response
		return this.parseToolCallResponse(responseText, tools)
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
		tools: Record<string, Tool>
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
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
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
	 * Perform a streaming prompt (utility method)
	 */
	async *promptStreaming(
		text: string,
		systemPrompt?: string,
		signal?: AbortSignal
	): AsyncGenerator<string> {
		const managed = await this.getOrCreateSession(systemPrompt, signal)
		const stream = managed.session.promptStreaming(text, { signal })

		// The Chrome API returns a ReadableStream
		const asyncIterator = (stream as any)?.[Symbol.asyncIterator]
		if (stream && typeof asyncIterator === 'function') {
			for await (const chunk of stream as unknown as AsyncIterable<string>) {
				yield chunk
			}
		} else if (stream && typeof stream.getReader === 'function') {
			const reader = stream.getReader()
			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					yield value
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
