import { Motion } from 'ai-motion'

import { isPageDark } from '../utils/checkDarkMode'

import styles from './SimulatorMask.module.css'
import cursorStyles from './cursor.module.css'

export class SimulatorMask {
	wrapper = document.createElement('div')
	motion = new Motion({
		mode: isPageDark() ? 'dark' : 'light',
		styles: {
			position: 'absolute',
			inset: '0',
		},
	})

	#cursor = document.createElement('div')

	#currentCursorX = 0
	#currentCursorY = 0

	#targetCursorX = 0
	#targetCursorY = 0

	constructor() {
		this.wrapper.id = 'page-agent-runtime_simulator-mask'
		this.wrapper.className = styles.wrapper
		this.wrapper.setAttribute('data-browser-use-ignore', 'true')

		this.wrapper.appendChild(this.motion.element)
		this.motion.autoResize(this.wrapper)

		// Capture all mouse, keyboard, and wheel events
		this.wrapper.addEventListener('click', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mousedown', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mouseup', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('mousemove', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('wheel', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('keydown', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})
		this.wrapper.addEventListener('keyup', (e) => {
			e.stopPropagation()
			e.preventDefault()
		})

		// Create AI cursor
		this.#createCursor()
		// this.show()

		document.body.appendChild(this.wrapper)

		this.#moveCursorToTarget()

		window.addEventListener('PageAgent::MovePointerTo', (event: Event) => {
			const { x, y } = (event as CustomEvent).detail
			this.setCursorPosition(x, y)
		})

		window.addEventListener('PageAgent::ClickPointer', (event: Event) => {
			this.triggerClickAnimation()
		})
	}

	#createCursor() {
		this.#cursor.className = cursorStyles.cursor

		// Create ripple effect container
		const rippleContainer = document.createElement('div')
		rippleContainer.className = cursorStyles.cursorRipple
		this.#cursor.appendChild(rippleContainer)

		// Create filling layer
		const fillingLayer = document.createElement('div')
		fillingLayer.className = cursorStyles.cursorFilling
		this.#cursor.appendChild(fillingLayer)

		// Create border layer
		const borderLayer = document.createElement('div')
		borderLayer.className = cursorStyles.cursorBorder
		this.#cursor.appendChild(borderLayer)

		this.wrapper.appendChild(this.#cursor)
	}

	#moveCursorToTarget() {
		const newX = this.#currentCursorX + (this.#targetCursorX - this.#currentCursorX) * 0.2
		const newY = this.#currentCursorY + (this.#targetCursorY - this.#currentCursorY) * 0.2

		const xDistance = Math.abs(newX - this.#targetCursorX)
		if (xDistance > 0) {
			if (xDistance < 2) {
				this.#currentCursorX = this.#targetCursorX
			} else {
				this.#currentCursorX = newX
			}
			this.#cursor.style.left = `${this.#currentCursorX}px`
		}

		const yDistance = Math.abs(newY - this.#targetCursorY)
		if (yDistance > 0) {
			if (yDistance < 2) {
				this.#currentCursorY = this.#targetCursorY
			} else {
				this.#currentCursorY = newY
			}
			this.#cursor.style.top = `${this.#currentCursorY}px`
		}

		requestAnimationFrame(() => this.#moveCursorToTarget())
	}

	setCursorPosition(x: number, y: number) {
		this.#targetCursorX = x
		this.#targetCursorY = y
	}

	triggerClickAnimation() {
		this.#cursor.classList.remove(cursorStyles.clicking)
		// Force reflow to restart animation
		void this.#cursor.offsetHeight
		this.#cursor.classList.add(cursorStyles.clicking)
	}

	show() {
		this.motion.start()
		this.motion.fadeIn()

		this.wrapper.style.display = 'block'

		// Initialize cursor position
		this.#currentCursorX = window.innerWidth / 2
		this.#currentCursorY = window.innerHeight / 2
		this.#targetCursorX = this.#currentCursorX
		this.#targetCursorY = this.#currentCursorY
		this.#cursor.style.left = `${this.#currentCursorX}px`
		this.#cursor.style.top = `${this.#currentCursorY}px`
	}

	hide() {
		this.motion.fadeOut()
		this.motion.pause()

		this.#cursor.classList.remove(cursorStyles.clicking)

		setTimeout(() => {
			this.wrapper.style.display = 'none'
		}, 800) // Match the animation duration
	}

	dispose() {
		this.motion.dispose()
		this.wrapper.remove()
	}
}
