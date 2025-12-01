import type { AgentHistory, ExecutionResult, PageAgent } from '../PageAgent'
import type { DomConfig } from '../dom'
import type { SupportedLanguage } from '../i18n'
import type { PageAgentTool } from '../tools'
import {
	DEFAULT_API_KEY,
	DEFAULT_BASE_URL,
	DEFAULT_MAX_TOKENS,
	DEFAULT_MODEL_NAME,
	DEFAULT_TEMPERATURE,
	LLM_MAX_RETRIES,
} from './constants'

export interface LLMConfig {
	baseURL?: string
	apiKey?: string
	model?: string
	temperature?: number
	maxTokens?: number
	maxRetries?: number
}

export interface AgentConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage

	/**
	 * Custom tools to extend PageAgent capabilities
	 * @experimental
	 * @note You can also override or remove internal tools by using the same name.
	 * @see [tools](../tools/index.ts)
	 *
	 * @example
	 * // override internal tool
	 * import { tool } from 'page-agent'
	 * const customTools = {
	 * ask_user: tool({
	 * 	description:
	 * 		'Ask the user or parent model a question and wait for their answer. Use this if you need more information or clarification.',
	 * 	inputSchema: zod.object({
	 * 		question: zod.string(),
	 * 	}),
	 * 	execute: async function (this: PageAgent, input) {
	 * 		const answer = await do_some_thing(input.question)
	 * 		return "✅ Received user answer: " + answer
	 * 	},
	 * })
	 * }
	 *
	 * @example
	 * // remove internal tool
	 * const customTools = {
	 * 	ask_user: null // never ask user questions
	 * }
	 */
	customTools?: Record<string, PageAgentTool | null>

	// lifecycle hooks
	// @todo: use event instead of hooks

	onBeforeStep?: (this: PageAgent, stepCnt: number) => Promise<void> | void
	onAfterStep?: (this: PageAgent, stepCnt: number, history: AgentHistory[]) => Promise<void> | void
	onBeforeTask?: (this: PageAgent) => Promise<void> | void
	onAfterTask?: (this: PageAgent, result: ExecutionResult) => Promise<void> | void

	/**
	 * @note this hook can block the disposal process
	 * @note when dispose caused by page unload, reason will be 'PAGE_UNLOADING'. this method CANNOT block unloading. async operations may be cut.
	 */
	onDispose?: (this: PageAgent, reason?: string) => void

	// page behavior hooks

	/**
	 * @experimental
	 * Enable the experimental script execution tool that allows executing generated JavaScript code on the page.
	 * @note Can cause unpredictable side effects.
	 * @note May bypass some safe guards and data-masking mechanisms.
	 */
	experimentalScriptExecutionTool?: boolean

	/**
	 * TODO: @unimplemented
	 * hook when action causes a new page to be opened
	 * @note PageAgent will try to detect new pages and decide if it's caused by an action. But not very reliable.
	 */
	onNewPageOpen?: (this: PageAgent, url: string) => Promise<void> | void

	/**
	 * TODO: @unimplemented
	 * try to navigate to a new page instead of opening a new tab/window.
	 * @note will unload the current page when a action tries to open a new page. so that things keep in the same tab/window.
	 */
	experimentalPreventNewPage?: boolean
}

export type PageAgentConfig = LLMConfig & AgentConfig & DomConfig

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		baseURL: config.baseURL ?? DEFAULT_BASE_URL,
		apiKey: config.apiKey ?? DEFAULT_API_KEY,
		model: config.model ?? DEFAULT_MODEL_NAME,
		temperature: config.temperature ?? DEFAULT_TEMPERATURE,
		maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
	}
}
