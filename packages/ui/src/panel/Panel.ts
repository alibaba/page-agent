import { I18n, type SupportedLanguage } from '../i18n'
import { truncate } from '../utils'
import { createCard, createReflectionLines } from './cards'
import { DRAG_THRESHOLD, type DragOffset, clampDragOffset } from './drag'
import type { AgentActivity, PanelAgentAdapter } from './types'

import styles from './Panel.module.css'

/**
 * Drag offset carried in the wrapper transform.
 *
 * show()/hide() set `transform` inline, which overrides the class rule, so both
 * must re-append this or the panel would jump back to its default position.
 */
const DRAG_TRANSFORM = 'translate(var(--drag-x, 0px), var(--drag-y, 0px))'

/** How long the wrapper's entrance takes, matching `transition` in Panel.module.css */
const ENTRANCE_MS = 300

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
	#taskInput: HTMLInputElement

	#agent: PanelAgentAdapter
	#config: PanelConfig
	#isExpanded = false
	#i18n: I18n
	#userAnswerResolver: ((input: string) => void) | null = null
	#isWaitingForUserAnswer: boolean = false
	#headerUpdateTimer: ReturnType<typeof setInterval> | null = null
	#pendingHeaderText: string | null = null
	#isAnimating = false
	/** Current drag offset, mirrored into `--drag-x` / `--drag-y` */
	#dragOffset: DragOffset = { x: 0, y: 0 }
	/**
	 * Set when a gesture ends after really dragging, cleared by the next press
	 * and consumed by the click that follows the gesture.
	 *
	 * A flag rather than a one-shot listener on the header: a gesture that ends in
	 * `pointercancel` (touch interrupted, palm rejected) is followed by no click at
	 * all, so a listener would survive and swallow the user's next genuine press.
	 */
	#draggedSincePress = false
	/**
	 * Tears down the gesture currently in flight, or `null` when none is.
	 *
	 * The move/end handlers live on `window` for the length of one gesture, so a
	 * `dispose()` mid-drag would otherwise leave them attached to a panel that is
	 * already off the page, still writing offsets to the detached wrapper.
	 */
	#endActiveDrag: (() => void) | null = null
	/** Pending post-entrance re-clamp scheduled by `show()` */
	#entranceTimer: ReturnType<typeof setTimeout> | null = null

	// Event handlers (bound for removal)
	#onStatusChange = () => this.#handleStatusChange()
	#onHistoryChange = () => this.#handleHistoryChange()
	#onActivity = (e: Event) => this.#handleActivity((e as CustomEvent<AgentActivity>).detail)
	#onAgentDispose = () => this.dispose()
	/**
	 * Re-clamp on resize, or shrinking the window would strand the panel off-screen.
	 *
	 * Not while the entrance is still running: that measures the box mid-animation,
	 * which is the same reading `show()` refuses to trust. The re-clamp already
	 * scheduled for when it settles sees the new viewport anyway.
	 */
	#onWindowResize = () => {
		if (this.#entranceTimer !== null) return
		this.#setDragOffset(this.#dragOffset)
	}

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
		this.#agent.onAskUser = (question, options) => this.#askUser(question, options?.signal)

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
		window.addEventListener('resize', this.#onWindowResize)

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

		// Morph action button: running = stop (■), not running = close (X)
		if (status === 'running') {
			this.#actionButton.textContent = '■'
			this.#actionButton.title = this.#i18n.t('ui.panel.stop')
		} else {
			this.#actionButton.textContent = 'X'
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
				this.#pendingHeaderText = truncate(activity.output, 50)
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
	 * Rejects when `signal` aborts (task stopped or disposed), cleaning up the
	 * question card and pending state so the agent loop can settle.
	 */
	#askUser(question: string, signal?: AbortSignal): Promise<string> {
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
				icon: '❓',
				content: `Question: ${question}`,
				type: 'question',
			})
			const cardElement = tempCard.firstElementChild as HTMLElement
			cardElement.setAttribute('data-temp-card', 'true')
			this.#historySection.appendChild(cardElement)
			this.#scrollToBottom()

			this.#showInputArea(this.#i18n.t('ui.panel.userAnswerPrompt'))

			signal?.addEventListener(
				'abort',
				() => {
					this.#removeTempCards()
					this.#isWaitingForUserAnswer = false
					this.#userAnswerResolver = null
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
		this.wrapper.style.transform = `translateX(-50%) translateY(0) ${DRAG_TRANSFORM}`
		// A hidden panel measures zero, so resizes that happened while it was hidden
		// never re-clamped it. Do that here, or a shrunken window strands the panel
		// off-screen with its only drag handle out of reach.
		//
		// Once the entrance has settled, not now: `getBoundingClientRect()` reports
		// the box as it is being animated, which puts the base a whole entrance
		// offset out. A panel left against the bottom edge would then be clamped
		// that far up by every hide/show.
		this.#reclampWhenEntranceSettles()
	}

	hide(): void {
		// Hidden again before the entrance settled: nothing left to measure
		this.#cancelEntranceReclamp()
		this.wrapper.style.opacity = '0'
		this.wrapper.style.transform = `translateX(-50%) translateY(20px) ${DRAG_TRANSFORM}`
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
		window.removeEventListener('resize', this.#onWindowResize)
		this.#endActiveDrag?.()
		this.#cancelEntranceReclamp()

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
		wrapper.id = 'page-agent-runtime_agent-panel'
		wrapper.className = styles.wrapper
		wrapper.setAttribute('data-browser-use-ignore', 'true')
		wrapper.setAttribute('data-page-agent-ignore', 'true')

		wrapper.innerHTML = `
			<div class="${styles.background}"></div>
			<div class="${styles.historySectionWrapper}">
				<div class="${styles.historySection}">
					<div class="${styles.historyItem}">
						<div class="${styles.historyContent}">
							<span class="${styles.statusIcon}">🧠</span>
							<span>${this.#i18n.t('ui.panel.waitingPlaceholder')}</span>
						</div>
					</div>
				</div>
			</div>
			<div class="${styles.header}">
				<div class="${styles.statusSection}">
					<div class="${styles.indicator} ${styles.thinking}"></div>
					<div class="${styles.statusText}">${this.#i18n.t('ui.panel.ready')}</div>
				</div>
				<div class="${styles.controls}">
					<button class="${styles.controlButton} ${styles.expandButton}" title="${this.#i18n.t('ui.panel.expand')}">
						▼
					</button>
					<button class="${styles.controlButton} ${styles.stopButton}" title="${this.#i18n.t('ui.panel.close')}">
						X
					</button>
				</div>
			</div>
			<div class="${styles.inputSectionWrapper} ${styles.hidden}">
				<div class="${styles.inputSection}">
					<input 
						type="text" 
						class="${styles.taskInput}" 
						maxlength="${taskInputMaxLength}"
					/>
				</div>
			</div>
		`

		document.body.appendChild(wrapper)
		return wrapper
	}

	#setupEventListeners(): void {
		// Click header area to expand/collapse
		const header = this.wrapper.querySelector<HTMLElement>(`.${styles.header}`)!
		this.#setupDragging(header)
		header.addEventListener('click', (e) => {
			// The click that ends a drag must not toggle as well. Read and clear, so
			// the very next click works normally.
			if (this.#draggedSincePress) {
				this.#draggedSincePress = false
				return
			}
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
			}
		})

		// Prevent input area click event bubbling
		this.#inputSection.addEventListener('click', (e) => {
			e.stopPropagation()
		})
	}

	/**
	 * Make the panel draggable by its header.
	 *
	 * Pointer Events cover mouse, touch and pen with one code path. A press only
	 * becomes a drag once it travels past `DRAG_THRESHOLD`; below that it stays a
	 * plain click and still toggles expand/collapse.
	 */
	#setupDragging(header: HTMLElement): void {
		header.addEventListener('pointerdown', (e: PointerEvent) => {
			if (e.button !== 0) return // primary button / contact only
			// A second finger must not hijack a drag already in progress
			if (!e.isPrimary) return
			// Nor a second primary pointer. A mouse and a pen are primary at the same
			// time, so the guard above lets both through, and the later press would
			// overwrite the teardown handle for the gesture still running — leaving
			// its listeners with nothing able to remove them.
			if (this.#endActiveDrag) return

			// Every press that could produce a click clears the flag: a cancelled drag
			// leaves it set, and no click reaches the header without a pointerdown
			// first. Deliberately after the two guards above, since a secondary button
			// or a second finger landing between a drag's `pointerup` and its trailing
			// `click` would otherwise clear the flag early and let that click toggle
			// after all.
			this.#draggedSincePress = false

			// Let the control buttons keep their own behaviour
			if ((e.target as HTMLElement).closest(`.${styles.controlButton}`)) return

			const origin = { ...this.#dragOffset }
			let dragging = false

			// Keeps the gesture alive when the pointer leaves the header.
			// Absent in some test DOMs and old browsers, hence the guard.
			header.setPointerCapture?.(e.pointerId)

			const onMove = (ev: PointerEvent) => {
				if (ev.pointerId !== e.pointerId) return
				const dx = ev.clientX - e.clientX
				const dy = ev.clientY - e.clientY

				if (!dragging) {
					if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
					dragging = true
					this.wrapper.classList.add(styles.dragging)
				}

				this.#setDragOffset({ x: origin.x + dx, y: origin.y + dy })
			}

			const detach = () => {
				window.removeEventListener('pointermove', onMove)
				window.removeEventListener('pointerup', onEnd)
				window.removeEventListener('pointercancel', onEnd)
				this.#endActiveDrag = null
			}

			const onEnd = (ev: PointerEvent) => {
				if (ev.pointerId !== e.pointerId) return
				detach()

				if (!dragging) return
				this.wrapper.classList.remove(styles.dragging)
				// A `pointerup` after a real drag is followed by a `click` on the header;
				// the header's click handler consumes this flag instead of toggling.
				this.#draggedSincePress = true
			}

			window.addEventListener('pointermove', onMove)
			window.addEventListener('pointerup', onEnd)
			window.addEventListener('pointercancel', onEnd)
			// `dispose()` can land mid-gesture; give it a way to drop these again.
			this.#endActiveDrag = detach
		})
	}

	/**
	 * Re-clamp once the entrance transition has finished.
	 *
	 * Timed rather than driven by `transitionend`: the wrapper transitions several
	 * properties, and a panel shown while already visible fires nothing at all.
	 */
	#reclampWhenEntranceSettles(): void {
		this.#cancelEntranceReclamp()
		this.#entranceTimer = setTimeout(() => {
			this.#entranceTimer = null
			this.#setDragOffset(this.#dragOffset)
		}, ENTRANCE_MS)
	}

	#cancelEntranceReclamp(): void {
		if (this.#entranceTimer === null) return
		clearTimeout(this.#entranceTimer)
		this.#entranceTimer = null
	}

	/**
	 * Clamp `next` into the viewport and write it to the CSS custom properties.
	 *
	 * The measured box is the wrapper — the collapsed header — not the expanded
	 * panel: the history list and input row are absolutely positioned siblings that
	 * sit outside it. Clamping their union would make a tall history exceed the
	 * viewport and lock the drag through `clampDragOffset`'s degenerate branch,
	 * which is far worse than letting them clip while the handle stays grabbable.
	 *
	 * The cost lands on the input row, which sits below the header: at the bottom
	 * clamp only its top few pixels remain on screen, so a panel parked there
	 * cannot be typed into until it is dragged back up. Reserving its height would
	 * mean clamping against a box that changes with the panel's own state, so this
	 * stays a known limitation rather than a special case here.
	 */
	/**
	 * The box to clamp the panel inside.
	 *
	 * `documentElement.clientWidth/Height` is the layout viewport, which leaves out
	 * a classic scrollbar; `innerWidth/Height` counts it, so the panel's edge would
	 * come to rest underneath one.
	 *
	 * Capped by the window all the same. In quirks mode `clientHeight` is the
	 * `<html>` box rather than the viewport, so on a long page it reads as the whole
	 * document and the panel could be dragged below the fold with nothing to stop
	 * it. Zero means an environment that lays nothing out, where only the window is
	 * meaningful.
	 */
	#viewportSize(): { width: number; height: number } {
		const doc = document.documentElement
		return {
			width: Math.min(doc.clientWidth || window.innerWidth, window.innerWidth),
			height: Math.min(doc.clientHeight || window.innerHeight, window.innerHeight),
		}
	}

	#setDragOffset(next: DragOffset): void {
		const rect = this.wrapper.getBoundingClientRect()
		// A zero-size rect means the panel is not rendered (e.g. hidden). Clamping
		// against it would move the panel for no reason, so keep the offset as is.
		// Either axis being zero is enough: clamping the other one against a zero
		// size lets the panel travel a full box-width past the viewport edge.
		if (rect.width === 0 || rect.height === 0) return

		this.#dragOffset = clampDragOffset(
			next,
			{
				// The rect already includes the current offset; undo it to get the base box.
				left: rect.left - this.#dragOffset.x,
				top: rect.top - this.#dragOffset.y,
				width: rect.width,
				height: rect.height,
			},
			this.#viewportSize()
		)

		this.wrapper.style.setProperty('--drag-x', `${this.#dragOffset.x}px`)
		this.wrapper.style.setProperty('--drag-y', `${this.#dragOffset.y}px`)
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
		this.#expandButton.textContent = '▲'
	}

	#collapse(): void {
		this.#isExpanded = false
		this.wrapper.classList.remove(styles.expanded)
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
		return createCard({ icon: '🎯', content: task, type: 'input' })
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
				const lines = createReflectionLines(event.reflection)
				if (lines.length > 0) {
					cards.push(createCard({ icon: '🧠', content: lines, meta }))
				}
			}

			// Action card
			const action = event.action
			if (action) {
				cards.push(...this.#createActionCards(action, meta))
			}
		} else if (event.type === 'observation') {
			cards.push(
				createCard({ icon: '👁️', content: event.content || '', meta, type: 'observation' })
			)
		} else if (event.type === 'user_takeover') {
			cards.push(createCard({ icon: '👤', content: 'User takeover', meta, type: 'input' }))
		} else if (event.type === 'retry') {
			const retryInfo = `${event.message || 'Retrying'} (${event.attempt}/${event.maxAttempts})`
			cards.push(createCard({ icon: '🔄', content: retryInfo, meta, type: 'observation' }))
		} else if (event.type === 'error') {
			cards.push(
				createCard({ icon: '❌', content: event.message || 'Error', meta, type: 'observation' })
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
				cards.push(createCard({ icon: '🤖', content: text, meta, type: 'output' }))
			}
		} else if (action.name === 'ask_user') {
			const input = action.input as { question?: string }
			const answer = action.output.replace(/^User answered:\s*/i, '')
			cards.push(
				createCard({
					icon: '❓',
					content: `Question: ${input.question || ''}`,
					meta,
					type: 'question',
				})
			)
			cards.push(createCard({ icon: '💬', content: `Answer: ${answer}`, meta, type: 'input' }))
		} else {
			const toolText = this.#getToolExecutingText(action.name, action.input)
			cards.push(createCard({ icon: '🔨', content: toolText, meta }))
			if (action.output?.length > 0) {
				cards.push(createCard({ icon: '🔨', content: action.output, meta, type: 'output' }))
			}
		}

		return cards
	}
}
