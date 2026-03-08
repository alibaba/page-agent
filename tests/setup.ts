/**
 * Vitest test setup - provides mock Chrome Built-in AI (Nano GPT) interface
 * and common test utilities.
 */
import { vi } from 'vitest'

/**
 * Mock Chrome Built-in AI (Nano GPT) session.
 *
 * Responds to prompts with fixed deterministic strings based on pattern matching.
 * This allows testing the full agent pipeline without a real LLM.
 */
export class MockChromeAISession {
	private _inputUsage = 0
	private _inputQuota = 8192
	private _destroyed = false
	private _responses: Map<RegExp, string>

	constructor(
		options: {
			responses?: Map<RegExp, string>
		} = {}
	) {
		this._responses = options.responses ?? getDefaultResponses()
	}

	get inputQuota() {
		return this._inputQuota
	}
	get inputUsage() {
		return this._inputUsage
	}
	get maxTokens() {
		return this._inputQuota
	}
	get tokensSoFar() {
		return this._inputUsage
	}
	get tokensLeft() {
		return this._inputQuota - this._inputUsage
	}

	async prompt(text: string, _options?: { signal?: AbortSignal }): Promise<string> {
		if (this._destroyed) throw new Error('Session destroyed')
		this._inputUsage += Math.ceil(text.length / 4)

		// Match against configured response patterns
		for (const [pattern, response] of this._responses) {
			if (pattern.test(text)) {
				return response
			}
		}

		// Default: return a "done" tool call
		return JSON.stringify({
			name: 'AgentOutput',
			arguments: {
				evaluation_previous_goal: 'N/A - first step',
				memory: 'Mock response',
				next_goal: 'Complete the task',
				action: {
					done: { success: true, text: 'Mock task completed' },
				},
			},
		})
	}

	promptStreaming(text: string, options?: { signal?: AbortSignal }): ReadableStream<string> {
		const self = this
		return new ReadableStream({
			async start(controller) {
				const result = await self.prompt(text, options)
				controller.enqueue(result)
				controller.close()
			},
		})
	}

	async measureInputUsage(text: string): Promise<number> {
		return Math.ceil(text.length / 4)
	}

	async countPromptTokens(text: string): Promise<number> {
		return Math.ceil(text.length / 4)
	}

	destroy(): void {
		this._destroyed = true
	}
}

/**
 * Default response patterns for the mock AI.
 * Matches common prompts and returns valid tool-call JSON.
 */
function getDefaultResponses(): Map<RegExp, string> {
	return new Map([
		[
			/click/i,
			JSON.stringify({
				name: 'AgentOutput',
				arguments: {
					evaluation_previous_goal: 'Starting click task',
					memory: 'Need to click an element',
					next_goal: 'Click the target element',
					action: { click_element_by_index: { index: 0 } },
				},
			}),
		],
		[
			/type|input|fill/i,
			JSON.stringify({
				name: 'AgentOutput',
				arguments: {
					evaluation_previous_goal: 'Starting input task',
					memory: 'Need to type text',
					next_goal: 'Input text into the field',
					action: { input_text: { index: 0, text: 'mock input' } },
				},
			}),
		],
		[
			/scroll/i,
			JSON.stringify({
				name: 'AgentOutput',
				arguments: {
					evaluation_previous_goal: 'Starting scroll task',
					memory: 'Need to scroll',
					next_goal: 'Scroll the page',
					action: { scroll: { down: true, num_pages: 1 } },
				},
			}),
		],
	])
}

/**
 * Mock LanguageModel factory - simulates Chrome's self.LanguageModel API
 */
export class MockLanguageModelFactory {
	private _available = true
	private _sessionOptions: Map<RegExp, string> | undefined

	constructor(options?: { available?: boolean; responses?: Map<RegExp, string> }) {
		this._available = options?.available ?? true
		this._sessionOptions = options?.responses
	}

	async availability(): Promise<string> {
		return this._available ? 'available' : 'unavailable'
	}

	async capabilities(): Promise<{ available: string }> {
		return { available: this._available ? 'readily' : 'no' }
	}

	async create(
		_options?: Record<string, unknown>
	): Promise<MockChromeAISession> {
		if (!this._available) throw new Error('Chrome AI not available')
		return new MockChromeAISession({ responses: this._sessionOptions })
	}
}

/**
 * Install mock Chrome AI onto the global scope.
 * Call this in tests that need the Chrome Built-in AI mock.
 */
export function installMockChromeAI(
	options?: { available?: boolean; responses?: Map<RegExp, string> }
): () => void {
	const factory = new MockLanguageModelFactory(options)
	const globalSelf = globalThis as any

	// Install new-style API: self.LanguageModel
	const prevLanguageModel = globalSelf.LanguageModel
	globalSelf.LanguageModel = factory

	// Install legacy API: self.ai.languageModel
	const prevAi = globalSelf.ai
	globalSelf.ai = { languageModel: factory }

	// Return cleanup function
	return () => {
		if (prevLanguageModel === undefined) {
			delete globalSelf.LanguageModel
		} else {
			globalSelf.LanguageModel = prevLanguageModel
		}
		if (prevAi === undefined) {
			delete globalSelf.ai
		} else {
			globalSelf.ai = prevAi
		}
	}
}

// Auto-install mock Chrome AI for all tests (can be overridden per-test)
const cleanup = installMockChromeAI()

// Provide chalk stub for happy-dom environment
vi.mock('chalk', () => {
	const handler: ProxyHandler<any> = {
		get(_target, prop) {
			if (prop === 'default') return new Proxy(() => {}, handler)
			return new Proxy((...args: any[]) => args.join(' '), handler)
		},
		apply(_target, _thisArg, args) {
			return args.join(' ')
		},
	}
	return { default: new Proxy(() => {}, handler) }
})
