/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { LLM, type Tool } from '@page-agent/llms'
import { PageController } from '@page-agent/page-controller'
import { Panel, SimulatorMask } from '@page-agent/ui'
import chalk from 'chalk'
import zod from 'zod'

import type { PageAgentConfig } from './config'
import { MAX_STEPS } from './config/constants'
import SYSTEM_PROMPT from './prompts/system_prompt.md?raw'
import { tools } from './tools'
import { normalizeResponse, trimLines, uid, waitUntil } from './utils'
import { assert } from './utils/assert'

/**
 * Agent brain state - the reflection-before-action model
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

export type { PageAgentConfig }
export { tool, type PageAgentTool } from './tools'

export interface AgentHistory {
	brain: Partial<AgentReflection>
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
}

export interface ExecutionResult {
	success: boolean
	data: string
	history: AgentHistory[]
}

export class PageAgent extends EventTarget {
	config: PageAgentConfig
	id = uid()
	panel: Panel
	tools: typeof tools
	paused = false
	disposed = false
	task = ''
	taskId = ''

	#llm: LLM
	#totalWaitTime = 0
	#abortController = new AbortController()
	#llmRetryListener: ((e: Event) => void) | null = null
	#llmErrorListener: ((e: Event) => void) | null = null
	#beforeUnloadListener: ((e: Event) => void) | null = null

	/** PageController for DOM operations */
	pageController: PageController

	/** Fullscreen mask */
	mask = new SimulatorMask()
	/** History records */
	history: AgentHistory[] = []

	constructor(config: PageAgentConfig = {}) {
		super()

		this.config = config
		this.#llm = new LLM(this.config)
		this.panel = new Panel({
			language: this.config.language,
			onExecuteTask: (task) => this.execute(task),
			onStop: () => this.dispose(),
			onPauseToggle: () => {
				this.paused = !this.paused
				return this.paused
			},
			getPaused: () => this.paused,
		})
		this.tools = new Map(tools)

		// Initialize PageController with config
		this.pageController = new PageController(this.config)

		// Listen to LLM events
		this.#llmRetryListener = (e) => {
			const { current, max } = (e as CustomEvent).detail
			this.panel.update({ type: 'retry', current, max })
		}
		this.#llmErrorListener = (e) => {
			const { error } = (e as CustomEvent).detail
			this.panel.update({ type: 'error', message: `step failed: ${error.message}` })
		}
		this.#llm.addEventListener('retry', this.#llmRetryListener)
		this.#llm.addEventListener('error', this.#llmErrorListener)

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

		this.#beforeUnloadListener = (e) => {
			if (!this.disposed) this.dispose('PAGE_UNLOADING')
		}
		window.addEventListener('beforeunload', this.#beforeUnloadListener)
	}

	async execute(task: string): Promise<ExecutionResult> {
		if (!task) throw new Error('Task is required')
		this.task = task
		this.taskId = uid()

		const onBeforeStep = this.config.onBeforeStep || (() => void 0)
		const onAfterStep = this.config.onAfterStep || (() => void 0)
		const onBeforeTask = this.config.onBeforeTask || (() => void 0)
		const onAfterTask = this.config.onAfterTask || (() => void 0)

		await onBeforeTask.call(this)

		// Show mask and panel
		this.mask.show()

		this.panel.show()
		this.panel.reset()

		this.panel.update({ type: 'input', task: this.task })

		if (this.#abortController) {
			this.#abortController.abort()
			this.#abortController = new AbortController()
		}

		this.history = []

		try {
			let step = 0

			while (true) {
				await onBeforeStep.call(this, step)

				console.group(`step: ${step}`)

				// abort
				if (this.#abortController.signal.aborted) throw new Error('AbortError')
				// pause
				await waitUntil(() => !this.paused)

				// Update status to thinking
				console.log(chalk.blue('Thinking...'))
				this.panel.update({ type: 'thinking' })

				const result = await this.#llm.invoke(
					[
						{
							role: 'system',
							content: this.#getSystemPrompt(),
						},
						{
							role: 'user',
							content: await this.#assembleUserPrompt(),
						},
					],
					{ AgentOutput: this.#packMacroTool() },
					this.#abortController.signal,
					{
						toolChoiceName: 'AgentOutput',
						normalizeResponse,
					}
				)

				const macroResult = result.toolResult as MacroToolResult
				const input = macroResult.input
				const output = macroResult.output
				const brain = {
					evaluation_previous_goal: input.evaluation_previous_goal || '',
					memory: input.memory || '',
					next_goal: input.next_goal || '',
				}
				const actionName = Object.keys(input.action)[0]
				const action = {
					name: actionName,
					input: input.action[actionName],
					output: output,
				}

				this.history.push({
					brain,
					action,
					usage: result.usage,
				})

				console.log(chalk.green('Step finished:'), actionName)
				console.groupEnd()

				await onAfterStep.call(this, step, this.history)

				step++
				if (step > MAX_STEPS) {
					this.#onDone('Step count exceeded maximum limit', false)
					const result: ExecutionResult = {
						success: false,
						data: 'Step count exceeded maximum limit',
						history: this.history,
					}
					await onAfterTask.call(this, result)
					return result
				}
				if (actionName === 'done') {
					const success = action.input?.success ?? false
					const text = action.input?.text || 'no text provided'
					console.log(chalk.green.bold('Task completed'), success, text)
					this.#onDone(text, success)
					const result: ExecutionResult = {
						success,
						data: text,
						history: this.history,
					}
					await onAfterTask.call(this, result)
					return result
				}
			}
		} catch (error: unknown) {
			console.error('Task failed', error)
			this.#onDone(String(error), false)
			const result: ExecutionResult = {
				success: false,
				data: String(error),
				history: this.history,
			}
			await onAfterTask.call(this, result)
			return result
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
			return zod.object({ [toolName]: tool.inputSchema }).describe(tool.description)
		})

		const actionSchema = zod.union(
			actionSchemas as unknown as [zod.ZodType, zod.ZodType, ...zod.ZodType[]]
		)

		const macroToolSchema = zod.object({
			// thinking: zod.string().optional(),
			evaluation_previous_goal: zod.string().optional(),
			memory: zod.string().optional(),
			next_goal: zod.string().optional(),
			action: actionSchema,
		})

		return {
			description: 'You MUST call this tool every step. Outputs your reflections and next action.',
			inputSchema: macroToolSchema as zod.ZodType<MacroToolInput>,
			execute: async (input: MacroToolInput): Promise<MacroToolResult> => {
				// abort
				if (this.#abortController.signal.aborted) throw new Error('AbortError')
				// pause
				await waitUntil(() => !this.paused)

				console.log(chalk.blue.bold('MacroTool execute'), input)
				const action = input.action

				const toolName = Object.keys(action)[0]
				const toolInput = action[toolName]
				const brain = trimLines(`✅: ${input.evaluation_previous_goal}
						💾: ${input.memory}
						🎯: ${input.next_goal}
					`)

				console.log(brain)
				this.panel.update({ type: 'thinking', text: brain })

				// Find the corresponding tool
				const tool = tools.get(toolName)
				assert(tool, `Tool ${toolName} not found. (@note should have been caught before this!!!)`)

				console.log(chalk.blue.bold(`Executing tool: ${toolName}`), toolInput)
				this.panel.update({ type: 'toolExecuting', toolName, args: toolInput })

				const startTime = Date.now()

				// Execute tool, bind `this` to PageAgent
				let result = await tool.execute.bind(this)(toolInput)

				const duration = Date.now() - startTime
				console.log(chalk.green.bold(`Tool (${toolName}) executed for ${duration}ms`), result)

				if (toolName === 'wait') {
					this.#totalWaitTime += Math.round(toolInput.seconds + duration / 1000)
					result += `\n<sys> You have waited ${this.#totalWaitTime} seconds accumulatively.`
					if (this.#totalWaitTime >= 3)
						result += '\nDo NOT wait any longer unless you have a good reason.\n'
					result += '</sys>'
				} else {
					// For other tools, reset wait time
					this.#totalWaitTime = 0
				}

				// Briefly display execution result
				this.panel.update({
					type: 'toolCompleted',
					toolName,
					args: toolInput,
					result,
					duration,
				})

				// Wait a moment to let user see the result
				await new Promise((resolve) => setTimeout(resolve, 100))

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
		let systemPrompt = SYSTEM_PROMPT

		const targetLanguage = this.config.language === 'zh-CN' ? '中文' : 'English'
		systemPrompt = systemPrompt.replace(
			/Default working language: \*\*.*?\*\*/,
			`Default working language: **${targetLanguage}**`
		)

		return systemPrompt
	}

	/**
	 * Get instructions from config and format as XML block
	 */
	async #getInstructions(): Promise<string> {
		const { instructions } = this.config
		if (!instructions) return ''

		const systemInstructions = instructions.system?.trim()
		const url = await this.pageController.getCurrentUrl()
		let pageInstructions: string | undefined

		if (instructions.getPageInstructions) {
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

	async #assembleUserPrompt(): Promise<string> {
		let prompt = ''

		// <instructions> (optional)
		prompt += await this.#getInstructions()

		// <agent_state>
		//  - <user_request>
		//  - <step_info>
		// <agent_state>

		prompt += `<agent_state>
			<user_request>
			${this.task}
			</user_request>
			<step_info>
			Step ${this.history.length + 1} of ${MAX_STEPS} max possible steps
			Current date and time: ${new Date().toISOString()}
			</step_info>
			</agent_state>
		`

		// <agent_history>
		//  - <step_>

		prompt += '\n<agent_history>\n'

		this.history.forEach((history, index) => {
			prompt += `<step_${index + 1}>
				Evaluation of Previous Step: ${history.brain.evaluation_previous_goal}
				Memory: ${history.brain.memory}
				Next Goal: ${history.brain.next_goal}
				Action Results: ${history.action.output}
				</step_${index + 1}>
			`
		})

		prompt += '</agent_history>\n\n'

		// <browser_state>

		prompt += await this.#getBrowserState()

		return trimLines(prompt)
	}

	#onDone(text: string, success = true) {
		this.pageController.cleanUpHighlights()

		// Update panel status
		if (success) {
			this.panel.update({ type: 'output', text })
		} else {
			this.panel.update({ type: 'error', message: text })
		}

		// Task completed
		this.panel.update({ type: 'completed' })

		this.mask.hide()

		this.#abortController.abort()
	}

	async #getBrowserState(): Promise<string> {
		const pageUrl = await this.pageController.getCurrentUrl()
		const pageTitle = await this.pageController.getPageTitle()
		const pi = await this.pageController.getPageInfo()
		const viewportExpansion = await this.pageController.getViewportExpansion()

		this.mask.wrapper.style.pointerEvents = 'none'
		await this.pageController.updateTree()
		this.mask.wrapper.style.pointerEvents = 'auto'

		let simplifiedHTML = await this.pageController.getSimplifiedHTML()

		if (this.config.transformPageContent) {
			simplifiedHTML = await this.config.transformPageContent(simplifiedHTML)
		}

		let prompt = trimLines(`<browser_state>
			Current Page: [${pageTitle}](${pageUrl})

			Page info: ${pi.viewport_width}x${pi.viewport_height}px viewport, ${pi.page_width}x${pi.page_height}px total page size, ${pi.pages_above.toFixed(1)} pages above, ${pi.pages_below.toFixed(1)} pages below, ${pi.total_pages.toFixed(1)} total pages, at ${(pi.current_page_position * 100).toFixed(0)}% of page

			${viewportExpansion === -1 ? 'Interactive elements from top layer of the current page (full page):' : 'Interactive elements from top layer of the current page inside the viewport:'}

		`)

		// Page header info
		const has_content_above = pi.pixels_above > 4
		if (has_content_above && viewportExpansion !== -1) {
			prompt += `... ${pi.pixels_above} pixels above (${pi.pages_above.toFixed(1)} pages) - scroll to see more ...\n`
		} else {
			prompt += `[Start of page]\n`
		}

		// Current viewport info
		prompt += simplifiedHTML
		prompt += `\n`

		// Page footer info
		const has_content_below = pi.pixels_below > 4
		if (has_content_below && viewportExpansion !== -1) {
			prompt += `... ${pi.pixels_below} pixels below (${pi.pages_below.toFixed(1)} pages) - scroll to see more ...\n`
		} else {
			prompt += `[End of page]\n`
		}

		prompt += `</browser_state>\n`

		return prompt
	}

	dispose(reason?: string) {
		console.log('Disposing PageAgent...')
		this.disposed = true
		this.pageController.dispose()
		this.panel.dispose()
		this.mask.dispose()
		this.history = []
		this.#abortController.abort(reason ?? 'PageAgent disposed')

		// Clean up LLM event listeners
		if (this.#llmRetryListener) {
			this.#llm.removeEventListener('retry', this.#llmRetryListener)
			this.#llmRetryListener = null
		}
		if (this.#llmErrorListener) {
			this.#llm.removeEventListener('error', this.#llmErrorListener)
			this.#llmErrorListener = null
		}

		// Clean up window event listeners
		if (this.#beforeUnloadListener) {
			window.removeEventListener('beforeunload', this.#beforeUnloadListener)
			this.#beforeUnloadListener = null
		}

		this.config.onDispose?.call(this, reason)
	}
}
