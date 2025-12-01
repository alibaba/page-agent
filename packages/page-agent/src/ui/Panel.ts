import type { PageAgent } from '../PageAgent'
import type { I18n } from '../i18n'
import { truncate } from '../utils'
import type { EventBus } from '../utils/bus'
import { type Step, UIState } from './UIState'

import styles from './Panel.module.css'

/**
 * Agent control panel
 */
export class Panel {
	#wrapper: HTMLElement
	#indicator: HTMLElement
	#statusText: HTMLElement
	#historySection: HTMLElement
	#expandButton: HTMLElement
	#pauseButton: HTMLElement
	#stopButton: HTMLElement
	#inputSection: HTMLElement
	#taskInput: HTMLInputElement
	#bus: EventBus

	#state = new UIState()
	#isExpanded = false
	#pageAgent: PageAgent
	#userAnswerResolver: ((input: string) => void) | null = null
	#isWaitingForUserAnswer: boolean = false
	#headerUpdateTimer: ReturnType<typeof setInterval> | null = null
	#pendingHeaderText: string | null = null
	#isAnimating = false

	get wrapper(): HTMLElement {
		return this.#wrapper
	}

	constructor(pageAgent: PageAgent) {
		this.#pageAgent = pageAgent
		this.#bus = pageAgent.bus
		this.#wrapper = this.#createWrapper()
		this.#indicator = this.#wrapper.querySelector(`.${styles.indicator}`)!
		this.#statusText = this.#wrapper.querySelector(`.${styles.statusText}`)!
		this.#historySection = this.#wrapper.querySelector(`.${styles.historySection}`)!
		this.#expandButton = this.#wrapper.querySelector(`.${styles.expandButton}`)!
		this.#pauseButton = this.#wrapper.querySelector(`.${styles.pauseButton}`)!
		this.#stopButton = this.#wrapper.querySelector(`.${styles.stopButton}`)!
		this.#inputSection = this.#wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		this.#taskInput = this.#wrapper.querySelector(`.${styles.taskInput}`)!

		this.#setupEventListeners()
		this.#startHeaderUpdateLoop()
		// this.#expand() // debug

		this.#showInputArea()

		this.#bus.on('panel:show', () => this.#show())
		this.#bus.on('panel:hide', () => this.#hide())
		this.#bus.on('panel:reset', () => this.#reset())
		this.#bus.on('panel:update', (stepData) => this.#update(stepData))
		this.#bus.on('panel:expand', () => this.#expand())
		this.#bus.on('panel:collapse', () => this.#collapse())
	}

	/**
	 * Ask for user input
	 */
	async askUser(question: string): Promise<string> {
		return new Promise((resolve) => {
			// Set `waiting for user answer` state
			this.#isWaitingForUserAnswer = true
			this.#userAnswerResolver = resolve

			// Update state to `running`
			this.#update({
				type: 'output',
				displayText: this.#pageAgent.i18n.t('ui.panel.question', { question }),
			}) // Expand history panel
			if (!this.#isExpanded) {
				this.#expand()
			}

			this.#showInputArea(this.#pageAgent.i18n.t('ui.panel.userAnswerPrompt'))
		})
	}

	/**
	 * Dispose panel
	 */
	dispose(): void {
		this.#isWaitingForUserAnswer = false
		this.#stopHeaderUpdateLoop()
		this.wrapper.remove()
	}

	/**
	 * Update status
	 */
	#update(stepData: Omit<Step, 'id' | 'stepNumber' | 'timestamp'>): void {
		const step = this.#state.addStep(stepData)

		// Queue header text update (will be processed by periodic check)
		const headerText = truncate(step.displayText, 20)
		this.#pendingHeaderText = headerText

		this.#updateStatusIndicator(step.type)
		this.#updateHistory()

		// Auto-expand history after task completion
		if (step.type === 'completed' || step.type === 'error') {
			if (!this.#isExpanded) {
				this.#expand()
			}
		}

		// Control input area display based on status
		if (this.#shouldShowInputArea()) {
			this.#showInputArea()
		} else {
			this.#hideInputArea()
		}
	}

	/**
	 * Show panel
	 */
	#show(): void {
		this.wrapper.style.display = 'block'
		// Force reflow to trigger animation
		void this.wrapper.offsetHeight
		this.wrapper.style.opacity = '1'
		this.wrapper.style.transform = 'translateX(-50%) translateY(0)'
	}

	/**
	 * Hide panel
	 */
	#hide(): void {
		this.wrapper.style.opacity = '0'
		this.wrapper.style.transform = 'translateX(-50%) translateY(20px)'
		this.wrapper.style.display = 'none'
	}

	/**
	 * Reset state
	 */
	#reset(): void {
		this.#state.reset()
		this.#statusText.textContent = this.#pageAgent.i18n.t('ui.panel.ready')
		this.#updateStatusIndicator('thinking')
		this.#updateHistory()
		this.#collapse()
		// Reset pause state
		this.#pageAgent.paused = false
		this.#updatePauseButton()
		// Reset user input state
		this.#isWaitingForUserAnswer = false
		this.#userAnswerResolver = null
		// Show input area
		this.#showInputArea()
	}

	/**
	 * Toggle pause state
	 */
	#togglePause(): void {
		this.#pageAgent.paused = !this.#pageAgent.paused
		this.#updatePauseButton()

		// Update status display
		if (this.#pageAgent.paused) {
			this.#statusText.textContent = this.#pageAgent.i18n.t('ui.panel.paused')
			this.#updateStatusIndicator('thinking') // Use existing thinking state
		} else {
			this.#statusText.textContent = this.#pageAgent.i18n.t('ui.panel.continueExecution')
			this.#updateStatusIndicator('tool_executing') // Restore to execution state
		}
	}

	/**
	 * Update pause button state
	 */
	#updatePauseButton(): void {
		if (this.#pageAgent.paused) {
			this.#pauseButton.textContent = '▶'
			this.#pauseButton.title = this.#pageAgent.i18n.t('ui.panel.continue')
			this.#pauseButton.classList.add(styles.paused)
		} else {
			this.#pauseButton.textContent = '⏸︎'
			this.#pauseButton.title = this.#pageAgent.i18n.t('ui.panel.pause')
			this.#pauseButton.classList.remove(styles.paused)
		}
	}

	/**
	 * Stop Agent
	 */
	#stopAgent(): void {
		// Update status display
		this.#update({
			type: 'error',
			displayText: this.#pageAgent.i18n.t('ui.panel.taskTerminated'),
		})

		this.#pageAgent.dispose()
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
			this.#pageAgent.execute(input)
		}
	}

	/**
	 * Handle user answer
	 */
	#handleUserAnswer(input: string): void {
		// Add user input to history
		this.#update({
			type: 'input',
			displayText: this.#pageAgent.i18n.t('ui.panel.userAnswer', { input }),
		})

		// Reset state
		this.#isWaitingForUserAnswer = false

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
		this.#taskInput.placeholder = placeholder || this.#pageAgent.i18n.t('ui.panel.taskInput')
		this.#inputSection.classList.remove(styles.hidden)
		// Focus on input field
		setTimeout(() => {
			this.#taskInput.focus()
		}, 100)
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

		const steps = this.#state.getAllSteps()
		if (steps.length === 0) {
			return true // Initial state
		}

		const lastStep = steps[steps.length - 1]
		return lastStep.type === 'completed' || lastStep.type === 'error'
	}

	#createWrapper(): HTMLElement {
		const wrapper = document.createElement('div')
		wrapper.id = 'page-agent-runtime_agent-panel'
		wrapper.className = `${styles.wrapper} ${styles.collapsed}`
		wrapper.setAttribute('data-browser-use-ignore', 'true')

		wrapper.innerHTML = `
			<div class="${styles.background}"></div>
			<div class="${styles.historySectionWrapper}">
				<div class="${styles.historySection}">
					${this.#createHistoryItem({
						id: 'placeholder',
						stepNumber: 0,
						timestamp: new Date(),
						type: 'thinking',
						displayText: this.#pageAgent.i18n.t('ui.panel.waitingPlaceholder'),
					})}
				</div>
			</div>
			<div class="${styles.header}">
				<div class="${styles.statusSection}">
					<div class="${styles.indicator} ${styles.thinking}"></div>
					<div class="${styles.statusText}">${this.#pageAgent.i18n.t('ui.panel.ready')}</div>
				</div>
				<div class="${styles.controls}">
					<button class="${styles.controlButton} ${styles.expandButton}" title="${this.#pageAgent.i18n.t('ui.panel.expand')}">
						▼
					</button>
					<button class="${styles.controlButton} ${styles.pauseButton}" title="${this.#pageAgent.i18n.t('ui.panel.pause')}">
						⏸︎
					</button>
					<button class="${styles.controlButton} ${styles.stopButton}" title="${this.#pageAgent.i18n.t('ui.panel.stop')}">
						X
					</button>
				</div>
			</div>
			<div class="${styles.inputSectionWrapper} ${styles.hidden}">
				<div class="${styles.inputSection}">
					<input 
						type="text" 
						class="${styles.taskInput}" 
						maxlength="200"
					/>
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

		// Pause/continue button
		this.#pauseButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#togglePause()
		})

		// Stop button
		this.#stopButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#stopAgent()
		})

		// Submit on Enter key in input field
		this.#taskInput.addEventListener('keydown', (e) => {
			if (e.isComposing) return // Ignore IME composition keys
			if (e.key === 'Enter') {
				e.preventDefault()
				this.#submitTask()
			}
		})

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
		this.wrapper.classList.remove(styles.collapsed)
		this.wrapper.classList.add(styles.expanded)
		this.#expandButton.textContent = '▲'
	}

	#collapse(): void {
		this.#isExpanded = false
		this.wrapper.classList.remove(styles.expanded)
		this.wrapper.classList.add(styles.collapsed)
		this.#expandButton.textContent = '▼'
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

	#updateStatusIndicator(type: Step['type']): void {
		// Clear all status classes
		this.#indicator.className = styles.indicator

		// Add corresponding status class
		this.#indicator.classList.add(styles[type])
	}

	#updateHistory(): void {
		const steps = this.#state.getAllSteps()

		this.#historySection.innerHTML = steps.map((step) => this.#createHistoryItem(step)).join('')

		// Scroll to bottom to show latest records
		this.#scrollToBottom()
	}

	#scrollToBottom(): void {
		// Execute in next event loop to ensure DOM update completion
		setTimeout(() => {
			this.#historySection.scrollTop = this.#historySection.scrollHeight
		}, 0)
	}

	#createHistoryItem(step: Step): string {
		const time = step.timestamp.toLocaleTimeString('zh-CN', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})

		let typeClass = ''
		let statusIcon = ''

		// Set styles and icons based on step type
		if (step.type === 'completed') {
			// Check if this is a result from done tool
			if (step.toolName === 'done') {
				// Judge success or failure based on result
				const failureKeyword = this.#pageAgent.i18n.t('ui.tools.resultFailure')
				const errorKeyword = this.#pageAgent.i18n.t('ui.tools.resultError')
				const isSuccess =
					!step.toolResult ||
					(!step.toolResult.includes(failureKeyword) && !step.toolResult.includes(errorKeyword))
				typeClass = isSuccess ? styles.doneSuccess : styles.doneError
				statusIcon = isSuccess ? '🎉' : '❌'
			} else {
				typeClass = styles.completed
				statusIcon = '✅'
			}
		} else if (step.type === 'error') {
			typeClass = styles.error
			statusIcon = '❌'
		} else if (step.type === 'tool_executing') {
			statusIcon = '⚙️'
		} else if (step.type === 'output') {
			typeClass = styles.output
			statusIcon = '🤖'
		} else if (step.type === 'input') {
			typeClass = styles.input
			statusIcon = '🎯'
		} else if (step.type === 'retry') {
			typeClass = styles.retry
			statusIcon = '🔄'
		} else {
			statusIcon = '🧠'
		}

		const durationText = step.duration ? ` · ${step.duration}ms` : ''
		const stepLabel = this.#pageAgent.i18n.t('ui.panel.step', {
			number: step.stepNumber.toString(),
			time,
			duration: durationText || '', // Explicitly pass empty string to replace template
		})

		return `
			<div class="${styles.historyItem} ${typeClass}">
				<div class="${styles.historyContent}">
					<span class="${styles.statusIcon}">${statusIcon}</span>
					<span>${step.displayText}</span>
				</div>
				<div class="${styles.historyMeta}">
					${stepLabel}
				</div>
			</div>
		`
	}
}

/**
 * Get display text for tool execution
 */
export function getToolExecutingText(toolName: string, args: any, i18n: I18n): string {
	switch (toolName) {
		case 'click_element_by_index':
			return i18n.t('ui.tools.clicking', { index: args.index })
		case 'input_text':
			return i18n.t('ui.tools.inputting', { index: args.index })
		case 'select_dropdown_option':
			return i18n.t('ui.tools.selecting', { text: args.text })
		case 'scroll':
			return i18n.t('ui.tools.scrolling')
		case 'wait':
			return i18n.t('ui.tools.waiting', { seconds: args.seconds })
		case 'done':
			return i18n.t('ui.tools.done')
		default:
			return i18n.t('ui.tools.executing', { toolName })
	}
}

/**
 * Get display text for tool completion
 */
export function getToolCompletedText(toolName: string, args: any, i18n: I18n): string | null {
	switch (toolName) {
		case 'click_element_by_index':
			return i18n.t('ui.tools.clicked', { index: args.index })
		case 'input_text':
			return i18n.t('ui.tools.inputted', { text: args.text })
		case 'select_dropdown_option':
			return i18n.t('ui.tools.selected', { text: args.text })
		case 'scroll':
			return i18n.t('ui.tools.scrolled')
		case 'wait':
			return i18n.t('ui.tools.waited')
		case 'done':
			return null
		default:
			return null
	}
}
