/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { tool } from 'ai'
import type { LanguageModelUsage, ToolSet } from 'ai'
import chalk from 'chalk'
import zod from 'zod'

import type { PageAgentConfig } from './config'
import { MACRO_TOOL_NAME, MAX_STEPS, VIEWPORT_EXPANSION } from './config/constants'
import * as dom from './dom'
import { FlatDomTree, InteractiveElementDomNode } from './dom/dom_tree/type'
import { getPageInfo } from './dom/getPageInfo'
import { I18n } from './i18n'
import { LLM } from './llms'
import { patchReact } from './patches/react'
import SYSTEM_PROMPT from './prompts/system_prompt.md?raw'
import { tools } from './tools'
import { Panel, getToolCompletedText, getToolExecutingText } from './ui/Panel'
import { SimulatorMask } from './ui/SimulatorMask'
import { trimLines, uid, waitUntil } from './utils'
import { assert } from './utils/assert'
import { getEventBus } from './utils/bus'

export type { PageAgentConfig }

export interface AgentBrain {
	// thinking?: string
	evaluation_previous_goal: string
	memory: string
	next_goal: string
}

export interface AgentHistory {
	brain: AgentBrain
	action: {
		name: string
		input: any
		output: any
	}
	usage: LanguageModelUsage
}

export interface ExecutionResult {
	success: boolean
	data: string
	history: AgentHistory[]
}

export class PageAgent extends EventTarget {
	config: PageAgentConfig
	id = uid()
	bus = getEventBus(this.id)
	i18n: I18n
	panel: Panel
	paused = false
	disposed = false
	task = ''

	#llm: LLM
	#totalWaitTime = 0
	#abortController = new AbortController()

	/** Corresponds to eval_page in browser-use */
	flatTree: FlatDomTree | null = null
	/**
	 * All highlighted index-mapped interactive elements
	 * Corresponds to DOMState.selector_map in browser-use
	 */
	selectorMap = new Map<number, InteractiveElementDomNode>()
	/** highlight index -> element text */
	elementTextMap = new Map<number, string>()
	/** Corresponds to clickable_elements_to_string in browser-use */
	simplifiedHTML = '<EMPTY>'
	/** last time the tree was updated */
	lastTimeUpdate = 0

	/** Corresponds to actions in browser-use */
	tools = new Map(tools)
	/** Fullscreen mask */
	mask = new SimulatorMask()
	/** History records */
	history: AgentHistory[] = []

	constructor(config: PageAgentConfig = {}) {
		super()

		this.config = config
		this.#llm = new LLM(this.config, this.id)
		this.i18n = new I18n(this.config.language)
		this.panel = new Panel(this)

		patchReact(this)
	}

	/**
	 * @todo maybe return something?
	 */
	async execute(task: string): Promise<ExecutionResult> {
		if (!task) throw new Error('Task is required')
		this.task = task

		// Show mask and panel
		this.mask.show()

		this.bus.emit('panel:show')
		this.bus.emit('panel:reset')

		this.bus.emit('panel:update', {
			type: 'input',
			displayText: task,
		})

		if (this.#abortController) {
			this.#abortController.abort()
			this.#abortController = new AbortController()
		}

		this.history = []

		try {
			let step = 0

			while (true) {
				console.group(`step: ${step + 1}`)

				// abort
				if (this.#abortController.signal.aborted) throw new Error('AbortError')
				// pause
				await waitUntil(() => !this.paused)

				// Update status to thinking
				console.log(chalk.blue('Thinking...'))
				this.bus.emit('panel:update', {
					type: 'thinking',
					displayText: this.i18n.t('ui.panel.thinking'),
				})

				const result = await this.#llm.invoke(
					[
						{
							role: 'system',
							content: this.#getSystemPrompt(),
						},
						{
							role: 'user',
							content: this.#assembleUserPrompt(),
						},
					],
					// tools,
					this.#packMacroTool(),
					this.#abortController.signal
				)

				const toolResult = result.toolResult
				const input = toolResult.input
				const output = toolResult.output
				const brain = {
					thinking: input.thinking,
					evaluation_previous_goal: input.evaluation_previous_goal,
					memory: input.memory,
					next_goal: input.next_goal,
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

				step++
				if (step > MAX_STEPS) {
					this.#onDone('Step count exceeded maximum limit', false)
					return {
						success: false,
						data: 'Step count exceeded maximum limit',
						history: this.history,
					}
				}
				if (actionName === 'done') {
					const success = action.input.success || false
					const text = action.input.text || 'no text provided'
					console.log(chalk.green.bold('Task completed'), success, text)
					this.#onDone(text, success)
					return {
						success,
						data: text,
						history: this.history,
					}
				}
			}
		} catch (error: unknown) {
			console.error('Task failed', error)
			this.#onDone(String(error), false)
			return {
				success: false,
				data: String(error),
				history: this.history,
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
	#packMacroTool(): ToolSet {
		const tools = this.tools
		// discriminated version
		// @note Success rate ~0, model seems unable to understand discriminated union

		// // Create discriminated union schemas from tools
		// const actionSchemas = Array.from(tools.entries()).map(([toolName, tool]) => {
		// 	return zod.object({
		// 		name: zod.literal(toolName),
		// 		input: tool.inputSchema,
		// 	})
		// })

		// // Ensure at least one tool exists
		// assert(actionSchemas.length, 'No tools available to create macro tool')

		// const actionSchema = zod.discriminatedUnion('name', actionSchemas as any)

		// union version
		const actionSchemas = Array.from(tools.entries()).map(([toolName, tool]) => {
			return zod.object({
				[toolName]: tool.inputSchema,
			})
		})

		const actionSchema = zod.union(actionSchemas)

		return {
			[MACRO_TOOL_NAME]: tool({
				// description: 'Output the result of the agent',
				inputSchema: zod.object({
					// thinking: zod.string().optional(),
					evaluation_previous_goal: zod.string().optional(),
					memory: zod.string().optional(),
					next_goal: zod.string().optional(),
					action: actionSchema,
				}),
				execute: async (input, options) => {
					// abort
					if (this.#abortController.signal.aborted) throw new Error('AbortError')
					// pause
					await waitUntil(() => !this.paused)

					console.log(chalk.blue.bold('MacroTool execute'), input)
					const action = input.action!

					const toolName = Object.keys(action)[0]
					const toolInput = action[toolName]
					const brain = trimLines(`✅: ${input.evaluation_previous_goal}
						💾: ${input.memory}
						🎯: ${input.next_goal}
					`)

					console.log(brain)
					this.bus.emit('panel:update', {
						type: 'thinking',
						displayText: brain,
					})

					// Find the corresponding tool
					const tool = tools.get(toolName)
					assert(tool, `Tool ${toolName} not found. (@note should have been caught before this!!!)`)

					console.log(chalk.blue.bold(`Executing tool: ${toolName}`), toolInput, options)
					this.bus.emit('panel:update', {
						type: 'tool_executing',
						toolName,
						toolArgs: toolInput,
						displayText: getToolExecutingText(toolName, toolInput, this.i18n),
					})

					const startTime = Date.now()

					// Execute tool, passing options parameter
					let result = await tool.execute!.bind(this)(toolInput, options)

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
					const displayResult = getToolCompletedText(toolName, toolInput, this.i18n)
					if (displayResult)
						this.bus.emit('panel:update', {
							type: 'tool_executing',
							toolName,
							toolArgs: toolInput,
							toolResult: result,
							displayText: displayResult,
							duration,
						})

					// Wait a moment to let user see the result
					await new Promise((resolve) => setTimeout(resolve, 100))

					return result
				},
			}),
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

	#assembleUserPrompt(): string {
		let prompt = ''

		// <agent_history>
		//  - <step_>

		prompt += '<agent_history>\n'

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

		// <browser_state>

		prompt += this.#getBrowserState()

		return trimLines(prompt)
	}

	#onDone(text: string, success = true) {
		dom.cleanUpHighlights()

		// Update panel status
		this.bus.emit('panel:update', {
			type: success ? 'output' : 'error',
			displayText: text,
		})

		// Task completed
		this.bus.emit('panel:update', {
			type: 'completed',
			displayText: this.i18n.t('ui.panel.taskCompleted'),
		})

		this.mask.hide()

		this.#abortController.abort()
	}

	#getBrowserState(): string {
		const pageUrl = window.location.href
		const pageTitle = document.title
		const pi = getPageInfo()

		this.#updateTree()

		let prompt = trimLines(`<browser_state>
			Current Page: [${pageTitle}](${pageUrl})

			Page info: ${pi.viewport_width}x${pi.viewport_height}px viewport, ${pi.page_width}x${pi.page_height}px total page size, ${pi.pages_above.toFixed(1)} pages above, ${pi.pages_below.toFixed(1)} pages below, ${pi.total_pages.toFixed(1)} total pages, at ${(pi.current_page_position * 100).toFixed(0)}% of page

			${VIEWPORT_EXPANSION === -1 ? 'Interactive elements from top layer of the current page (full page):' : 'Interactive elements from top layer of the current page inside the viewport:'}

		`)

		// Page header info
		const has_content_above = pi.pixels_above > 4
		if (has_content_above && VIEWPORT_EXPANSION !== -1) {
			prompt += `... ${pi.pixels_above} pixels above (${pi.pages_above.toFixed(1)} pages) - scroll to see more ...\n`
		} else {
			prompt += `[Start of page]\n`
		}

		// Current viewport info
		prompt += this.simplifiedHTML
		prompt += `\n`

		// Page footer info
		const has_content_below = pi.pixels_below > 4
		if (has_content_below && VIEWPORT_EXPANSION !== -1) {
			prompt += `... ${pi.pixels_below} pixels below (${pi.pages_below.toFixed(1)} pages) - scroll to see more ...\n`
		} else {
			prompt += `[End of page]\n`
		}

		prompt += `</browser_state>\n`

		return prompt
	}

	/**
	 * Update document tree
	 */
	#updateTree() {
		this.dispatchEvent(new Event('beforeUpdate'))
		this.lastTimeUpdate = Date.now()
		dom.cleanUpHighlights()
		this.mask.wrapper.style.pointerEvents = 'none'
		this.flatTree = dom.getFlatTree({
			...this.config,
			interactiveBlacklist: [
				...(this.config.interactiveBlacklist || []),
				...document.querySelectorAll('[data-page-agent-not-interactive]').values(),
			],
		})
		this.mask.wrapper.style.pointerEvents = 'auto'
		this.simplifiedHTML = dom.flatTreeToString(this.flatTree, this.config.include_attributes)
		this.selectorMap.clear()
		this.selectorMap = dom.getSelectorMap(this.flatTree)
		this.elementTextMap.clear()
		this.elementTextMap = dom.getElementTextMap(this.simplifiedHTML)
		this.dispatchEvent(new Event('afterUpdate'))
	}

	dispose() {
		console.log('Disposing PageAgent...')
		this.disposed = true
		dom.cleanUpHighlights()
		this.flatTree = null
		this.selectorMap.clear()
		this.elementTextMap.clear()
		this.panel.dispose()
		this.mask.dispose()
		this.history = []
		this.#abortController.abort('PageAgent disposed')
	}
}
