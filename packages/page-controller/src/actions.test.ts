import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { inputTextElement } from './actions'

describe('inputTextElement', () => {
	let input: HTMLInputElement

	beforeEach(() => {
		input = document.createElement('input')
		document.body.append(input)
		vi.spyOn(document, 'elementFromPoint').mockReturnValue(input)
	})

	afterEach(() => {
		input.remove()
		vi.restoreAllMocks()
	})

	it('returns the normalized value when repeating equivalent input', async () => {
		input.addEventListener('input', () => {
			input.value = input.value.toUpperCase()
		})

		await expect(inputTextElement(input, 'hello')).resolves.toBe('HELLO')
		await expect(inputTextElement(input, 'hello')).resolves.toBe('HELLO')
	})

	it.each(['previous', ''])(
		'reports a page-restored value (%j) without throwing',
		async (value) => {
			input.value = value
			input.addEventListener('input', () => {
				input.value = value
			})

			await expect(inputTextElement(input, 'next')).resolves.toBe(value)
		}
	)

	it('returns an empty value after clearing the input', async () => {
		input.value = 'previous'
		await expect(inputTextElement(input, '')).resolves.toBe('')
	})
})
