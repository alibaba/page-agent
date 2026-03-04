import type { LLMConfig } from '@page-agent/llms'
import type { PageControllerConfig } from '@page-agent/page-controller'

import type { PageAgentCore } from '../PageAgentCore'
import type { PageAgentTool } from '../tools'
import type { ExecutionResult, HistoricalEvent } from '../types'

export type { LLMConfig }

/** Supported UI languages */
export type SupportedLanguage = 'en-US' | 'zh-CN'

export interface AgentConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage

	/**
	 * Maximum number of steps the agent can take per task.
	 * @default 20
	 */
	maxSteps?: number

	/**
	 * Custom tools to extend PageAgent capabilities
	 * @experimental
	 * @note You can also override or remove internal tools by using the same name.
	 * @see PageAgentTool
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

	/**
	 * Instructions to guide the agent's behavior
	 */
	instructions?: {
		/**
		 * Global system-level instructions, applied to all tasks
		 */
		system?: string

		/**
		 * Dynamic page-level instructions callback
		 * Called before each step to get instructions for the current page
		 * @param url - Current page URL (window.location.href)
		 * @returns Instructions string, or undefined/null to skip
		 */
		getPageInstructions?: (url: string) => string | undefined | null
	}

	/**
	 * Lifecycle hooks for task execution.
	 * @experimental API may change in future versions.
	 *
	 * All hooks receive the agent instance as first parameter.
	 */

	/**
	 * Called before each step execution.
	 * @experimental
	 * @param agent - The PageAgentCore instance
	 * @param stepCount - Current step number (0-indexed)
	 */
	onBeforeStep?: (agent: PageAgentCore, stepCount: number) => Promise<void> | void

	/**
	 * Called after each step execution.
	 * @experimental
	 * @param agent - The PageAgentCore instance
	 * @param history - Current history of events
	 */
	onAfterStep?: (agent: PageAgentCore, history: HistoricalEvent[]) => Promise<void> | void

	/**
	 * Called before task execution starts.
	 * @experimental
	 * @param agent - The PageAgentCore instance
	 */
	onBeforeTask?: (agent: PageAgentCore) => Promise<void> | void

	/**
	 * Called after task execution completes (success or failure).
	 * @experimental
	 * @param agent - The PageAgentCore instance
	 * @param result - The execution result
	 */
	onAfterTask?: (agent: PageAgentCore, result: ExecutionResult) => Promise<void> | void

	/**
	 * Called when the agent is disposed.
	 * @experimental
	 * @note This hook can block the disposal process if it's async.
	 * @param agent - The PageAgentCore instance
	 * @param reason - Optional reason for disposal
	 */
	onDispose?: (agent: PageAgentCore, reason?: string) => void

	// page behavior hooks

	/**
	 * @experimental
	 * Enable the experimental script execution tool that allows executing generated JavaScript code on the page.
	 * @note Can cause unpredictable side effects.
	 * @note May bypass some safe guards and data-masking mechanisms.
	 */
	experimentalScriptExecutionTool?: boolean

	/**
	 * @experimental
	 * Fetch /llms.txt from current site origin and include as context.
	 * Only fetched once per origin per task.
	 * @default false
	 */
	experimentalLlmsTxt?: boolean

	/**
	 * Transform page content before sending to LLM.
	 * Called after DOM extraction and simplification, before LLM invocation.
	 * Use cases: inspect extraction results, modify page info, mask sensitive data.
	 *
	 * @param content - Simplified page content that will be sent to LLM
	 * @returns Transformed content
	 *
	 * @example
	 * // Mask phone numbers
	 * transformPageContent: async (content) => {
	 *   return content.replace(/1[3-9]\d{9}/g, '***********')
	 * }
	 */
	transformPageContent?: (content: string) => Promise<string> | string

	/**
	 * Completely override the default system prompt.
	 * @experimental Use with caution - incorrect prompts may break agent behavior.
	 */
	customSystemPrompt?: string
}

export type PageAgentConfig = LLMConfig & AgentConfig & PageControllerConfig
