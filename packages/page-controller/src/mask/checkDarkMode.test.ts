import { afterEach, describe, expect, it } from 'vitest'

import { isPageDark } from './checkDarkMode'

afterEach(() => {
	document.documentElement.className = ''
	document.documentElement.removeAttribute('style')
	document.body.removeAttribute('style')
})

describe('isPageDark', () => {
	it('reports a plainly dark page', () => {
		document.body.style.backgroundColor = 'rgb(20, 20, 20)'
		expect(isPageDark()).toBe(true)
	})

	it('reports a plainly light page', () => {
		document.body.style.backgroundColor = 'rgb(255, 255, 255)'
		expect(isPageDark()).toBe(false)
	})

	// A faint tint over a light page is not a dark page: the alpha was ignored,
	// so rgba(0, 0, 0, 0.03) measured as near-black.
	it('does not read a faint dark tint as a dark background', () => {
		document.documentElement.style.backgroundColor = 'rgb(255, 255, 255)'
		document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'
		expect(isPageDark()).toBe(false)
	})

	it('still falls through to <html> when the body is fully transparent', () => {
		document.documentElement.style.backgroundColor = 'rgb(10, 10, 10)'
		document.body.style.backgroundColor = 'rgba(0, 0, 0, 0)'
		expect(isPageDark()).toBe(true)
	})

	it('keeps a mostly opaque dark background', () => {
		document.body.style.backgroundColor = 'rgba(20, 20, 20, 0.9)'
		expect(isPageDark()).toBe(true)
	})

	it('reports a dark class', () => {
		document.documentElement.classList.add('dark')
		expect(isPageDark()).toBe(true)
	})
})
