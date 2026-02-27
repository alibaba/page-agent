/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { InvokeError, LLM, type Tool } from '@page-agent/llms'
import type { BrowserState, PageController } from '@page-agent/page-controller'
import chalk from 'chalk'
import * as z from 'zod'

import { type PageAgentConfig, type SupportedLanguage } from './config'
import { DEFAULT_MAX_STEPS } from './config/constants'
import SYSTEM_PROMPT from './prompts/system_prompt.md?raw'
import { tools } from './tools'
import type {
	AgentActivity,
	AgentReflection,
	AgentStatus,
	AgentStepEvent,
	ExecutionResult,
	HistoricalEvent,
	MacroToolInput,
	MacroToolResult,
} from './types'
import { assert, normalizeResponse, uid, waitFor } from './utils'

export { type PageAgentConfig }
export type { SupportedLanguage }
export { tool, type PageAgentTool } from './tools'
export type * from './types'

/**
 * AI agent for browser automation.
 *
 * @remarks
 * ## Re-act Agent Loop
 * - step
 *    - observe (gather information about current environment and context)
 *    - think (LLM calling)
 *      - reflection (evaluate history, generate memory, short-term planning)
 *      - action (give the action to approach the next goal)
 *    - act (execute the action)
 * - loop
 *
 * ## Event System
 * - `statuschange` - Agent status transitions (idle → running → completed/error)
 * - `historychange` - History events updated (persistent, part of agent memory)
 * - `activity` - Real-time activity feedback (transient, for UI only)
 * - `dispose` - Agent cleanup triggered
 *
 * ## Information Streams
 * 1. **History Events** (`history` array)
 *    - Persistent event stream that forms agent's memory
 *    - Included in LLM context across steps
 *    - Types: steps, observations, user takeovers, llm errors
 *
 * 2. **Activity Events** (via `activity` event)
 *    - Transient UI feedback during task execution
 *    - NOT included in LLM context
 *    - Types: thinking, executing, executed, retrying, error
 */
export class PageAgentCore extends EventTarget {
	readonly id = uid()
	readonly config: PageAgentConfig & { maxSteps: number }
	readonly tools: typeof tools
	/** PageController for DOM operations */
	readonly pageController: PageController

	task = ''
	taskId = ''
	/** History events */
	history: HistoricalEvent[] = []
	/** Whether this agent has been disposed */
	disposed = false

	/**
	 * Callback for when agent needs user input (ask_user tool)
	 * If not set, ask_user tool will be disabled
	 * @example onAskUser: (q) => window.prompt(q) || ''
	 */
	onAskUser?: (question: string) => Promise<string>

	#status: AgentStatus = 'idle'
	#llm: LLM
	#abortController = new AbortController()
	#observations: string[] = []

	/** internal states during a single task execution */
	#states = {
		/** Accumulated wait time in seconds */
		totalWaitTime: 0,
		/** For detecting navigation */
		lastURL: '',
		/** Browser state */
		browserState: null as BrowserState | null,
	}

	constructor(config: PageAgentConfig & { pageController: PageController }) {
		super()

		this.config = { ...config, maxSteps: config.maxSteps || DEFAULT_MAX_STEPS }

		this.#llm = new LLM(this.config)
		this.tools = new Map(tools)
		this.pageController = config.pageController

		// Listen to LLM retry events
		this.#llm.addEventListener('retry', (e) => {
			const { attempt, maxAttempts } = (e as CustomEvent).detail
			this.#emitActivity({ type: 'retrying', attempt, maxAttempts })
			// Also push to history for panel rendering
			this.history.push({
				type: 'retry',
				message: `LLM retry attempt ${attempt} of ${maxAttempts}`,
				attempt,
				maxAttempts,
			})
			this.#emitHistoryChange()
		})
		this.#llm.addEventListener('error', (e) => {
			const error = (e as CustomEvent).detail.error as Error | InvokeError
			if ((error as any)?.rawError?.name === 'AbortError') return
			const message = String(error)
			this.#emitActivity({ type: 'error', message })
			// Also push to history for panel rendering
			this.history.push({
				type: 'error',
				message,
				rawResponse: (error as InvokeError).rawResponse,
			})
			this.#emitHistoryChange()
		})

		if (this.config.customTools) {
			for (const [name, tool] of Object.entries(this.config.customTools)) {
				if (tool === null) {
					this.tools.delete(name)
					continue
				}
				this.tools.set(name, tool)
			}
		}

		if (!this.config.experimentalScriptExecutionTool) {
			this.tools.delete('execute_javascript')
		}
	}

	/** Get current agent status */
	get status(): AgentStatus {
		return this.#status
	}

	/** Emit statuschange event */
	#emitStatusChange(): void {
		this.dispatchEvent(new Event('statuschange'))
	}

	/** Emit historychange event */
	#emitHistoryChange(): void {
		this.dispatchEvent(new Event('historychange'))
	}

	/**
	 * Emit activity event - for transient UI feedback
	 * @param activity - Current agent activity
	 */
	#emitActivity(activity: AgentActivity): void {
		this.dispatchEvent(new CustomEvent('activity', { detail: activity }))
	}

	/** Update status and emit event */
	#setStatus(status: AgentStatus): void {
		if (this.#status !== status) {
			this.#status = status
			this.#emitStatusChange()
		}
	}

	/**
	 * Push a observation message to the history event stream.
	 * This will be visible in <agent_history> and remain persistent in memory across steps.
	 * @experimental @internal
	 * @note history change will be emitted before next step starts
	 */
	pushObservation(content: string): void {
		this.#observations.push(content)
	}

	/** Stop the current task. Agent remains reusable. */
	stop() {
		this.pageController.cleanUpHighlights()
		this.pageController.hideMask()
		this.#abortController.abort()
	}

	async execute(task: string): Promise<ExecutionResult> {
		if (this.disposed) throw new Error('PageAgent has been disposed. Create a new instance.')
		if (!task) throw new Error('Task is required')
		this.task = task
		this.taskId = uid()

		// Disable ask_user tool if onAskUser is not set
		if (!this.onAskUser) {
			this.tools.delete('ask_user')
		}

		const onBeforeStep = this.config.onBeforeStep
		const onAfterStep = this.config.onAfterStep
		const onBeforeTask = this.config.onBeforeTask
		const onAfterTask = this.config.onAfterTask

		await onBeforeTask?.(this)

		// Show mask
		await this.pageController.showMask()

		if (this.#abortController) {
			this.#abortController.abort()
			this.#abortController = new AbortController()
		}

		this.history = []
		this.#setStatus('running')
		this.#emitHistoryChange()

		// Reset internal states
		this.#states = { totalWaitTime: 0, lastURL: '', browserState: null }

		let step = 0

		while (true) {
			try {
				console.group(`step: ${step}`)

				await onBeforeStep?.(this, step)

				// observe

				console.log(chalk.blue.bold('👀 Observing...'))

				this.#states.browserState = await this.pageController.getBrowserState()
				await this.#handleObservations(step)

				// assemble prompts

				const messages = [
					{ role: 'system' as const, content: this.#getSystemPrompt() },
					{ role: 'user' as const, content: await this.#assembleUserPrompt() },
				]

				const macroTool = { AgentOutput: this.#packMacroTool() }

				// invoke LLM

				console.log(chalk.blue.bold('🧠 Thinking...'))
				this.#emitActivity({ type: 'thinking' })

				const result = await this.#llm.invoke(messages, macroTool, this.#abortController.signal, {
					toolChoiceName: 'AgentOutput',
					normalizeResponse: (res) => normalizeResponse(res, this.tools),
				})

				// assemble history

				const macroResult = result.toolResult as MacroToolResult
				const input = macroResult.input
				const output = macroResult.output
				const reflection: Partial<AgentReflection> = {
					evaluation_previous_goal: input.evaluation_previous_goal,
					memory: input.memory,
					next_goal: input.next_goal,
				}
				const actionName = Object.keys(input.action)[0]
				const action: AgentStepEvent['action'] = {
					name: actionName,
					input: input.action[actionName],
					output: output,
				}

				this.history.push({
					type: 'step',
					stepIndex: step,
					reflection,
					action,
					usage: result.usage,
					rawResponse: result.rawResponse,
					rawRequest: result.rawRequest,
				} as AgentStepEvent)
				this.#emitHistoryChange()

				//

				await onAfterStep?.(this, this.history)

				console.groupEnd()

				// finish task if done

				if (actionName === 'done') {
					const success = action.input?.success ?? false
					const text = action.input?.text || 'no text provided'
					console.log(chalk.green.bold('Task completed'), success, text)
					this.#onDone(success)
					const result: ExecutionResult = {
						success,
						data: text,
						history: this.history,
					}
					await onAfterTask?.(this, result)
					return result
				}
			} catch (error: unknown) {
				console.groupEnd() // to prevent nested groups
				const isAbortError = (error as any)?.rawError?.name === 'AbortError'

				console.error('Task failed', error)
				const errorMessage = isAbortError ? 'Task stopped' : String(error)
				this.#emitActivity({ type: 'error', message: errorMessage })
				this.history.push({ type: 'error', message: errorMessage, rawResponse: error })
				this.#emitHistoryChange()
				this.#onDone(false)
				const result: ExecutionResult = {
					success: false,
					data: errorMessage,
					history: this.history,
				}
				await onAfterTask?.(this, result)
				return result
			}

			step++
			if (step > this.config.maxSteps) {
				const errorMessage = 'Step count exceeded maximum limit'
				this.history.push({ type: 'error', message: errorMessage })
				this.#emitHistoryChange()
				this.#onDone(false)
				const result: ExecutionResult = {
					success: false,
					data: errorMessage,
					history: this.history,
				}
				await onAfterTask?.(this, result)
				return result
			}
		}
	}

	/**
	 * Merge all tools into a single MacroTool with the following input:
	 * - thinking: string
	 * - evaluation_previous_goal: string
	 * - memory: string
	 * - next_goal: string
	 * - action: { toolName: toolInput }
	 * where action must be selected from tools defined in this.tools
	 */
	#packMacroTool(): Tool<MacroToolInput, MacroToolResult> {
		const tools = this.tools

		const actionSchemas = Array.from(tools.entries()).map(([toolName, tool]) => {
			return z.object({ [toolName]: tool.inputSchema }).describe(tool.description)
		})

		const actionSchema = z.union(actionSchemas as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]])

		const macroToolSchema = z.object({
			// thinking: z.string().optional(),
			evaluation_previous_goal: z.string().optional(),
			memory: z.string().optional(),
			next_goal: z.string().optional(),
			action: actionSchema,
		})

		return {
			description: 'You MUST call this tool every step!',
			inputSchema: macroToolSchema as z.ZodType<MacroToolInput>,
			execute: async (input: MacroToolInput): Promise<MacroToolResult> => {
				// abort
				if (this.#abortController.signal.aborted) throw new Error('AbortError')

				console.log(chalk.blue.bold('MacroTool input'), input)
				const action = input.action

				const toolName = Object.keys(action)[0]
				const toolInput = action[toolName]

				// Build reflection text, only include non-empty fields
				const reflectionLines: string[] = []
				if (input.evaluation_previous_goal)
					reflectionLines.push(`✅: ${input.evaluation_previous_goal}`)
				if (input.memory) reflectionLines.push(`💾: ${input.memory}`)
				if (input.next_goal) reflectionLines.push(`🎯: ${input.next_goal}`)

				const reflectionText = reflectionLines.length > 0 ? reflectionLines.join('\n') : ''

				if (reflectionText) {
					console.log(reflectionText)
				}

				// Find the corresponding tool
				const tool = tools.get(toolName)
				assert(tool, `Tool ${toolName} not found`)

				console.log(chalk.blue.bold(`Executing tool: ${toolName}`), toolInput)

				// Emit executing activity
				this.#emitActivity({ type: 'executing', tool: toolName, input: toolInput })

				const startTime = Date.now()

				// Execute tool, bind `this` to PageAgent
				const result = await tool.execute.bind(this)(toolInput)

				const duration = Date.now() - startTime
				console.log(chalk.green.bold(`Tool (${toolName}) executed for ${duration}ms`), result)

				// Emit executed activity
				this.#emitActivity({
					type: 'executed',
					tool: toolName,
					input: toolInput,
					output: result,
					duration,
				})

				// counting wait time
				if (toolName === 'wait') {
					this.#states.totalWaitTime += toolInput?.seconds || 0
				} else {
					this.#states.totalWaitTime = 0
				}

				// Return structured result
				return {
					input,
					output: result,
				}
			},
		}
	}

	/**
	 * Get system prompt, dynamically replace language settings based on configured language
	 */
	#getSystemPrompt(): string {
		if (this.config.customSystemPrompt) {
			return this.config.customSystemPrompt
		}

		const targetLanguage = this.config.language === 'zh-CN' ? '中文' : 'English'
		const systemPrompt = SYSTEM_PROMPT.replace(
			/Default working language: \*\*.*?\*\*/,
			`Default working language: **${targetLanguage}**`
		)

		return systemPrompt
	}

	/**
	 * Get instructions from config
	 */
	async #getInstructions(): Promise<string> {
		const { instructions } = this.config
		if (!instructions) return ''

		const systemInstructions = instructions.system?.trim()
		let pageInstructions: string | undefined

		const url = this.#states.browserState?.url || ''
		if (instructions.getPageInstructions && url) {
			try {
				pageInstructions = instructions.getPageInstructions(url)?.trim()
			} catch (error) {
				console.error(
					chalk.red('[PageAgent] Failed to execute getPageInstructions callback:'),
					error
				)
			}
		}
		if (!systemInstructions && !pageInstructions) return ''

		let result = '<instructions>\n'

		if (systemInstructions) {
			result += `<system_instructions>\n${systemInstructions}\n</system_instructions>\n`
		}

		if (pageInstructions) {
			result += `<page_instructions>\n${pageInstructions}\n</page_instructions>\n`
		}

		result += '</instructions>\n\n'

		return result
	}

	/**
	 * Generate system observations before each step
	 * @todo loop detection
	 * @todo console error
	 */
	async #handleObservations(step: number): Promise<void> {
		// Accumulated wait time warning
		if (this.#states.totalWaitTime >= 3) {
			this.pushObservation(
				`You have waited ${this.#states.totalWaitTime} seconds accumulatively. DO NOT wait any longer unless you have a good reason.`
			)
		}

		// Detect URL change
		const currentURL = this.#states.browserState?.url || ''
		if (currentURL !== this.#states.lastURL) {
			this.pushObservation(`Page navigated to → ${currentURL}`)
			this.#states.lastURL = currentURL
			await waitFor(0.5) // wait for page to stabilize
		}

		// Remaining steps warning
		const remaining = this.config.maxSteps - step
		if (remaining === 5) {
			this.pushObservation(
				`⚠️ Only ${remaining} steps remaining. Consider wrapping up or calling done with partial results.`
			)
		} else if (remaining === 2) {
			this.pushObservation(
				`⚠️ Critical: Only ${remaining} steps left! You must finish the task or call done immediately.`
			)
		}

		// Push observations to history and emit
		if (this.#observations.length > 0) {
			for (const content of this.#observations) {
				this.history.push({ type: 'observation', content })
				console.log(chalk.cyan('Observation:'), content)
			}
			this.#observations = []
			this.#emitHistoryChange()
		}
	}

	async #assembleUserPrompt(): Promise<string> {
		const browserState = this.#states.browserState!

		let prompt = ''

		// <instructions> (optional)

		prompt += await this.#getInstructions()

		// <agent_state>
		//  - <user_request>
		//  - <step_info>
		// <agent_state>

		const stepCount = this.history.filter((e) => e.type === 'step').length

		prompt += '<agent_state>\n'
		prompt += '<user_request>\n'
		prompt += `${this.task}\n`
		prompt += '</user_request>\n'
		prompt += '<step_info>\n'
		prompt += `Step ${stepCount + 1} of ${this.config.maxSteps} max possible steps\n`
		prompt += `Current time: ${new Date().toLocaleString()}\n`
		prompt += '</step_info>\n'
		prompt += '</agent_state>\n\n'

		// <agent_history>
		//  - <step_N> for steps
		//  - <sys> for observations and system messages

		prompt += '<agent_history>\n'

		let stepIndex = 0
		for (const event of this.history) {
			if (event.type === 'step') {
				stepIndex++
				prompt += `<step_${stepIndex}>\n`
				prompt += `Evaluation of Previous Step: ${event.reflection.evaluation_previous_goal}\n`
				prompt += `Memory: ${event.reflection.memory}\n`
				prompt += `Next Goal: ${event.reflection.next_goal}\n`
				prompt += `Action Results: ${event.action.output}\n`
				prompt += `</step_${stepIndex}>\n`
			} else if (event.type === 'observation') {
				prompt += `<sys>${event.content}</sys>\n`
			} else if (event.type === 'user_takeover') {
				prompt += `<sys>User took over control and made changes to the page</sys>\n`
			} else if (event.type === 'error') {
				// Error events are mainly for panel rendering, not included in LLM context
				// to avoid polluting the agent's reasoning with transient errors
			}
		}

		prompt += '</agent_history>\n\n'

		// <browser_state>

		let pageContent = browserState.content
		if (this.config.transformPageContent) {
			pageContent = await this.config.transformPageContent(pageContent)
		}

		prompt += '<browser_state>\n'
		prompt += browserState.header + '\n'
		prompt += pageContent + '\n'
		prompt += browserState.footer + '\n\n'
		prompt += '</browser_state>\n\n'

		return prompt
	}

	#onDone(success = true) {
		this.pageController.cleanUpHighlights()
		this.pageController.hideMask() // No await - fire and forget
		this.#setStatus(success ? 'completed' : 'error')
		this.#abortController.abort()
	}

	dispose() {
		console.log('Disposing PageAgent...')
		this.disposed = true
		this.pageController.dispose()
		// this.history = []
		this.#abortController.abort()

		// Emit dispose event for UI cleanup
		this.dispatchEvent(new Event('dispose'))

		this.config.onDispose?.(this)
	}
}
