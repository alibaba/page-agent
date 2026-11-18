import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SimulatorMask } from './SimulatorMask'

import styles from './SimulatorMask.module.css'

const wrapper = () => document.getElementById('page-agent-runtime_simulator-mask')

describe('SimulatorMask', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		wrapper()?.remove()
	})

	it('keeps the mask visible when show() is called during the fade-out window', () => {
		const mask = new SimulatorMask()

		mask.show()
		expect(mask.shown).toBe(true)
		expect(wrapper()?.className).toContain(styles.visible)

		mask.hide()
		expect(mask.shown).toBe(false)
		// wrapper stays visible during the fade-out animation
		expect(wrapper()?.className).toContain(styles.visible)

		// re-show within the 800ms fade-out window
		vi.advanceTimersByTime(300)
		mask.show()
		expect(mask.shown).toBe(true)

		// the stale hide timer must not hide the re-shown mask
		vi.advanceTimersByTime(1000)
		expect(wrapper()?.className).toContain(styles.visible)
		expect(mask.shown).toBe(true)
	})

	it('removes the visible class after the fade-out when not re-shown', () => {
		const mask = new SimulatorMask()

		mask.show()
		mask.hide()
		vi.advanceTimersByTime(900)

		expect(wrapper()?.className).not.toContain(styles.visible)
		expect(mask.shown).toBe(false)
	})

	it('supports repeated show/hide cycles', () => {
		const mask = new SimulatorMask()

		for (let i = 0; i < 3; i++) {
			mask.show()
			expect(wrapper()?.className).toContain(styles.visible)
			mask.hide()
			vi.advanceTimersByTime(900)
			expect(wrapper()?.className).not.toContain(styles.visible)
		}
	})
})
