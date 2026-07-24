import { I18n, type SupportedLanguage } from '../i18n'
import { truncate } from '../utils'
import { UI_ICONS, createCard, createReflectionLines } from './cards'
import type { AgentActivity, PanelAgentAdapter } from './types'

import styles from './Panel.module.css'

/**
 * Panel configuration
 */
export interface PanelConfig {
	language?: SupportedLanguage
	/**
	 * Whether to prompt for next task after task completion
	 * @default true
	 */
	promptForNextTask?: boolean
}

/**
 * Agent control panel
 *
 * Architecture:
 * - History list: renders directly from agent.history (historical events)
 * - Header bar: shows activity events (transient state) and agent status
 *
 * This separation ensures data consistency - history is the single source of truth
 * for what has been done, while activity shows what is happening now.
 */
export class Panel {
	#wrapper: HTMLElement
	#indicator: HTMLElement
	#statusText: HTMLElement
	#historySection: HTMLElement
	#expandButton: HTMLElement
	#actionButton: HTMLElement
	#inputSection: HTMLElement
	#taskInput: HTMLTextAreaElement

	#agent: PanelAgentAdapter
	#config: PanelConfig
	#isExpanded = false
	#i18n: I18n
	#userAnswerResolver: ((input: string) => void) | null = null
	#isWaitingForUserAnswer: boolean = false
	#isNumericInput: boolean = false
	#headerUpdateTimer: ReturnType<typeof setInterval> | null = null
	#pendingHeaderText: string | null = null
	#isAnimating = false

	// Event handlers (bound for removal)
	#onStatusChange = () => this.#handleStatusChange()
	#onHistoryChange = () => this.#handleHistoryChange()
	#onActivity = (e: Event) => this.#handleActivity((e as CustomEvent<AgentActivity>).detail)
	#onAgentDispose = () => this.dispose()

	get wrapper(): HTMLElement {
		return this.#wrapper
	}

	/**
	 * Create a Panel bound to an agent
	 * @param agent - Agent instance that implements PanelAgentAdapter
	 * @param config - Optional panel configuration
	 */
	constructor(agent: PanelAgentAdapter, config: PanelConfig = {}) {
		this.#agent = agent
		this.#config = config
		this.#i18n = new I18n(config.language ?? 'en-US')

		// Set up askUser callback on agent
		this.#agent.onAskUser = (question, options) => this.#askUser(question, options)

		// Create UI elements
		this.#wrapper = this.#createWrapper()
		this.#indicator = this.#wrapper.querySelector(`.${styles.indicator}`)!
		this.#statusText = this.#wrapper.querySelector(`.${styles.statusText}`)!
		this.#historySection = this.#wrapper.querySelector(`.${styles.historySection}`)!
		this.#expandButton = this.#wrapper.querySelector(`.${styles.expandButton}`)!
		this.#actionButton = this.#wrapper.querySelector(`.${styles.stopButton}`)!
		this.#inputSection = this.#wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		this.#taskInput = this.#wrapper.querySelector(`.${styles.taskInput}`)!

		// Listen to agent events
		this.#agent.addEventListener('statuschange', this.#onStatusChange)
		this.#agent.addEventListener('historychange', this.#onHistoryChange)
		this.#agent.addEventListener('activity', this.#onActivity)
		this.#agent.addEventListener('dispose', this.#onAgentDispose)

		this.#setupEventListeners()
		this.#startHeaderUpdateLoop()

		this.#showInputArea()

		this.hide() // Start hidden
	}

	// ========== Agent event handlers ==========

	/** Handle agent status change */
	#handleStatusChange(): void {
		const status = this.#agent.status

		// Map agent status to UI indicator. A `completed` run whose result reports
		// failure shows as error; other statuses map to their own indicator.
		const failed = status === 'completed' && this.#agent.lastResult?.success === false
		this.#updateStatusIndicator(failed ? 'error' : status)

		// Morph action button: running = stop, not running = close
		if (status === 'running') {
			this.#actionButton.innerHTML = UI_ICONS.stop
			this.#actionButton.title = this.#i18n.t('ui.panel.stop')
		} else {
			this.#actionButton.innerHTML = UI_ICONS.close
			this.#actionButton.title = this.#i18n.t('ui.panel.close')
		}

		// Show/hide based on status
		if (status === 'running') {
			this.show()
			this.#hideInputArea() // Hide input while running
		}

		// Handle completion
		if (status === 'completed' || status === 'error' || status === 'stopped') {
			if (!this.#isExpanded) {
				this.#expand()
			}
			if (this.#shouldShowInputArea()) {
				this.#showInputArea()
			}
		}
	}

	/** Handle agent history change - re-render history list from agent.history */
	#handleHistoryChange(): void {
		this.#renderHistory()
	}

	/**
	 * Handle agent activity - transient state for immediate UI feedback
	 * Activity events are NOT persisted in history, only used for header bar updates
	 */
	#handleActivity(activity: AgentActivity): void {
		switch (activity.type) {
			case 'thinking':
				this.#pendingHeaderText = this.#i18n.t('ui.panel.thinking')
				this.#updateStatusIndicator('thinking')
				break

			case 'executing':
				this.#pendingHeaderText = this.#getToolExecutingText(activity.tool, activity.input)
				this.#updateStatusIndicator('executing')
				break

			case 'executed':
				this.#pendingHeaderText = truncate(this.#stripStatusEmoji(activity.output), 50)
				break

			case 'retrying':
				this.#pendingHeaderText = `Retrying (${activity.attempt}/${activity.maxAttempts})`
				this.#updateStatusIndicator('retrying')
				break

			case 'error':
				this.#pendingHeaderText = truncate(activity.message, 50)
				this.#updateStatusIndicator('error')
				break
		}
	}

	/**
	 * Ask for user input (internal, called by agent via onAskUser).
	 * When `choices` are provided they render as clickable answer buttons;
	 * `inputType: 'number'` switches the free-form field to a number input.
	 * Rejects when `signal` aborts (task stopped or disposed), cleaning up the
	 * question card and pending state so the agent loop can settle.
	 */
	#askUser(
		question: string,
		options?: { signal?: AbortSignal; choices?: string[]; inputType?: 'text' | 'number' }
	): Promise<string> {
		const { signal, choices, inputType } = options ?? {}
		return new Promise((resolve, reject) => {
			// Set `waiting for user answer` state
			this.#isWaitingForUserAnswer = true
			this.#userAnswerResolver = resolve

			// Expand history panel
			if (!this.#isExpanded) {
				this.#expand()
			}

			// Add temporary question card so user can see the full question
			const tempCard = document.createElement('div')
			tempCard.innerHTML = createCard({
				icon: 'question',
				content: this.#i18n.t('ui.panel.question', { question }),
				type: 'question',
			})
			const cardElement = tempCard.firstElementChild as HTMLElement
			cardElement.setAttribute('data-temp-card', 'true')
			this.#historySection.appendChild(cardElement)

			// Render answer choices as buttons (inside the question card)
			if (choices && choices.length > 0) {
				const optionsRow = document.createElement('div')
				optionsRow.className = styles.optionsRow
				for (const choice of choices) {
					const button = document.createElement('button')
					button.type = 'button'
					button.className = styles.optionButton
					button.textContent = choice
					button.addEventListener('click', (e) => {
						e.stopPropagation()
						if (!this.#isWaitingForUserAnswer) return
						this.#hideInputArea()
						this.#handleUserAnswer(choice)
					})
					optionsRow.appendChild(button)
				}
				cardElement.appendChild(optionsRow)
			}

			this.#scrollToBottom()

			// Free-form answer field (numeric keyboard/filtering when a numeric answer is expected)
			this.#setNumericMode(inputType === 'number')
			this.#showInputArea(
				choices && choices.length > 0
					? this.#i18n.t('ui.panel.userAnswerPromptOptions')
					: this.#i18n.t('ui.panel.userAnswerPrompt')
			)

			signal?.addEventListener(
				'abort',
				() => {
					this.#removeTempCards()
					this.#isWaitingForUserAnswer = false
					this.#userAnswerResolver = null
					this.#setNumericMode(false)
					// reason is a DOMException AbortError (abort() takes no args).
					reject(signal.reason as DOMException)
				},
				{ once: true }
			)
		})
	}

	/** Remove temporary question cards (only direct children for safety) */
	#removeTempCards(): void {
		Array.from(this.#historySection.children).forEach((child) => {
			if (child.getAttribute('data-temp-card') === 'true') {
				child.remove()
			}
		})
	}

	// ========== Public control methods ==========

	show(): void {
		this.wrapper.style.display = 'block'
		void this.wrapper.offsetHeight
		this.wrapper.style.opacity = '1'
		this.wrapper.style.transform = 'translateX(-50%) translateY(0)'
	}

	hide(): void {
		this.wrapper.style.opacity = '0'
		this.wrapper.style.transform = 'translateX(-50%) translateY(20px)'
		this.wrapper.style.display = 'none'
	}

	reset(): void {
		this.#statusText.textContent = this.#i18n.t('ui.panel.ready')
		this.#updateStatusIndicator('thinking')
		this.#renderHistory()
		this.#collapse()
		// Reset user input state
		this.#isWaitingForUserAnswer = false
		this.#userAnswerResolver = null
		this.#setNumericMode(false)
		// Show input area
		this.#showInputArea()
	}

	expand(): void {
		this.#expand()
	}

	collapse(): void {
		this.#collapse()
	}

	/**
	 * Dispose panel and clean up event listeners
	 */
	dispose(): void {
		// Remove agent event listeners
		this.#agent.removeEventListener('statuschange', this.#onStatusChange)
		this.#agent.removeEventListener('historychange', this.#onHistoryChange)
		this.#agent.removeEventListener('activity', this.#onActivity)
		this.#agent.removeEventListener('dispose', this.#onAgentDispose)

		// Clean up UI
		this.#isWaitingForUserAnswer = false
		this.#stopHeaderUpdateLoop()
		this.wrapper.remove()
	}

	// ========== Private methods ==========

	#getToolExecutingText(toolName: string, args: unknown): string {
		const a = args as Record<string, string | number>
		switch (toolName) {
			case 'click_element_by_index':
				return this.#i18n.t('ui.tools.clicking', { index: a.index })
			case 'input_text':
				return this.#i18n.t('ui.tools.inputting', { index: a.index })
			case 'select_dropdown_option':
				return this.#i18n.t('ui.tools.selecting', { text: a.text })
			case 'scroll':
				return this.#i18n.t('ui.tools.scrolling')
			case 'wait':
				return this.#i18n.t('ui.tools.waiting', { seconds: a.seconds })
			case 'ask_user':
				return this.#i18n.t('ui.tools.askingUser')
			case 'done':
				return this.#i18n.t('ui.tools.done')
			default:
				return this.#i18n.t('ui.tools.executing', { toolName })
		}
	}

	/**
	 * Action button handler: stop when running, close (dispose) when idle
	 */
	#handleActionButton(): void {
		if (this.#agent.status === 'running') {
			this.#agent.stop()
		} else {
			this.#agent.dispose()
		}
	}

	/**
	 * Submit task
	 */
	#submitTask() {
		const input = this.#taskInput.value.trim()
		if (!input) return

		// Hide input area
		this.#hideInputArea()

		if (this.#isWaitingForUserAnswer) {
			// Handle user input mode
			this.#handleUserAnswer(input)
		} else {
			// Execute task via agent
			this.#agent.execute(input)
		}
	}

	/**
	 * Handle user answer
	 */
	#handleUserAnswer(input: string): void {
		this.#removeTempCards()

		// Reset state
		this.#isWaitingForUserAnswer = false
		this.#setNumericMode(false)

		// Call resolver to return user input
		if (this.#userAnswerResolver) {
			this.#userAnswerResolver(input)
			this.#userAnswerResolver = null
		}
	}

	/**
	 * Show input area
	 */
	#showInputArea(placeholder?: string): void {
		// Clear input field
		this.#taskInput.value = ''
		this.#taskInput.placeholder = placeholder || this.#i18n.t('ui.panel.taskInput')
		this.#autoGrowInput()
		this.#inputSection.classList.remove(styles.hidden)
		// Focus on input field
		setTimeout(() => {
			this.#taskInput.focus()
		}, 100)
	}

	/**
	 * Toggle numeric-answer mode. Textareas have no native `type="number"`,
	 * so we switch the mobile keyboard hint and filter non-numeric keystrokes instead.
	 */
	#setNumericMode(enabled: boolean): void {
		this.#isNumericInput = enabled
		this.#taskInput.inputMode = enabled ? 'decimal' : 'text'
	}

	/** Grow the textarea to fit its content, up to the CSS max-height (which then scrolls). */
	#autoGrowInput(): void {
		this.#taskInput.style.height = 'auto'
		this.#taskInput.style.height = `${this.#taskInput.scrollHeight}px`
	}

	/** Whether a keydown event should be allowed while in numeric-answer mode. */
	#isNumericKey(e: KeyboardEvent): boolean {
		if (e.ctrlKey || e.metaKey || e.altKey) return true // allow shortcuts (copy/paste/select-all)
		if (e.key.length !== 1) return true // allow control keys (Backspace, arrows, Tab, etc.)
		return /[0-9.-]/.test(e.key)
	}

	/**
	 * Hide input area
	 */
	#hideInputArea(): void {
		this.#inputSection.classList.add(styles.hidden)
	}

	/**
	 * Check if input area should be shown
	 */
	#shouldShowInputArea(): boolean {
		// Always show input area if waiting for user input
		if (this.#isWaitingForUserAnswer) return true

		const history = this.#agent.history
		if (history.length === 0) {
			return true // Initial state
		}

		const status = this.#agent.status
		const isTaskEnded = status === 'completed' || status === 'error' || status === 'stopped'

		// Only show input area after task completion if configured to do so
		if (isTaskEnded) {
			return this.#config.promptForNextTask ?? true
		}

		return false
	}

	#createWrapper(): HTMLElement {
		const taskInputMaxLength = 1000
		const wrapper = document.createElement('div')
		wrapper.id = 'page-os-runtime_agent-panel'
		wrapper.className = styles.wrapper
		wrapper.setAttribute('data-browser-use-ignore', 'true')
		wrapper.setAttribute('data-page-os-ignore', 'true')

		wrapper.innerHTML = `
			<div class="${styles.background}"></div>
			<div class="${styles.historySectionWrapper}">
				<div class="${styles.historySection}">
					${createCard({ icon: 'brain', content: this.#i18n.t('ui.panel.waitingPlaceholder') })}
				</div>
			</div>
			<div class="${styles.header}">
				<div class="${styles.statusSection}">
					<div class="${styles.indicator} ${styles.thinking}"></div>
					<div class="${styles.statusText}">${this.#i18n.t('ui.panel.ready')}</div>
				</div>
				<div class="${styles.controls}">
					<button class="${styles.controlButton} ${styles.expandButton}" title="${this.#i18n.t('ui.panel.expand')}">
						${UI_ICONS.chevronDown}
					</button>
					<button class="${styles.controlButton} ${styles.stopButton}" title="${this.#i18n.t('ui.panel.close')}">
						${UI_ICONS.close}
					</button>
				</div>
			</div>
			<div class="${styles.inputSectionWrapper} ${styles.hidden}">
				<div class="${styles.inputSection}">
					<textarea
						class="${styles.taskInput}"
						rows="1"
						maxlength="${taskInputMaxLength}"
					></textarea>
				</div>
			</div>
		`

		document.body.appendChild(wrapper)
		return wrapper
	}

	#setupEventListeners(): void {
		// Click header area to expand/collapse
		const header = this.wrapper.querySelector(`.${styles.header}`)!
		header.addEventListener('click', (e) => {
			// Don't trigger expand/collapse if clicking on buttons
			if ((e.target as HTMLElement).closest(`.${styles.controlButton}`)) {
				return
			}
			this.#toggle()
		})

		// Expand button
		this.#expandButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#toggle()
		})

		// Action button (stop / close)
		this.#actionButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#handleActionButton()
		})

		// Submit on Enter key in input field
		this.#taskInput.addEventListener('keydown', (e) => {
			if (e.isComposing) return // Ignore IME composition keys
			if (e.key === 'Enter') {
				e.preventDefault()
				this.#submitTask()
				return
			}
			if (this.#isNumericInput && !this.#isNumericKey(e)) {
				e.preventDefault()
			}
		})

		// Auto-grow the textarea as the user types (up to the CSS max-height)
		this.#taskInput.addEventListener('input', () => this.#autoGrowInput())

		// Prevent input area click event bubbling
		this.#inputSection.addEventListener('click', (e) => {
			e.stopPropagation()
		})
	}

	#toggle(): void {
		if (this.#isExpanded) {
			this.#collapse()
		} else {
			this.#expand()
		}
	}

	#expand(): void {
		this.#isExpanded = true
		this.wrapper.classList.add(styles.expanded)
		this.#expandButton.innerHTML = UI_ICONS.chevronUp
		this.#expandButton.title = this.#i18n.t('ui.panel.collapse')
	}

	#collapse(): void {
		this.#isExpanded = false
		this.wrapper.classList.remove(styles.expanded)
		this.#expandButton.innerHTML = UI_ICONS.chevronDown
		this.#expandButton.title = this.#i18n.t('ui.panel.expand')
	}

	/**
	 * Start periodic header update loop
	 */
	#startHeaderUpdateLoop(): void {
		// Check every 450ms (same as total animation duration)
		this.#headerUpdateTimer = setInterval(() => {
			this.#checkAndUpdateHeader()
		}, 450)
	}

	/**
	 * Stop periodic header update loop
	 */
	#stopHeaderUpdateLoop(): void {
		if (this.#headerUpdateTimer) {
			clearInterval(this.#headerUpdateTimer)
			this.#headerUpdateTimer = null
		}
	}

	/**
	 * Check if header needs update and trigger animation if not currently animating
	 */
	#checkAndUpdateHeader(): void {
		// If no pending text or currently animating, skip
		if (!this.#pendingHeaderText || this.#isAnimating) {
			return
		}

		// If text is already displayed, clear pending and skip
		if (this.#statusText.textContent === this.#pendingHeaderText) {
			this.#pendingHeaderText = null
			return
		}

		// Start animation
		const textToShow = this.#pendingHeaderText
		this.#pendingHeaderText = null
		this.#animateTextChange(textToShow)
	}

	/**
	 * Animate text change with fade out/in effect
	 */
	#animateTextChange(newText: string): void {
		this.#isAnimating = true

		// Fade out current text
		this.#statusText.classList.add(styles.fadeOut)

		setTimeout(() => {
			// Update text content
			this.#statusText.textContent = newText

			// Fade in new text
			this.#statusText.classList.remove(styles.fadeOut)
			this.#statusText.classList.add(styles.fadeIn)

			setTimeout(() => {
				this.#statusText.classList.remove(styles.fadeIn)
				this.#isAnimating = false
			}, 300)
		}, 150) // Half the duration of fade out animation
	}

	#updateStatusIndicator(
		type:
			| 'idle'
			| 'running'
			| 'thinking'
			| 'executing'
			| 'executed'
			| 'retrying'
			| 'completed'
			| 'error'
			| 'stopped'
	): void {
		// `running` animates like thinking; `idle`/`stopped` use the neutral base.
		const variant = type === 'running' ? 'thinking' : type
		this.#indicator.className = styles.indicator
		if (variant !== 'idle' && variant !== 'stopped') {
			this.#indicator.classList.add(styles[variant])
		}
	}

	#scrollToBottom(): void {
		// Execute in next event loop to ensure DOM update completion
		setTimeout(() => {
			this.#historySection.scrollTop = this.#historySection.scrollHeight
		}, 0)
	}

	/**
	 * Render history directly from agent.history
	 *
	 * Renders:
	 * 1. Task (first item, from agent.task)
	 * 2. Reflection cards (evaluation, memory, next_goal)
	 * 3. Tool execution with output
	 * 4. Observations
	 */
	#renderHistory(): void {
		const items: string[] = []

		// 1. Task card (always first)
		const task = this.#agent.task
		if (task) {
			items.push(this.#createTaskCard(task))
		}

		// 2. Render each history event
		const history = this.#agent.history
		for (const event of history) {
			items.push(...this.#createHistoryCards(event))
		}

		this.#historySection.innerHTML = items.join('')
		this.#scrollToBottom()
	}

	#createTaskCard(task: string): string {
		return createCard({ icon: 'task', content: task, type: 'input' })
	}

	/** Strip decorative status emojis from tool outputs (kept in the LLM protocol) */
	#stripStatusEmoji(text: string): string {
		return text.replace(/(^|\s)(✅|❌|⚠️)\s*/g, '$1').trim()
	}

	/** Create cards for a history event */
	#createHistoryCards(event: PanelAgentAdapter['history'][number]): string[] {
		const cards: string[] = []
		const meta =
			event.type === 'step' && event.stepIndex !== undefined
				? this.#i18n.t('ui.panel.step', {
						number: (event.stepIndex + 1).toString(),
					})
				: undefined

		if (event.type === 'step') {
			// Reflection card
			if (event.reflection) {
				const lines = createReflectionLines(event.reflection, {
					evaluation: this.#i18n.t('ui.panel.reflectionEval'),
					memory: this.#i18n.t('ui.panel.reflectionMemory'),
					next: this.#i18n.t('ui.panel.reflectionNext'),
				})
				if (lines.length > 0) {
					cards.push(createCard({ icon: 'brain', content: lines, meta }))
				}
			}

			// Action card
			const action = event.action
			if (action) {
				cards.push(...this.#createActionCards(action, meta))
			}
		} else if (event.type === 'observation') {
			cards.push(
				createCard({ icon: 'eye', content: event.content || '', meta, type: 'observation' })
			)
		} else if (event.type === 'user_takeover') {
			cards.push(createCard({ icon: 'user', content: 'User takeover', meta, type: 'input' }))
		} else if (event.type === 'retry') {
			const retryInfo = `${event.message || 'Retrying'} (${event.attempt}/${event.maxAttempts})`
			cards.push(createCard({ icon: 'retry', content: retryInfo, meta, type: 'observation' }))
		} else if (event.type === 'error') {
			cards.push(
				createCard({ icon: 'error', content: event.message || 'Error', meta, type: 'observation' })
			)
		}

		return cards
	}

	/** Create cards for an action */
	#createActionCards(
		action: { name: string; input: unknown; output: string },
		meta?: string
	): string[] {
		const cards: string[] = []

		if (action.name === 'done') {
			const input = action.input as { text?: string }
			const text = input.text || action.output || ''
			if (text) {
				cards.push(createCard({ icon: 'agent', content: text, meta, type: 'output' }))
			}
		} else if (action.name === 'ask_user') {
			const input = action.input as { question?: string }
			const answer = action.output.replace(/^User answered:\s*/i, '')
			cards.push(
				createCard({
					icon: 'question',
					content: this.#i18n.t('ui.panel.question', { question: input.question || '' }),
					meta,
					type: 'question',
				})
			)
			cards.push(
				createCard({
					icon: 'answer',
					content: this.#i18n.t('ui.panel.userAnswer', { input: answer }),
					meta,
					type: 'input',
				})
			)
		} else {
			const toolText = this.#getToolExecutingText(action.name, action.input)
			cards.push(createCard({ icon: 'tool', content: toolText, meta }))
			if (action.output?.length > 0) {
				cards.push(
					createCard({
						icon: 'check',
						content: this.#stripStatusEmoji(action.output),
						meta,
						type: 'output',
					})
				)
			}
		}

		return cards
	}
}
