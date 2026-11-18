import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { cleanUpHighlights } from '../index'
import domTree from './index.js'

const LABEL_SELECTOR = '.playwright-highlight-label'
const CONTAINER_ID = 'playwright-highlight-container'

/**
 * happy-dom does no layout, so offsetWidth/offsetHeight are always 0 and the
 * element would be treated as invisible. Fake the box the visibility check reads.
 */
function makeVisible<T extends HTMLElement>(element: T): T {
	Object.defineProperty(element, 'offsetWidth', { value: 100 })
	Object.defineProperty(element, 'offsetHeight', { value: 40 })
	return element
}

function addVisibleButton(text: string): HTMLButtonElement {
	const button = document.createElement('button')
	button.textContent = text
	document.body.appendChild(button)
	return makeVisible(button)
}

function run(args: Record<string, unknown>) {
	return domTree({
		focusHighlightIndex: -1,
		viewportExpansion: -1,
		debugMode: false,
		interactiveBlacklist: [],
		interactiveWhitelist: [],
		highlightOpacity: 0.5,
		highlightLabelOpacity: 0.5,
		...args,
	})
}

function highlightIndexes(tree: ReturnType<typeof domTree>): number[] {
	return Object.values(tree.map)
		.map((node) => (node as { highlightIndex?: number }).highlightIndex)
		.filter((index): index is number => typeof index === 'number')
}

describe('domTree highlighting', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	afterEach(() => {
		document.getElementById(CONTAINER_ID)?.remove()
		;((window as any)._highlightCleanupFunctions || []).forEach((fn: () => void) => fn())
		;(window as any)._highlightCleanupFunctions = []
	})

	const labelTextOpacityCases: { name: string; args: Record<string, unknown>; color: string }[] = [
		{ name: 'omitted defaults to fully opaque', args: {}, color: '#ffffffff' },
		{
			name: '0 makes the index invisible',
			args: { highlightLabelTextOpacity: 0 },
			color: '#ffffff00',
		},
		{ name: '0.1', args: { highlightLabelTextOpacity: 0.1 }, color: '#ffffff19' },
		{ name: '0.5', args: { highlightLabelTextOpacity: 0.5 }, color: '#ffffff7f' },
		{ name: '1 stays fully opaque', args: { highlightLabelTextOpacity: 1 }, color: '#ffffffff' },
		// Not clamped, so an out-of-range value encodes to something no parser accepts.
		// The declaration is dropped and the digits inherit their colour; the label is
		// still painted, which is what the option's `@note` promises.
		{
			name: 'above 1 drops the colour declaration',
			args: { highlightLabelTextOpacity: 2 },
			color: '',
		},
		{ name: 'below 0 drops it too', args: { highlightLabelTextOpacity: -0.5 }, color: '' },
	]

	describe('highlightLabelTextOpacity', () => {
		it.each(labelTextOpacityCases)('$name', ({ args, color }) => {
			addVisibleButton('click me')

			run({ doHighlightElements: true, ...args })

			const label = document.querySelector<HTMLElement>(LABEL_SELECTOR)
			expect(label?.textContent).toBe('0')
			expect(label?.style.color).toBe(color)
		})
	})

	const paintingCases = [
		{ name: 'true paints the overlay', doHighlightElements: true, labelCount: 1 },
		{ name: 'false skips the overlay', doHighlightElements: false, labelCount: 0 },
	]

	describe('doHighlightElements', () => {
		it.each(paintingCases)('$name', ({ doHighlightElements, labelCount }) => {
			addVisibleButton('click me')

			const tree = run({ doHighlightElements })

			expect(document.querySelectorAll(LABEL_SELECTOR)).toHaveLength(labelCount)
			// indexes are assigned either way, so indexed actions keep working
			expect(highlightIndexes(tree)).toEqual([0])
		})

		it('assigns the same indexes for nested interactive elements either way', () => {
			// a non-distinct interactive child is skipped because its parent is indexed;
			// that must not depend on whether the overlay is painted
			document.body.innerHTML =
				'<a href="#" id="outer"><div id="inner" style="cursor: pointer">nested</div></a>'
			makeVisible(document.getElementById('outer')!)
			makeVisible(document.getElementById('inner')!)

			const painted = highlightIndexes(run({ doHighlightElements: true }))

			document.getElementById(CONTAINER_ID)?.remove()

			const silent = highlightIndexes(run({ doHighlightElements: false }))

			expect(painted).toEqual([0])
			expect(silent).toEqual(painted)
		})

		// `PageController.updateTree` runs `cleanUpHighlights()` before every
		// extraction, which is the only thing that takes the previous run's overlays
		// down. Turning painting off has to leave a clean page rather than the last
		// painted run frozen on it, and repeated painted runs must not stack up.
		it('takes the previous overlays down when painting is turned off', () => {
			addVisibleButton('click me')
			const labels = () => document.querySelectorAll(LABEL_SELECTOR).length

			cleanUpHighlights()
			run({ doHighlightElements: true })
			expect(labels()).toBe(1)

			cleanUpHighlights()
			run({ doHighlightElements: true })
			expect(labels()).toBe(1)

			cleanUpHighlights()
			run({ doHighlightElements: false })
			expect(labels()).toBe(0)
		})

		it('assigns the same indexes when the nested child is a distinct interaction', () => {
			// mirror of the case above: a distinct child (button) IS indexed alongside its
			// parent, so parity has to hold for the "extra index" direction too
			document.body.innerHTML =
				'<div id="outer" style="cursor: pointer"><button id="inner">nested</button></div>'
			makeVisible(document.getElementById('outer')!)
			makeVisible(document.getElementById('inner')!)

			const painted = highlightIndexes(run({ doHighlightElements: true }))

			document.getElementById(CONTAINER_ID)?.remove()

			const silent = highlightIndexes(run({ doHighlightElements: false }))

			// tree.map is keyed by node id, so sort before checking which indexes exist
			expect([...painted].sort()).toEqual([0, 1])
			expect(silent).toEqual(painted)
		})
	})
})
