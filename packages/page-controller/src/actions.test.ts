import { afterEach, describe, expect, it, vi } from 'vitest'

import { clickElement } from './actions'

describe('clickElement', () => {
	afterEach(() => {
		document.body.replaceChildren()
		vi.restoreAllMocks()
	})

	it('bubbles a click from an SVG descendant to its interactive ancestor', async () => {
		const outer = document.createElement('div')
		const inner = document.createElement('div')
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
		const clicked = vi.fn()

		inner.addEventListener('click', clicked)
		svg.append(use)
		inner.append(svg)
		outer.append(inner)
		document.body.append(outer)
		outer.getBoundingClientRect = () => new DOMRect(0, 0, 40, 40)
		vi.spyOn(document, 'elementFromPoint').mockReturnValue(use)

		await clickElement(outer)

		expect(clicked).toHaveBeenCalledTimes(1)
	})
})
