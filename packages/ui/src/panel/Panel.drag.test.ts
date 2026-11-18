import { afterEach, describe, expect, it, vi } from 'vitest'

import { Panel } from './Panel'
import type { PanelAgentAdapter } from './types'

import styles from './Panel.module.css'

/** Minimal agent stub - Panel only needs the PanelAgentAdapter surface */
class FakeAgent extends EventTarget implements PanelAgentAdapter {
	status: PanelAgentAdapter['status'] = 'idle'
	lastResult = null
	history: PanelAgentAdapter['history'] = []
	task = ''
	execute = vi.fn(async () => undefined)
	stop = vi.fn(async () => undefined)
	dispose = vi.fn(() => undefined)
}

/** The panel's box with a zero drag offset: 360x40, bottom-centre of 1024x768 */
const BASE = { top: 660, width: 360, height: 40 }
// Resulting bounds at 1024x768 (margin 8): x in [-324, 324], y in [-652, 60]

/**
 * Where `left: 50%` + `translateX(-50%)` puts the panel: centred, so the base box
 * moves whenever the viewport width does.
 *
 * Derived rather than fixed. A constant would hold the pre-resize geometry after
 * a test shrinks the window, and the re-clamp assertions would then be checking a
 * box no browser would ever lay out.
 */
const baseLeft = () => (window.innerWidth - BASE.width) / 2

/** Matches `ENTRANCE_MS` in Panel.ts */
const ENTRANCE_MS = 300

/**
 * How far the entrance transition still has to travel, in px.
 *
 * A real browser reports the box where it is being animated to, so anything
 * measuring during the entrance reads it this far from where it will settle.
 */
let entranceShift = 0

let active: Panel | null = null

function mount() {
	const panel = new Panel(new FakeAgent())
	active = panel
	const wrapper = panel.wrapper
	const header = wrapper.querySelector<HTMLElement>(`.${styles.header}`)!

	// The panel starts hidden; production only ever drags a visible one. Shown
	// before the stub is installed, so this first clamp reads happy-dom's own
	// zero rect and leaves the custom properties unset, as an untouched panel has.
	panel.show()

	// happy-dom has no layout engine, so stand in for one. The rect tracks the
	// drag offset exactly as a real browser's would, collapses to zero while the
	// panel is hidden, as a real `display: none` box does, and carries
	// `entranceShift` while the entrance transition is still running.
	wrapper.getBoundingClientRect = () => {
		if (wrapper.style.display === 'none') return new DOMRect()
		const x = parseFloat(wrapper.style.getPropertyValue('--drag-x') || '0')
		const y = parseFloat(wrapper.style.getPropertyValue('--drag-y') || '0') + entranceShift
		const left = baseLeft()
		return {
			left: left + x,
			top: BASE.top + y,
			right: left + x + BASE.width,
			bottom: BASE.top + y + BASE.height,
			x: left + x,
			y: BASE.top + y,
			width: BASE.width,
			height: BASE.height,
			toJSON: () => ({}),
		} as DOMRect
	}

	return { panel, wrapper, header }
}

function pointer(
	type: string,
	clientX: number,
	clientY: number,
	button = 0,
	init: PointerEventInit = {}
): PointerEvent {
	return new PointerEvent(type, {
		bubbles: true,
		clientX,
		clientY,
		button,
		pointerId: 1,
		isPrimary: true,
		...init,
	})
}

/** Press the header at (0,0), move by (dx,dy), release, then let the click fire */
function drag(header: HTMLElement, dx: number, dy: number) {
	header.dispatchEvent(pointer('pointerdown', 0, 0))
	window.dispatchEvent(pointer('pointermove', dx, dy))
	window.dispatchEvent(pointer('pointerup', dx, dy))
	// Browsers fire `click` on the header after the gesture ends
	header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

/** Resize the happy-dom viewport (not part of the standard Window type) */
function setViewportWidth(width: number): void {
	;(
		window as unknown as { happyDOM: { setViewport(v: { width: number }): void } }
	).happyDOM.setViewport({ width })
}

const offsetOf = (wrapper: HTMLElement) => ({
	x: wrapper.style.getPropertyValue('--drag-x'),
	y: wrapper.style.getPropertyValue('--drag-y'),
})

afterEach(() => {
	active?.dispose()
	active = null
	document.body.innerHTML = ''
	// Reset shared globals here rather than at the end of each test, or the first
	// failure leaks its viewport and entrance state into everything after it.
	entranceShift = 0
	setViewportWidth(1024)
	vi.useRealTimers()
})

describe('Panel dragging', () => {
	const gestures = [
		{ name: 'a press with no movement', dx: 0, dy: 0, isDrag: false },
		{ name: 'a 3px wobble stays under the threshold', dx: 3, dy: 0, isDrag: false },
		{ name: 'a 3px vertical wobble stays under the threshold', dx: 0, dy: -3, isDrag: false },
		{ name: 'exactly 4px reaches the threshold', dx: 4, dy: 0, isDrag: true },
		{ name: '3px on both axes exceeds the 4px radius', dx: 3, dy: 3, isDrag: true },
		// 2+3 sums to 4 but measures 3.6 across: a Manhattan or per-axis test would
		// start dragging here, a Euclidean radius keeps it a click.
		{ name: 'a 2x3px diagonal stays inside the 4px radius', dx: 2, dy: 3, isDrag: false },
		{ name: 'a drag to the right', dx: 120, dy: 0, isDrag: true },
		{ name: 'a drag up and to the left', dx: -80, dy: -40, isDrag: true },
		{ name: 'a drag down', dx: 0, dy: 50, isDrag: true },
	]

	it.each(gestures)('$name (moves the panel: $isDrag)', ({ dx, dy, isDrag }) => {
		const { wrapper, header } = mount()
		expect(wrapper.classList.contains(styles.expanded)).toBe(false)

		drag(header, dx, dy)

		// A drag moves the panel; a click leaves the offset untouched
		expect(offsetOf(wrapper)).toEqual(isDrag ? { x: `${dx}px`, y: `${dy}px` } : { x: '', y: '' })
		// ...and exactly one of the two behaviours happens: drag or toggle, never both
		expect(wrapper.classList.contains(styles.expanded)).toBe(!isDrag)
	})

	it('clamps a drag that would leave the viewport', () => {
		const { wrapper, header } = mount()

		drag(header, 5000, 5000)

		// x maxes out at 1024 - 8 - 360 - 332, y at 768 - 8 - 40 - 660
		expect(offsetOf(wrapper)).toEqual({ x: '324px', y: '60px' })
	})

	it('keeps accumulated offset across successive drags', () => {
		const { wrapper, header } = mount()

		drag(header, 50, 20)
		drag(header, -30, 10)

		expect(offsetOf(wrapper)).toEqual({ x: '20px', y: '30px' })
	})

	const endEvents = ['pointerup', 'pointercancel']
	it.each(endEvents)('adds the dragging class on drag start and drops it on %s', (end) => {
		const { wrapper, header } = mount()

		header.dispatchEvent(pointer('pointerdown', 0, 0))
		expect(wrapper.classList.contains(styles.dragging)).toBe(false)

		window.dispatchEvent(pointer('pointermove', 60, 0))
		expect(wrapper.classList.contains(styles.dragging)).toBe(true)

		window.dispatchEvent(pointer(end, 60, 0))
		expect(wrapper.classList.contains(styles.dragging)).toBe(false)
		expect(offsetOf(wrapper).x).toBe('60px')
	})

	const nonStarters = [
		{ name: 'a secondary mouse button', button: 2, onButton: false },
		{ name: 'a press on a control button', button: 0, onButton: true },
	]
	it.each(nonStarters)('does not start a drag from $name', ({ button, onButton }) => {
		const { wrapper, header } = mount()
		const target = onButton
			? wrapper.querySelector<HTMLElement>(`.${styles.expandButton}`)!
			: header

		target.dispatchEvent(pointer('pointerdown', 0, 0, button))
		window.dispatchEvent(pointer('pointermove', 200, 100))
		window.dispatchEvent(pointer('pointerup', 200, 100))

		expect(offsetOf(wrapper)).toEqual({ x: '', y: '' })
		expect(wrapper.classList.contains(styles.dragging)).toBe(false)
	})

	it('leaves the control buttons working after a press on them', () => {
		const { wrapper } = mount()
		const expandButton = wrapper.querySelector<HTMLElement>(`.${styles.expandButton}`)!

		expandButton.dispatchEvent(pointer('pointerdown', 0, 0))
		expandButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(wrapper.classList.contains(styles.expanded)).toBe(true)
	})

	it('only suppresses the one click that ends a drag', () => {
		const { wrapper, header } = mount()

		drag(header, 100, 0) // drag: click suppressed
		expect(wrapper.classList.contains(styles.expanded)).toBe(false)

		header.dispatchEvent(new MouseEvent('click', { bubbles: true })) // plain click: works
		expect(wrapper.classList.contains(styles.expanded)).toBe(true)
	})

	// show()/hide() write `transform` inline, which beats the class rule. If they
	// drop the var() suffix the panel silently snaps back to its default spot.
	const visibility = [
		{ name: 'show', run: (p: Panel) => p.show() },
		{ name: 'hide', run: (p: Panel) => p.hide() },
	]
	it.each(visibility)('$name() after a drag preserves the drag offset', ({ run }) => {
		const { panel, wrapper, header } = mount()

		drag(header, 90, -70)
		run(panel)

		expect(offsetOf(wrapper)).toEqual({ x: '90px', y: '-70px' })
		expect(wrapper.style.transform).toContain('translate(var(--drag-x, 0px), var(--drag-y, 0px))')
	})

	// In quirks mode `documentElement.clientHeight` is the `<html>` box, so on a long
	// page it reports the whole document and there is nothing left to clamp against.
	it('never clamps against a viewport larger than the window', () => {
		const { wrapper, header } = mount()
		const clientHeight = vi
			.spyOn(document.documentElement, 'clientHeight', 'get')
			.mockReturnValue(3000) // a tall quirks-mode document in a 768px window

		try {
			drag(header, 0, 5000)

			// 768 - 8 - 40 - 660, not the 2292 the document height would allow
			expect(offsetOf(wrapper).y).toBe('60px')
		} finally {
			clientHeight.mockRestore()
		}
	})

	// `innerWidth` counts a classic scrollbar, the layout viewport does not. Using
	// the wider one parks the panel's edge underneath the scrollbar.
	it('clamps against the layout viewport, not the scrollbar-inclusive one', () => {
		const { wrapper, header } = mount()
		// 1024 wide with a 24px classic scrollbar
		const clientWidth = vi
			.spyOn(document.documentElement, 'clientWidth', 'get')
			.mockReturnValue(1000)

		try {
			drag(header, 5000, 0)

			// 1000 - 8 - 360 - baseLeft(332), rather than the 324 innerWidth would allow
			expect(offsetOf(wrapper).x).toBe('300px')
		} finally {
			clientWidth.mockRestore()
		}
	})

	it('re-clamps when the window shrinks', () => {
		vi.useFakeTimers()
		const { wrapper, header } = mount()
		vi.advanceTimersByTime(ENTRANCE_MS) // resizes are deferred until the entrance settles
		drag(header, 300, 0)
		expect(offsetOf(wrapper).x).toBe('300px')

		// Narrower window re-centres the panel at (700 - 360) / 2 = 170,
		// so x may now only reach 700 - 8 - 360 - 170 = 162
		setViewportWidth(700)
		window.dispatchEvent(new Event('resize'))

		expect(offsetOf(wrapper).x).toBe('162px')
	})

	// A gesture that ends in `pointercancel` produces no click, so anything left
	// armed to swallow one would eat the user's next real press instead.
	const cancelledGestures = [
		{ name: 'a cancelled drag', end: 'pointercancel', dx: 100 },
		{ name: 'a cancelled press below the threshold', end: 'pointercancel', dx: 2 },
	]
	it.each(cancelledGestures)('leaves the header clickable after $name', ({ end, dx }) => {
		const { wrapper, header } = mount()

		header.dispatchEvent(pointer('pointerdown', 0, 0))
		window.dispatchEvent(pointer('pointermove', dx, 0))
		window.dispatchEvent(pointer(end, dx, 0))

		// A fresh press-and-release must still toggle
		drag(header, 0, 0)
		expect(wrapper.classList.contains(styles.expanded)).toBe(true)
	})

	// The click that ends a drag lands on whatever is under the pointer, and
	// bubbles to the header from there.
	const clickTargets = [
		{ name: 'the header itself', selector: null },
		{ name: 'a header child', selector: 'statusSection' as const },
	]
	it.each(clickTargets)('suppresses the drag-ending click on $name', ({ selector }) => {
		const { wrapper, header } = mount()
		const target = selector ? wrapper.querySelector<HTMLElement>(`.${styles[selector]}`)! : header

		header.dispatchEvent(pointer('pointerdown', 0, 0))
		window.dispatchEvent(pointer('pointermove', 100, 0))
		window.dispatchEvent(pointer('pointerup', 100, 0))
		target.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(wrapper.classList.contains(styles.expanded)).toBe(false)
	})

	it('survives a second pointer lifting mid-drag', () => {
		// The second finger never gets a gesture, but the browser still fires its
		// `pointerup` at the window. Unguarded, that ends the drag the first finger
		// is still performing, and the panel stops following it while it is down.
		const { wrapper, header } = mount()

		header.dispatchEvent(pointer('pointerdown', 0, 0))
		window.dispatchEvent(pointer('pointermove', 100, 0))
		expect(offsetOf(wrapper).x).toBe('100px')

		const second = { pointerId: 2, isPrimary: false }
		header.dispatchEvent(pointer('pointerdown', 500, 0, 0, second))
		window.dispatchEvent(pointer('pointerup', 500, 0, 0, second))

		window.dispatchEvent(pointer('pointermove', 200, 0))
		expect(offsetOf(wrapper).x).toBe('200px')
	})

	it('ignores a second, non-primary pointer during a drag', () => {
		const { wrapper, header } = mount()

		header.dispatchEvent(pointer('pointerdown', 0, 0))
		window.dispatchEvent(pointer('pointermove', 100, 0))
		expect(offsetOf(wrapper).x).toBe('100px')

		// A second finger presses elsewhere and drags back: unguarded, its own
		// gesture would start from the current offset and yank the panel to -100px
		header.dispatchEvent(pointer('pointerdown', 500, 0, 0, { pointerId: 2, isPrimary: false }))
		window.dispatchEvent(pointer('pointermove', 300, 0, 0, { pointerId: 2, isPrimary: false }))
		expect(offsetOf(wrapper).x).toBe('100px')

		// ...and the first finger still owns the gesture
		window.dispatchEvent(pointer('pointermove', 140, 0))
		window.dispatchEvent(pointer('pointerup', 140, 0))
		expect(offsetOf(wrapper).x).toBe('140px')
	})

	it('does not move a hidden panel', () => {
		const { panel, wrapper, header } = mount()
		panel.hide()

		drag(header, 200, 100)

		// A hidden panel measures zero; clamping against that would move it blindly
		expect(offsetOf(wrapper)).toEqual({ x: '', y: '' })
	})

	// Measuring during the entrance reads a box that has not arrived yet. A panel
	// parked against the bottom margin would be clamped by the leftover travel on
	// every hide/show, walking it up the screen.
	it('does not clamp against the entrance transition', () => {
		vi.useFakeTimers()
		const { panel, wrapper, header } = mount()

		drag(header, 0, 5000) // park it against the bottom margin
		expect(offsetOf(wrapper).y).toBe('60px')

		panel.hide()
		entranceShift = 20 // the entrance starts as soon as show() is called
		panel.show()
		expect(offsetOf(wrapper).y).toBe('60px')

		entranceShift = 0 // ...and settles
		vi.advanceTimersByTime(ENTRANCE_MS)

		expect(offsetOf(wrapper).y).toBe('60px')
	})

	it('does not clamp a resize that lands during the entrance', () => {
		// The resize handler measures the same in-flight box `show()` refuses to
		// trust. Deferring to the re-clamp already scheduled for when the entrance
		// settles keeps one code path honest instead of two.
		vi.useFakeTimers()
		const { panel, wrapper, header } = mount()

		drag(header, 0, 5000) // park it against the bottom margin
		expect(offsetOf(wrapper).y).toBe('60px')

		panel.hide()
		entranceShift = 20
		panel.show()
		window.dispatchEvent(new Event('resize'))
		expect(offsetOf(wrapper).y).toBe('60px')

		entranceShift = 0
		vi.advanceTimersByTime(ENTRANCE_MS)

		expect(offsetOf(wrapper).y).toBe('60px')
	})

	it('re-clamps on show after the window shrank while hidden', () => {
		vi.useFakeTimers()
		const { panel, wrapper, header } = mount()
		drag(header, 300, 0)

		panel.hide()
		setViewportWidth(700)
		window.dispatchEvent(new Event('resize'))
		// The resize could not re-clamp: a hidden panel has no box to measure
		expect(offsetOf(wrapper).x).toBe('300px')

		panel.show()
		vi.advanceTimersByTime(ENTRANCE_MS)

		expect(offsetOf(wrapper).x).toBe('162px')
	})

	// A gesture is only half-owned by the panel: its move/end handlers live on
	// `window`. Disposing mid-drag has to take them with it, or they outlive the
	// panel holding a closure over a wrapper that is no longer on the page.
	//
	// Asserted as listener bookkeeping rather than by watching the offset: a real
	// browser measures a detached wrapper as 0x0, so `#setDragOffset` would bail
	// out on its own and hide a leak that is still there.
	it('ignores a second primary pointer, so no gesture outlives dispose()', () => {
		// A mouse and a pen report `isPrimary: true` at the same time, so the
		// primary guard does not separate them. The second press used to overwrite
		// the first gesture's teardown handle, and the first `pointerup` then
		// cleared it — leaving the second gesture's listeners with nothing able to
		// remove them.
		const pointerListeners: string[] = []
		const add = window.addEventListener.bind(window)
		const remove = window.removeEventListener.bind(window)
		const track = (set: 'add' | 'remove') => (type: string, fn: never, opts?: never) => {
			if (type.startsWith('pointer')) {
				if (set === 'add') pointerListeners.push(type)
				else pointerListeners.splice(pointerListeners.indexOf(type), 1)
			}
			return set === 'add' ? add(type, fn, opts) : remove(type, fn, opts)
		}
		window.addEventListener = track('add') as typeof window.addEventListener
		window.removeEventListener = track('remove') as typeof window.removeEventListener

		try {
			const { panel, header } = mount()

			header.dispatchEvent(pointer('pointerdown', 0, 0))
			window.dispatchEvent(pointer('pointermove', 60, 0))
			// A pen lands while the mouse is still down
			header.dispatchEvent(pointer('pointerdown', 0, 0, 0, { pointerId: 2 }))
			expect(pointerListeners).toEqual(['pointermove', 'pointerup', 'pointercancel'])

			// The mouse releases; the pen never got a gesture of its own to strand
			window.dispatchEvent(pointer('pointerup', 60, 0))
			panel.dispose()
			active = null

			expect(pointerListeners).toEqual([])
		} finally {
			window.addEventListener = add
			window.removeEventListener = remove
		}
	})

	it('detaches the in-flight gesture listeners when disposed mid-drag', () => {
		// `pointerup` and `pointercancel` share one handler, so registrations are
		// counted as (type, fn) pairs rather than by handler identity.
		const pointerListeners: string[] = []
		const add = window.addEventListener.bind(window)
		const remove = window.removeEventListener.bind(window)
		const track = (set: 'add' | 'remove') => (type: string, fn: never, opts?: never) => {
			if (type.startsWith('pointer')) {
				if (set === 'add') pointerListeners.push(type)
				else pointerListeners.splice(pointerListeners.indexOf(type), 1)
			}
			return set === 'add' ? add(type, fn, opts) : remove(type, fn, opts)
		}
		window.addEventListener = track('add') as typeof window.addEventListener
		window.removeEventListener = track('remove') as typeof window.removeEventListener

		try {
			const { panel, header } = mount()

			header.dispatchEvent(pointer('pointerdown', 0, 0))
			window.dispatchEvent(pointer('pointermove', 60, 0))
			expect(pointerListeners).toEqual(['pointermove', 'pointerup', 'pointercancel'])

			panel.dispose()
			active = null

			expect(pointerListeners).toEqual([])
		} finally {
			window.addEventListener = add
			window.removeEventListener = remove
		}
	})

	// A box with one zero axis is not a laid-out panel either, and clamping the
	// other axis against a zero size would let it travel a full width off-screen.
	const degenerateRects = [
		{ name: 'zero width', width: 0, height: 40 },
		{ name: 'zero height', width: 360, height: 0 },
		{ name: 'zero on both axes', width: 0, height: 0 },
	]
	it.each(degenerateRects)(
		'leaves the offset alone when the box has $name',
		({ width, height }) => {
			const { wrapper, header } = mount()

			wrapper.getBoundingClientRect = () =>
				({
					left: 332,
					top: 660,
					right: 332 + width,
					bottom: 660 + height,
					x: 332,
					y: 660,
					width,
					height,
					toJSON: () => ({}),
				}) as DOMRect

			drag(header, 5000, 5000)

			expect(offsetOf(wrapper)).toEqual({ x: '', y: '' })
		}
	)

	// The trailing click of a drag is queued behind the `pointerup`. A press that
	// cannot start a gesture must not clear the suppression flag in that gap, or
	// the drag ends up toggling the panel as well as moving it.
	const racingPresses = [
		{ name: 'a secondary mouse button', button: 2, init: {} },
		{ name: 'a second, non-primary contact', button: 0, init: { isPrimary: false } },
	]
	it.each(racingPresses)(
		'still suppresses the drag click when $name races the click',
		({ button, init }) => {
			const { wrapper, header } = mount()

			header.dispatchEvent(pointer('pointerdown', 0, 0))
			window.dispatchEvent(pointer('pointermove', 80, 0))
			window.dispatchEvent(pointer('pointerup', 80, 0))

			// Lands after the gesture ended but before its click was delivered
			header.dispatchEvent(pointer('pointerdown', 80, 0, button, init))
			header.dispatchEvent(new MouseEvent('click', { bubbles: true }))

			expect(offsetOf(wrapper).x).toBe('80px')
			expect(wrapper.classList.contains(styles.expanded)).toBe(false)
		}
	)

	it('stops re-clamping once disposed', () => {
		const { panel, wrapper, header } = mount()
		drag(header, 300, 0)

		panel.dispose()
		active = null

		setViewportWidth(700)
		window.dispatchEvent(new Event('resize'))

		expect(offsetOf(wrapper).x).toBe('300px')
	})
})
