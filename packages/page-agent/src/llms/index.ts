/**
 * @topic LLM 与主流程的隔离
 * @reasoning
 * 将 llm 的调用和主流程分开是复杂的，
 * 因为 agent 的 tool call 通常集成在 llm 模块中，而而先得到 llm 返回，然后处理工具调用
 * tools 和 llm 调用的逻辑不可避免地耦合在一起，tool 的执行又和主流程耦合在一起
 * 而 history 的维护和更新逻辑，又必须嵌入多轮 tool call 中
 * @reasoning
 * - 放弃框架提供的自动的多轮调用，每轮调用都由主流程发起
 * - 理想情况下，llm 调用应该获得 structured output，然后由额外的模块触发 tool call，目前模型和框架都无法实现
 * - 当前只能将 llm api 和 本地 tool call 耦合在一起，不关心其中的衔接方式
 * @conclusion
 * - @llm responsibility boundary:
 *   - call llm api with given messages and tools
 *   - invoke tool call and get the result of the tool
 *   - return the result to main loop
 * - @main_loop responsibility boundary:
 *   - maintain all behaviors of an **agent**
 * @conclusion
 * - 这里的 llm 模块不是 agent，只负责一轮 llm 调用和工具调用，无状态
 */
/**
 * @topic 结构化输出
 * @facts
 * - 几乎所有模型都支持 tool call schema
 * - 几乎所有模型都支持返回 json
 *   - 只有 openAI/grok/gemini 支持 schema 并保证格式
 * - 主流模型都支持 tool_choice: required
 *   - 除了 qwen 必须指定一个函数名 (9月上新后支持)
 * @conclusion
 * - 永远使用 tool call 来返回结构化数据，禁止模型直接返回（视为出错）
 * - 不能假设 tool 参数合法，必须有修复机制，而且修复也应该使用 tool call 返回
 */
import type { LLMConfig } from '../config'
import { parseLLMConfig } from '../config'
import { EventBus, getEventBus } from '../utils/bus'
import { OpenAIClient } from './OpenAILenientClient'
import { InvokeError } from './errors'
import type { InvokeResult, LLMClient, Message, Tool } from './types'

export type { Message, Tool, InvokeResult, LLMClient }

export class LLM {
	config: Required<LLMConfig>
	id: string
	client: LLMClient
	#bus: EventBus

	constructor(config: LLMConfig, id: string) {
		this.config = parseLLMConfig(config)
		this.id = id

		this.#bus = getEventBus(id)

		// Default to OpenAI client
		this.client = new OpenAIClient({
			model: this.config.model,
			apiKey: this.config.apiKey,
			baseURL: this.config.baseURL,
			temperature: this.config.temperature,
			maxTokens: this.config.maxTokens,
		})
	}

	/**
	 * - call llm api *once*
	 * - invoke tool call *once*
	 * - return the result of the tool
	 */
	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal: AbortSignal
	): Promise<InvokeResult> {
		return await withRetry(
			async () => {
				const result = await this.client.invoke(messages, tools, abortSignal)

				return result
			},
			// retry settings
			{
				maxRetries: this.config.maxRetries,
				onRetry: (retries: number) => {
					this.#bus.emit('panel:update', {
						type: 'retry',
						displayText: `retry-ing (${retries} / ${this.config.maxRetries})`,
					})
				},
				onError: (error: Error, withRetry: boolean) => {
					this.#bus.emit('panel:update', {
						type: 'error',
						displayText: `step failed: ${(error as Error).message}`,
					})
				},
			}
		)
	}
}

async function withRetry<T>(
	fn: () => Promise<T>,
	settings: {
		maxRetries: number
		onRetry: (retries: number) => void
		onError: (error: Error, withRetry: boolean) => void
	}
): Promise<T> {
	let retries = 0
	let lastError: Error | null = null
	while (retries <= settings.maxRetries) {
		if (retries > 0) {
			settings.onRetry(retries)
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		try {
			return await fn()
		} catch (error: unknown) {
			console.error(error)
			settings.onError(error as Error, retries < settings.maxRetries)

			// do not retry if aborted by user
			if ((error as { name?: string })?.name === 'AbortError') throw error

			// do not retry if error is not retryable (InvokeError)
			if (error instanceof InvokeError && !error.retryable) throw error

			lastError = error as Error
			retries++

			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	throw lastError!
}
