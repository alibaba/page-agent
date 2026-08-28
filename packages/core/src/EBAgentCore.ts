/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { Capability } from '@eb-agent/capabilities'
import { InvokeError, LLM, type Message, type Tool } from '@eb-agent/llms'
import type { BrowserState, PageController } from '@eb-agent/page-controller'
import chalk from 'chalk'
import * as z from 'zod/v4'

import { CapabilityManager, type DeveloperToolDefinition } from './capabilities/CapabilityManager'
import SYSTEM_PROMPT from './prompts/system_prompt.md?raw'
import { type EBAgentTool, tools } from './tools'
import type {
	AgentActivity,
	AgentConfig,
	AgentReflection,
	AgentStatus,
	AgentStepEvent,
	ExecuteOptions,
	ExecutionResult,
	HistoricalEvent,
	IdentifyImageResult,
	MacroToolInput,
	MacroToolResult,
} from './types'
import {
	assert,
	fetchLlmsTxt,
	looksNonTerminal,
	normalizeResponse,
	suppress,
	uid,
	waitFor,
} from './utils'

export { tool, type EBAgentTool } from './tools'
export {
	CapabilityManager,
	type CapabilityConfig,
	type DeveloperToolDefinition,
} from './capabilities/CapabilityManager'
export {
	CAPABILITY_TOOL_PREFIX,
	fromCapabilityToolName,
	isCapabilityToolName,
	toCapabilityToolName,
} from './capabilities/bridge'
export { jsonSchemaToZod, zodToJsonSchema } from './capabilities/schema'
export type * from './types'

export type EBAgentCoreConfig = AgentConfig & { pageController: PageController }

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
 * - `statuschange` - Agent status transitions (idle → running → completed/error/stopped)
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
export class EBAgentCore extends EventTarget {
	readonly id = uid()
	readonly config: EBAgentCoreConfig & { maxSteps: number }
	readonly tools: typeof tools
	/** PageController for DOM operations */
	readonly pageController: PageController
	/**
	 * Capability layer: what this application can do, and how each action is carried
	 * out (WebMCP tool, developer-registered function, or generated DOM automation).
	 *
	 * @remarks
	 * The built-in DOM tools above are the compatibility layer, not the ceiling —
	 * when a structured capability exists for an action, the agent prefers it.
	 */
	readonly capabilities: CapabilityManager

	task = ''
	taskId = ''
	/** Image attached to the current task (data URL or http(s) URL), or null if none. Set via `execute(task, { image })`. */
	image: string | null = null
	/** History events */
	history: HistoricalEvent[] = []
	/** Whether this agent has been disposed */
	disposed = false

	/**
	 * Called when the agent needs to ask the user questions.
	 * If unset, the `ask_user` tool will be disabled.
	 * Implementations should reject the promise when `signal` aborts.
	 * `choices` (answer options to present as buttons) and `inputType` (expected
	 * free-form answer type) are hints from the LLM that UIs may honor.
	 * @example onAskUser: (q) => window.prompt(q) || ''
	 */
	onAskUser?: (
		question: string,
		options?: { signal: AbortSignal; choices?: string[]; inputType?: 'text' | 'number' }
	) => Promise<string>

	#status: AgentStatus = 'idle'
	#llm: LLM
	/** Vision-capable LLM used by `identifyImage()`. Same instance as `#llm` unless `visionModel` is configured. */
	#visionLlm: LLM
	/**
	 * Task cancellation primitive: its signal reaches the LLM fetch, tools
	 * (via `ctx.signal`) and async callbacks. Aborted only by `stop`/`dispose`
	 * (during a task) or task setup, always WITHOUT a reason so `signal.reason`
	 * stays a standard `AbortError`.
	 */
	#abortController = new AbortController()
	#observations: { content: string; internal?: boolean }[] = []

	/** Resolves when the current run has fully settled. Awaited by `stop()`. */
	#running: Promise<void> = Promise.resolve()
	#lastResult: ExecutionResult | null = null

	/** internal states during a single task execution */
	#states = {
		/** Accumulated wait time in seconds */
		totalWaitTime: 0,
		/** For detecting navigation */
		lastURL: '',
		/** Browser state */
		browserState: null as BrowserState | null,
		/**
		 * Tools offered to the model this step: the built-in tools plus whatever
		 * capabilities the current page exposes. Snapshotted per step so the schema
		 * the model saw, the validator, and the dispatcher can never disagree.
		 */
		toolset: new Map<string, EBAgentTool>() as Map<string, EBAgentTool>,
	}

	constructor(config: EBAgentCoreConfig) {
		super()

		this.config = { ...config, maxSteps: config.maxSteps ?? 60 }

		this.#llm = new LLM(this.config)
		this.#visionLlm = this.config.visionModel
			? new LLM({ ...this.config, ...this.config.visionModel })
			: this.#llm
		this.tools = new Map(tools)
		this.pageController = config.pageController
		this.capabilities = new CapabilityManager(this, config.capabilities)

		this.#llm.addEventListener('retry', (e) => {
			const { attempt, maxAttempts, lastError } = (e as CustomEvent).detail
			this.#emitActivity({ type: 'retrying', attempt, maxAttempts })
			this.history.push({
				type: 'error',
				message: String(lastError),
				rawResponse: (lastError as InvokeError).rawResponse,
			})
			this.history.push({
				type: 'retry',
				message: `LLM retry attempt ${attempt} of ${maxAttempts}`,
				attempt,
				maxAttempts,
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

	/** Result of the most recent run, or `null` before the first run completes. */
	get lastResult(): ExecutionResult | null {
		return this.#lastResult
	}

	/** Emit statuschange event */
	#emitStatusChange(): void {
		this.dispatchEvent(new Event('statuschange'))
	}

	/** Emit historychange event */
	#emitHistoryChange(pushHistoricalEvent?: HistoricalEvent): void {
		if (pushHistoricalEvent) this.history.push(pushHistoricalEvent)
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
	 * Push an observation message to the history event stream.
	 * This will be visible in <agent_history> and remain persistent in memory across steps.
	 * @param options.internal Mark this as addressed to the model rather than the user (e.g. a
	 * guardrail correction). Still reaches the LLM via <agent_history>; UIs should skip rendering
	 * it as a user-facing status update (see `ObservationEvent.internal`).
	 * @experimental @internal
	 * @note history change will be emitted before next step starts
	 */
	pushObservation(content: string, options?: { internal?: boolean }): void {
		this.#observations.push({ content, internal: options?.internal })
	}

	/**
	 * Stop the current task and wait until the run has fully settled (including lifecycle hooks).
	 * @note never await .stop() in a lifecycle hook.
	 */
	async stop(): Promise<void> {
		if (this.#status !== 'running') return
		this.#abortController.abort()
		await this.#running
	}

	/**
	 * external errors (pre-checks/config/hooks) will threw;
	 * agent errors will be caught and added to history, and return a failed result
	 */
	async execute(task: string, options?: ExecuteOptions): Promise<ExecutionResult> {
		// pre-checks
		if (this.disposed) throw new Error('EBAgent has been disposed. Create a new instance.')
		if (this.#status === 'running') throw new Error('A task is already running.')
		if (!task) throw new Error('Task is required')

		this.task = task
		this.taskId = uid()
		this.image = options?.image ?? null

		this.history = []
		this.#observations = []
		this.#states = {
			totalWaitTime: 0,
			lastURL: '',
			browserState: null,
			toolset: new Map(this.tools),
		}
		this.capabilities.startTask(this.taskId)
		this.#abortController = new AbortController()
		const signal = this.#abortController.signal

		let resolveRunning!: () => void
		this.#running = new Promise<void>((r) => (resolveRunning = r))

		this.#setStatus('running')
		this.#emitHistoryChange()

		// Disable ask_user tool if onAskUser is not set
		if (!this.onAskUser) this.tools.delete('ask_user')

		// identify_image is only available when an image is attached to this task.
		// Unlike ask_user, this toggles per task, so it must be added back for tasks
		// that do have an image (unless the user explicitly disabled it via customTools).
		const identifyImageDisabled = this.config.customTools?.identify_image === null
		if (this.image && !identifyImageDisabled) {
			if (!this.tools.has('identify_image')) {
				const defaultTool = tools.get('identify_image')
				if (defaultTool) this.tools.set('identify_image', defaultTool)
			}
		} else {
			this.tools.delete('identify_image')
		}

		const onBeforeStep = this.config.onBeforeStep
		const onAfterStep = this.config.onAfterStep
		const onBeforeTask = this.config.onBeforeTask
		const onAfterTask = this.config.onAfterTask
		const stepDelay = this.config.stepDelay ?? 0.4
		const maxSteps = this.config.maxSteps

		let step = 0
		let taskResult: ExecutionResult
		let finalStatus: AgentStatus = 'error'

		await suppress(() => this.pageController.showMask())

		// graceful exit
		try {
			await onBeforeTask?.(this)

			while (true) {
				await onBeforeStep?.(this, step)

				// handle internal agent errors
				try {
					console.group(`step: ${step}`)

					// @note It's convenient to treat stepDelay as part of the next step.
					// Maybe move it to a dedicated try block for better semantics?
					if (step > 0) await waitFor(stepDelay, signal)

					signal.throwIfAborted()

					// observe

					console.log(chalk.blue.bold('👀 Observing...'))

					this.#states.browserState = await this.pageController.getBrowserState()

					// Re-discover what this page can do before the model sees it. Native
					// WebMCP tools change with page state, and generated ones are re-derived
					// on navigation, so this has to happen every step, not once per task.
					await suppress(() => this.capabilities.refresh(this.#states.browserState?.url ?? ''))

					this.#states.toolset = this.#buildToolset()

					await this.#handleObservations(step)

					// assemble prompts

					const messages = [
						{ role: 'system' as const, content: this.#getSystemPrompt() },
						{ role: 'user' as const, content: await this.#assembleUserPrompt() },
					]

					const macroTool = { AgentOutput: this.#packMacroTool(this.#states.toolset) }

					// invoke LLM

					console.log(chalk.blue.bold('🧠 Thinking...'))
					this.#emitActivity({ type: 'thinking' })

					const result = await this.#llm.invoke(messages, macroTool, signal, {
						toolChoiceName: 'AgentOutput',
						normalizeResponse: (res) => normalizeResponse(res, this.#states.toolset),
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

					this.#emitHistoryChange({
						type: 'step',
						stepIndex: step,
						reflection,
						action,
						usage: result.usage,
						rawResponse: result.rawResponse,
						rawRequest: result.rawRequest,
					})

					if (actionName === 'done') {
						const success = action.input?.success ?? false
						const data = action.input?.text || 'no text provided'
						console.log(chalk.green.bold('Task completed'), success, data)
						taskResult = { success, data, history: this.history }
						this.#lastResult = taskResult
						finalStatus = 'completed'
						break
					}
				} catch (error: unknown) {
					// catch block must not throw error. otherwise the error may be overridden if finally block also throws error.

					const isAbortError = (error as any)?.name === 'AbortError'
					if (!isAbortError) console.error('Task failed', error)
					const message = isAbortError ? 'Task aborted' : String(error)
					this.#emitActivity({ type: 'error', message: message })
					this.#emitHistoryChange({ type: 'error', message: message, rawResponse: error })
					taskResult = { success: false, data: message, history: this.history }
					this.#lastResult = taskResult
					finalStatus = isAbortError ? 'stopped' : 'error'
					break
				} finally {
					// finally block runs before the break above.

					console.groupEnd()
					// @note hook may throw error.
					// which will override the `break` above and be handled as an external error.
					// as expected.
					await onAfterStep?.(this, this.history)
				}

				step++
				if (step > maxSteps) {
					const message = 'Step count exceeded maximum limit'
					console.error(message)
					this.#emitActivity({ type: 'error', message: message })
					this.#emitHistoryChange({ type: 'error', message: message })
					taskResult = { success: false, data: message, history: this.history }
					this.#lastResult = taskResult
					finalStatus = 'error'
					break
				}
			} // while

			await onAfterTask?.(this, taskResult)

			return taskResult
		} catch (error) {
			this.#emitActivity({ type: 'error', message: String(error) })
			finalStatus = 'error'
			throw error
		} finally {
			await suppress(() => this.pageController.cleanUpHighlights())
			await suppress(() => this.pageController.hideMask())
			this.#abortController.abort()
			resolveRunning()
			this.#setStatus(finalStatus)
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
	#packMacroTool(tools: Map<string, EBAgentTool>): Tool<MacroToolInput, MacroToolResult> {
		const actionSchemas = Array.from(tools.entries()).map(([toolName, tool]) => {
			return z.object({ [toolName]: tool.inputSchema }).describe(tool.description)
		})

		const actionSchema = z.union(actionSchemas as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]])

		const macroToolSchema = z.object({
			// thinking: z.string().optional(),
			// @note kept optional: not every provider/model enforces JSON-schema "required" on
			// tool-call arguments (see the per-model patches below), so making these hard-required
			// would turn an occasionally-skipped field into a hard task failure. Missing values are
			// handled defensively wherever reflection is rendered back into the prompt.
			evaluation_previous_goal: z.string().optional(),
			memory: z.string().optional(),
			next_goal: z.string().optional(),
			action: actionSchema,
		})

		return {
			description: 'You MUST call this tool every step!',
			inputSchema: macroToolSchema as z.ZodType<MacroToolInput>,
			execute: async (input: MacroToolInput): Promise<MacroToolResult> => {
				const signal = this.#abortController.signal
				signal.throwIfAborted()

				console.log(chalk.blue.bold('MacroTool input'), input)
				const action = input.action

				let toolName = Object.keys(action)[0]
				let toolInput = action[toolName]

				// Guardrail: don't trust the model to actually act on identify_image's result
				// (see <image_attached_tasks> in system_prompt.md) — cheap/weak models sometimes
				// call `done` right after identifying the image, claiming to be missing a product
				// name/link, even though identify_image just gave them exactly that. This can't
				// be redirected to `ask_user` (may not be configured, and the instructions already
				// forbid asking here anyway) — instead reject the `done` deterministically and
				// nudge the model to act. Runs before the generic non-terminal-`done` guardrail
				// below so this more specific, more actionable message wins when both would match.
				if (toolName === 'done' && this.image) {
					const identifiedImage = this.history.some(
						(e) => e.type === 'step' && e.action.name === 'identify_image'
					)
					const hasActedSince = this.history.some(
						(e) => e.type === 'step' && !['identify_image', 'done', 'wait'].includes(e.action.name)
					)
					if (identifiedImage && !hasActedSince) {
						console.warn(
							chalk.yellow.bold('Rejecting premature `done` right after identify_image:'),
							toolInput?.text
						)
						this.pushObservation(
							'Blocked: `done` was called right after `identify_image` without acting on its ' +
								'result. You already have the product name/attributes from identify_image — use ' +
								'the search input, filter, or category nav visible in <browser_state> to look for ' +
								'it now. Do not call `done` again or ask for a product link/name.',
							{ internal: true }
						)
						delete action.done
						toolInput = { seconds: 1 }
						toolName = 'wait'
						action.wait = toolInput
					}
				}

				// Guardrail: don't trust the model to always follow the "don't call
				// `done` with an unresolved question/intention" instruction — it
				// slips through often enough (see system_prompt.md). `done` ends the
				// task permanently, so the user's next message would start a brand
				// new task with no memory of this one. Detect it deterministically
				// instead of relying on prompting alone, since it needs to happen
				// before the task actually ends.
				if (toolName === 'done' && looksNonTerminal(toolInput?.text)) {
					if (tools.has('ask_user')) {
						// Redirect to `ask_user`, which pauses and resumes this same task once answered.
						console.warn(
							chalk.yellow.bold('Rewriting non-terminal `done` call as `ask_user`:'),
							toolInput?.text
						)
						delete action.done
						toolInput = { question: toolInput?.text || '' }
						toolName = 'ask_user'
						action.ask_user = toolInput
					} else {
						// No `ask_user` configured (e.g. no onAskUser callback set) — there's no way
						// to pause for a real answer, but a merely-narrated intention ("Let me search
						// for it...") isn't a genuine dead end either. Reject the `done` and nudge the
						// model to actually take the action it just described, instead of stopping.
						console.warn(
							chalk.yellow.bold('Rejecting non-terminal `done` call (no ask_user configured):'),
							toolInput?.text
						)
						this.pushObservation(
							'Blocked: `done` was called while `text` merely described an intention or an ' +
								'unresolved question instead of a completed result or a genuine dead end. If you ' +
								'know the next action, take it now instead of ending the task.',
							{ internal: true }
						)
						delete action.done
						toolInput = { seconds: 1 }
						toolName = 'wait'
						action.wait = toolInput
					}
				}

				// Guardrail: "add X to cart" tasks must actually land on the cart page, not just
				// click "Add to cart" and stop (see <user_request> in system_prompt.md — the model
				// doesn't reliably follow that instruction on its own; clicking "Add to cart" usually
				// only pops a small toast while the product page stays on screen). Only applies when
				// the task itself mentions "cart" and an add-to-cart-looking click actually happened;
				// only blocks while the current page doesn't look like a cart page yet.
				if (toolName === 'done' && /\bcart\b/i.test(this.task)) {
					const clickedAddToCart = this.history.some(
						(e) =>
							e.type === 'step' &&
							e.action.name === 'click_element_by_index' &&
							/cart/i.test(e.action.output)
					)
					const currentUrl = this.#states.browserState?.url || ''
					const currentContent = this.#states.browserState?.content || ''
					const onCartPage =
						/cart|checkout|bag/i.test(currentUrl) || /\bcart\b/i.test(currentContent)
					if (clickedAddToCart && !onCartPage) {
						console.warn(
							chalk.yellow.bold('Rejecting `done` before reaching the cart page:'),
							toolInput?.text
						)
						this.pushObservation(
							'Blocked: the task asked to add item(s) to cart, and an add-to-cart click already ' +
								"happened, but the current page doesn't look like the cart page yet. Navigate to " +
								'the cart now (click the cart icon, "View Cart", or the cart page link) and ' +
								'confirm the item(s) are listed there before calling `done` again.',
							{ internal: true }
						)
						delete action.done
						toolInput = { seconds: 1 }
						toolName = 'wait'
						action.wait = toolInput
					}
				}

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

				const result = await tool.execute.bind(this)(toolInput, { signal })
				// Enforce abort even if the tool ignored the signal and resolved normally.
				signal.throwIfAborted()

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

				// identify_image is a "call once" tool. Don't rely on the model reading
				// agent_history and honoring the "unless already done" instruction — remove it
				// from the toolset so it deterministically can't be offered/called again, and
				// the <attached_image> reminder (gated on this.tools.has('identify_image'))
				// stops being repeated every step.
				if (toolName === 'identify_image') {
					// Delete from the durable toolset, not the per-step snapshot, so the
					// removal actually persists to the next step.
					this.tools.delete('identify_image')
					tools.delete('identify_image')
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
	 * Merge the built-in tools with the capabilities the current page exposes.
	 *
	 * @remarks
	 * Capability tools are namespaced (`cap_*`), so a page that declares a tool named
	 * `done` or `wait` can never shadow a built-in and break the loop. Built-ins always
	 * win a collision.
	 */
	#buildToolset(): Map<string, EBAgentTool> {
		const toolset = new Map(this.tools)

		if (!this.capabilities.enabled) return toolset

		const page = this.#states.browserState?.url
		for (const [name, tool] of this.capabilities.getTools(page)) {
			if (toolset.has(name)) continue
			toolset.set(name, tool)
		}

		return toolset
	}

	/**
	 * Register a business capability this application can perform (§7).
	 *
	 * The capability becomes available to eb-agent's own planner immediately, and is
	 * published through WebMCP when the browser supports it — so external agents can
	 * call it too, without the application implementing WebMCP itself.
	 *
	 * @example
	 * agent.registerTool({
	 *   name: 'cancel_order',
	 *   description: 'Cancel an order that has not yet shipped',
	 *   inputSchema: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
	 *   risk: 'consequential',
	 *   execute: async ({ orderId }) => cancelOrder(orderId),
	 * })
	 */
	async registerTool(definition: DeveloperToolDefinition): Promise<Capability> {
		return this.capabilities.registerTool(definition)
	}

	/** Withdraw a capability registered via {@link registerTool}. */
	async unregisterTool(idOrName: string): Promise<boolean> {
		return this.capabilities.unregisterTool(idOrName)
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
		const { instructions, experimentalLlmsTxt } = this.config

		const systemInstructions = instructions?.system?.trim()
		let pageInstructions: string | undefined

		const url = this.#states.browserState?.url || ''
		if (instructions?.getPageInstructions && url) {
			try {
				pageInstructions = instructions.getPageInstructions(url)?.trim()
			} catch (error) {
				console.error(chalk.red('[EBAgent] Failed to execute getPageInstructions callback:'), error)
			}
		}

		const llmsTxt = experimentalLlmsTxt && url ? await fetchLlmsTxt(url) : undefined

		if (!systemInstructions && !pageInstructions && !llmsTxt) return ''

		let result = '<instructions>\n'

		if (systemInstructions) {
			result += `<system_instructions>\n${systemInstructions}\n</system_instructions>\n`
		}

		if (pageInstructions) {
			result += `<page_instructions>\n${pageInstructions}\n</page_instructions>\n`
		}

		if (llmsTxt) {
			result += `<llms_txt>\n${llmsTxt}\n</llms_txt>\n`
		}

		result += '</instructions>\n\n'

		return result
	}

	/**
	 * Generate system observations before each step
	 * @todo console error
	 */
	async #handleObservations(step: number): Promise<void> {
		// Accumulated wait time warning
		if (this.#states.totalWaitTime >= 3) {
			this.pushObservation(
				`You have waited ${this.#states.totalWaitTime} seconds accumulatively. ` +
					`DO NOT wait any longer unless you have a good reason.`
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
				`⚠️ Only ${remaining} steps remaining. ` +
					`Consider wrapping up or calling done with partial results.`
			)
		} else if (remaining === 2) {
			this.pushObservation(
				`⚠️ Critical: Only ${remaining} steps left! You must finish the task or call done immediately.`
			)
		}

		// Loop detection: the model is told in system_prompt.md not to repeat the same action
		// more than 3 times, but doesn't reliably self-police it (e.g. re-scrolling the same
		// container in tiny increments for 10+ steps without ever clicking the element it's
		// trying to reveal). Detect it deterministically instead of trusting prompt compliance —
		// same rationale as the `done` guardrails above.
		const REPEAT_THRESHOLD = 3
		const recentSteps = this.history.filter((e) => e.type === 'step').slice(-REPEAT_THRESHOLD)
		if (recentSteps.length === REPEAT_THRESHOLD) {
			const names = recentSteps.map((e) => e.action.name)
			const [firstName] = names
			const allSame = names.every((n) => n === firstName)
			// `wait`/`done` repeats are handled by their own dedicated warnings/guardrails above.
			if (allSame && firstName !== 'wait' && firstName !== 'done') {
				this.pushObservation(
					`⚠️ You've called \`${firstName}\` ${REPEAT_THRESHOLD} times in a row with no different ` +
						`outcome. Stop repeating it as-is. If you're scrolling to reveal an element: check ` +
						`<browser_state> for its index right now and click it directly if it's listed; if it's ` +
						`still not listed, try scrolling without an \`index\` (scrolls the whole page instead of ` +
						`a sub-container — the container you've been scrolling may be the wrong one), or scroll ` +
						`by a larger num_pages/pixels amount. If it's a different action, try a materially ` +
						`different approach instead of repeating it again.`,
					{ internal: true }
				)
			}
		}

		// Push observations to history and emit
		if (this.#observations.length > 0) {
			for (const { content, internal } of this.#observations) {
				this.history.push({ type: 'observation', content, internal })
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
		if (this.image && this.tools.has('identify_image')) {
			prompt += '<attached_image>\n'
			prompt +=
				'The user attached an image to this task. Call `identify_image` to see what it depicts ' +
				'before deciding on further actions, unless you have already done so (check agent_history below).\n'
			prompt += '</attached_image>\n'
		}
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
				// @note reflection fields are optional (not every provider/model fills them in on
				// every call) — omit the line entirely rather than printing the literal "undefined",
				// which would otherwise pollute the model's own history and mask whether it actually
				// has already performed a "call once" action like identify_image.
				if (event.reflection.evaluation_previous_goal)
					prompt += `Evaluation of Previous Step: ${event.reflection.evaluation_previous_goal}\n`
				if (event.reflection.memory) prompt += `Memory: ${event.reflection.memory}\n`
				if (event.reflection.next_goal) prompt += `Next Goal: ${event.reflection.next_goal}\n`
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

		// <page_capabilities> — structured tools available on this page, preferred
		// over raw DOM interaction. Placed before <browser_state> so the model reads
		// what it can *call* before what it can *click*.

		prompt += this.capabilities.describeForPrompt(browserState.url)

		prompt += '<browser_state>\n'
		prompt += browserState.header + '\n'
		prompt += pageContent + '\n'
		prompt += browserState.footer + '\n\n'
		prompt += '</browser_state>\n\n'

		return prompt
	}

	/**
	 * Analyze the image attached to the current task (see `execute(task, { image })`)
	 * with a vision-capable model and return a structured identification.
	 * Works generically for any subject — products, medicine, gemstones, clothing, etc. —
	 * without per-category training, relying entirely on the configured model's vision capability.
	 * @throws if no image is attached to the current task, or if the configured model rejects vision input.
	 */
	async identifyImage(): Promise<IdentifyImageResult> {
		if (!this.image) throw new Error('No image attached to this task.')

		const signal = this.#abortController.signal
		signal.throwIfAborted()

		const messages: Message[] = [
			{
				role: 'system',
				content:
					'You are a precise visual identification assistant. Look at the image and identify exactly ' +
					'what it depicts — a product, garment, medicine, gemstone, or anything else. Be as specific ' +
					'as possible (brand, model, color, material) only when the visual evidence supports it; ' +
					'never invent details you cannot actually see.',
			},
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'Identify what is shown in this image.' },
					{ type: 'image_url', image_url: { url: this.image } },
				],
			},
		]

		const reportTool: Record<string, Tool> = {
			report_identification: {
				description: 'Report the identification result for the analyzed image.',
				inputSchema: z.object({
					category: z
						.string()
						.describe('General category, e.g. "shoes", "medicine", "gemstone", "clothing"'),
					name: z.string().describe('Best-guess specific name, e.g. "Nike Air Max 90"'),
					description: z
						.string()
						.describe('Concise visual description including color, material, notable features'),
					attributes: z
						.record(z.string(), z.string())
						.optional()
						.describe('Additional key-value attributes, e.g. { "color": "red", "brand": "Nike" }'),
				}),
				execute: async (args) => args,
			},
		}

		try {
			const result = await this.#visionLlm.invoke(messages, reportTool, signal, {
				toolChoiceName: 'report_identification',
			})
			return result.toolResult as IdentifyImageResult
		} catch (error) {
			if (error instanceof InvokeError && !this.config.visionModel) {
				throw new InvokeError(
					error.type,
					`${error.message}\n` +
						`Hint: model "${this.config.model}" may not accept image input. ` +
						'Set AgentConfig.visionModel to a vision-capable model (e.g. { model: "gpt-4o" }) ' +
						'to power identify_image separately from the main automation model.',
					error.rawError,
					error.rawResponse
				)
			}
			throw error
		}
	}

	dispose() {
		console.log('Disposing EBAgent...')
		this.disposed = true
		// Withdraw anything we published through WebMCP before tearing down, so a
		// disposed agent never leaves callable tools behind on the page.
		void this.capabilities.dispose()
		this.pageController.dispose()
		// this.history = []
		this.#abortController.abort()

		// Emit dispose event for UI cleanup
		this.dispatchEvent(new Event('dispose'))

		this.config.onDispose?.(this)
	}
}
