import type { LLMConfig } from '@eb-agent/llms'

// @note circular dependency but okay
import type { EBAgentCore } from './EBAgentCore'
import type { CapabilityConfig } from './capabilities/CapabilityManager'
import type { EBAgentTool } from './tools'

/** Supported UI languages */
export type SupportedLanguage = 'en-US' | 'zh-CN'

/**
 * Options for a single `execute()` call.
 */
export interface ExecuteOptions {
	/**
	 * An image attached to the task (data URL or publicly reachable http(s) URL),
	 * e.g. a photo the user uploaded. When set, the `identify_image` tool becomes
	 * available so the agent can inspect it with a vision-capable model before acting.
	 */
	image?: string
}

/**
 * Structured result from analyzing an attached image via a vision-capable model.
 * @see EBAgentCore.identifyImage
 */
export interface IdentifyImageResult {
	/** General category, e.g. "shoes", "medicine", "gemstone", "clothing" */
	category: string
	/** Best-guess specific name, e.g. "Nike Air Max 90" */
	name: string
	/** Concise visual description including color, material, notable features */
	description: string
	/** Additional key-value attributes, e.g. { color: "red", brand: "Nike" } */
	attributes?: Record<string, string>
}

export interface AgentConfig extends LLMConfig {
	language?: SupportedLanguage

	/**
	 * Maximum number of steps the agent can take per task.
	 * @remarks Tasks that repeat a multi-step workflow across several records (e.g. "for each
	 * of the top 5 leads: update status, add a note, convert to deal...") need roughly
	 * (steps per record × number of records) raw actions, which is easy to underestimate —
	 * size this generously for that kind of batch task.
	 * @default 60
	 */
	maxSteps?: number

	/**
	 * Custom tools to extend EBAgent capabilities
	 * @experimental
	 * @note You can also override or remove internal tools by using the same name.
	 * @see EBAgentTool
	 *
	 * @example
	 * // override internal tool
	 * import { z } from 'zod/v4'
	 * import { tool } from 'eb-agent'
	 * const customTools = {
	 * ask_user: tool({
	 * 	description:
	 * 		'Ask the user or parent model a question and wait for their answer. Use this if you need more information or clarification.',
	 * 	inputSchema: z.object({
	 * 		question: z.string(),
	 * 	}),
	 * 	execute: async function (this: EBAgent, input) {
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
	customTools?: Record<string, EBAgentTool | null>

	/**
	 * Capability layer: discovery of WebMCP tools the page declares, generation of
	 * business actions from the page's own UI, risk policy, human approval and audit.
	 *
	 * @remarks
	 * Every part of it is optional and additive. Omitting this config leaves the agent
	 * behaving exactly as it did before capabilities existed — DOM automation only —
	 * except that tools a page declares natively are discovered and preferred.
	 *
	 * @example
	 * capabilities: {
	 *   generateFromDom: true,
	 *   policy: { autoApproveReversible: true },
	 *   onApproval: async ({ summary }) => confirm(summary),
	 *   onAudit: (event) => console.log(event),
	 * }
	 */
	capabilities?: CapabilityConfig

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
	 * @param agent - The EBAgentCore instance
	 * @param stepCount - Current step number (0-indexed)
	 */
	onBeforeStep?: (agent: EBAgentCore, stepCount: number) => Promise<void> | void

	/**
	 * Called after each step execution.
	 * @experimental
	 * @param agent - The EBAgentCore instance
	 * @param history - Current history of events
	 */
	onAfterStep?: (agent: EBAgentCore, history: HistoricalEvent[]) => Promise<void> | void

	/**
	 * Called before task execution starts.
	 * @experimental
	 * @param agent - The EBAgentCore instance
	 */
	onBeforeTask?: (agent: EBAgentCore) => Promise<void> | void

	/**
	 * Called after task execution completes (success or failure).
	 * @experimental
	 * @param agent - The EBAgentCore instance
	 * @param result - The execution result
	 */
	onAfterTask?: (agent: EBAgentCore, result: ExecutionResult) => Promise<void> | void

	/**
	 * Called when the agent is disposed.
	 * @experimental
	 * @note This hook can block the disposal process if it's async.
	 * @param agent - The EBAgentCore instance
	 * @param reason - Optional reason for disposal
	 */
	onDispose?: (agent: EBAgentCore, reason?: string) => void

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

	/**
	 * Delay between steps in seconds.
	 * @default 0.4
	 */
	stepDelay?: number

	/**
	 * Separate model configuration for the `identify_image` tool's vision call.
	 * Many fast/cheap text models (the usual choice for the browsing loop) do not
	 * accept image input at all. Set this to a vision-capable model (e.g. `gpt-4o`)
	 * to power `identify_image` without changing the model used for the rest of the task.
	 * `baseURL`/`apiKey` fall back to the top-level config when omitted, so a single
	 * OpenAI-compatible gateway serving multiple models only needs `model` overridden here.
	 */
	visionModel?: {
		model: string
		baseURL?: string
		apiKey?: string
	}
}

/**
 * Agent reflection state - the reflection-before-action model
 *
 * Every tool call must first reflect on:
 * - evaluation_previous_goal: How well did the previous action achieve its goal?
 * - memory: Key information to remember for future steps
 * - next_goal: What should be accomplished in the next action?
 */
export interface AgentReflection {
	evaluation_previous_goal: string
	memory: string
	next_goal: string
}

/**
 * MacroTool input structure
 *
 * This is the core abstraction that enforces the "reflection-before-action" mental model.
 * Before executing any action, the LLM must output its reasoning state.
 */
export interface MacroToolInput extends Partial<AgentReflection> {
	action: Record<string, any>
}

/**
 * MacroTool output structure
 */
export interface MacroToolResult {
	input: MacroToolInput
	output: string
}

/**
 * A single agent step with reflection and action
 */
export interface AgentStepEvent {
	type: 'step'
	stepIndex: number
	reflection: Partial<AgentReflection>
	action: {
		name: string
		input: any
		output: string
	}
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
		cachedTokens?: number
		reasoningTokens?: number
	}
	/** Raw LLM response for debugging */
	rawResponse?: unknown
	/** Raw LLM request for debugging */
	rawRequest?: unknown
}

/**
 * Persistent observation event (stays in memory)
 */
export interface ObservationEvent {
	type: 'observation'
	content: string
	/**
	 * Internal guardrail/self-correction messages (e.g. "Blocked: `done` was called too early") are
	 * addressed to the model, not the user — they still need to reach the LLM via <agent_history>,
	 * but UIs should not render them as user-facing status updates the way they do for e.g.
	 * "Page navigated to →" or step-remaining warnings. Defaults to false/absent for those.
	 */
	internal?: boolean
}

/**
 * User takeover event
 */
export interface UserTakeoverEvent {
	type: 'user_takeover'
}

/**
 * Retry event - LLM call is being retried
 */
export interface RetryEvent {
	type: 'retry'
	message: string
	attempt: number
	maxAttempts: number
}

/**
 * Error event - fatal error from LLM or execution
 */
export interface AgentErrorEvent {
	type: 'error'
	message: string
	rawResponse?: unknown
}

/**
 * Union type for all history events
 */
export type HistoricalEvent =
	AgentStepEvent | ObservationEvent | UserTakeoverEvent | RetryEvent | AgentErrorEvent

/**
 * Agent lifecycle status.
 */
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped'

/**
 * Agent activity - transient state for immediate UI feedback.
 *
 * Unlike historical events (which are persisted), activities are ephemeral
 * and represent "what the agent is doing right now". UI components should
 * listen to 'activity' events to show real-time feedback.
 *
 * Note: There is no 'idle' activity - absence of activity events means idle.
 */
export type AgentActivity =
	| { type: 'thinking' }
	| { type: 'executing'; tool: string; input: unknown }
	| { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
	| { type: 'retrying'; attempt: number; maxAttempts: number }
	| { type: 'error'; message: string }

export interface ExecutionResult {
	success: boolean
	data: string
	history: HistoricalEvent[]
}
