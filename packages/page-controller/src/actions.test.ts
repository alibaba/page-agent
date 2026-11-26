import { describe, expect, it } from 'vitest'

import { pressKeyElement } from './actions'

describe('pressKeyElement', () => {
	it('dispatches keydown and keyup with the requested key', async () => {
		const input = document.createElement('input')
		const keys: string[] = []
		input.addEventListener('keydown', (e) => keys.push(`down:${e.key}`))
		input.addEventListener('keyup', (e) => keys.push(`up:${e.key}`))

		await pressKeyElement(input, 'Enter')

		expect(keys).toEqual(['down:Enter', 'up:Enter'])
	})

	it('honors preventDefault from a keydown listener', async () => {
		const form = document.createElement('form')
		const input = document.createElement('input')
		form.appendChild(input)

		let submitted = false
		form.addEventListener('submit', (e) => {
			e.preventDefault()
			submitted = true
		})
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') e.preventDefault()
		})

		await pressKeyElement(input, 'Enter')

		expect(submitted).toBe(false)
	})
})
