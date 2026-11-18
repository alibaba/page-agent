import { describe, expect, it } from 'vitest'

import { inputTextElement } from './actions'
import { isTextLikeInputElement } from './utils'

describe('isTextLikeInputElement', () => {
	it('allows text-like and date-like inputs', () => {
		for (const type of [
			'text',
			'search',
			'tel',
			'url',
			'email',
			'password',
			'number',
			'date',
			'time',
			'datetime-local',
			'month',
			'week',
		]) {
			const el = document.createElement('input')
			el.type = type
			expect(isTextLikeInputElement(el), type).toBe(true)
		}
		const plain = document.createElement('input')
		expect(isTextLikeInputElement(plain)).toBe(true)
	})

	it('rejects checkbox, radio, file, and button-like inputs', () => {
		for (const type of [
			'checkbox',
			'radio',
			'file',
			'hidden',
			'button',
			'submit',
			'reset',
			'image',
			'range',
			'color',
		]) {
			const el = document.createElement('input')
			el.type = type
			expect(isTextLikeInputElement(el), type).toBe(false)
		}
	})
})

describe('inputTextElement', () => {
	it('rejects checkbox instead of silently setting value', async () => {
		const el = document.createElement('input')
		el.type = 'checkbox'
		el.value = 'agree'
		document.body.appendChild(el)

		await expect(inputTextElement(el, 'true')).rejects.toThrow(/type="checkbox"/)
		expect(el.checked).toBe(false)
		expect(el.value).toBe('agree')
	})

	it('still fills a text input', async () => {
		const el = document.createElement('input')
		el.type = 'text'
		document.body.appendChild(el)

		await inputTextElement(el, 'hello')
		expect(el.value).toBe('hello')
	})

	it('fills a date input', async () => {
		const el = document.createElement('input')
		el.type = 'date'
		document.body.appendChild(el)

		await inputTextElement(el, '2026-10-14')
		expect(el.value).toBe('2026-10-14')
	})
})
