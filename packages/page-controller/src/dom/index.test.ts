import { describe, expect, it } from 'vitest'

import { getElementTextMap } from './index'

describe('getElementTextMap', () => {
	it('maps existing (non-new) element lines to their description', () => {
		const simplifiedHTML = ['[0]<a aria-label=Home />', '[1]<button >Submit />'].join('\n')

		const map = getElementTextMap(simplifiedHTML)

		expect(map.get(0)).toBe('[0]<a aria-label=Home />')
		expect(map.get(1)).toBe('[1]<button >Submit />')
	})

	it('maps new element lines marked with a leading "*"', () => {
		const simplifiedHTML = ['[0]<a aria-label=Home />', '*[5]<a role=button>Get started />'].join(
			'\n'
		)

		const map = getElementTextMap(simplifiedHTML)

		// New elements are prefixed with '*' and must still be indexed.
		expect(map.get(5)).toBe('*[5]<a role=button>Get started />')
	})

	it('indents do not prevent matching', () => {
		const simplifiedHTML = '\t\t*[3]<div >Option />'

		const map = getElementTextMap(simplifiedHTML)

		expect(map.get(3)).toBe('*[3]<div >Option />')
	})
})
