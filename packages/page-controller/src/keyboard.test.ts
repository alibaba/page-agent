import { afterEach, describe, expect, it } from 'vitest'

import { pressKeyElement } from './actions'

describe('pressKeyElement', () => {
	afterEach(() => {
		document.body.replaceChildren()
	})

	it('focuses the element and dispatches keyboard events for Enter', async () => {
		const form = document.createElement('form')
		const input = document.createElement('input')
		const events: string[] = []
		let searchTriggered = false
		form.addEventListener('keydown', (event) => {
			events.push(`${event.type}:${event.key}:${event.code}`)
			if (event.key === 'Enter') searchTriggered = true
		})
		form.addEventListener('keyup', (event) => {
			events.push(`${event.type}:${event.key}:${event.code}`)
		})
		form.append(input)
		document.body.append(form)

		await pressKeyElement(input, 'Enter')

		expect(document.activeElement).toBe(input)
		expect(events).toEqual(['keydown:Enter:Enter', 'keyup:Enter:Enter'])
		expect(searchTriggered).toBe(true)
	})

	it('supports named navigation keys and printable keys', async () => {
		const input = document.createElement('input')
		const events: string[] = []
		input.addEventListener('keydown', (event) => {
			events.push(`${event.key}:${event.code}`)
		})
		document.body.append(input)

		await pressKeyElement(input, 'ArrowDown')
		await pressKeyElement(input, 'a')
		await pressKeyElement(input, ' ')

		expect(events).toEqual(['ArrowDown:ArrowDown', 'a:KeyA', ' :Space'])
	})

	it('rejects an empty key', async () => {
		const input = document.createElement('input')

		await expect(pressKeyElement(input, '')).rejects.toThrow('non-empty string')
	})
})
