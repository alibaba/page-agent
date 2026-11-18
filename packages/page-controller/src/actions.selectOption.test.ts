import { describe, expect, it } from 'vitest'

import { selectOptionElement } from './actions'

function makeFruitSelect(): HTMLSelectElement {
	const select = document.createElement('select')
	for (const [value, text] of [
		['', '请选择喜欢的水果'],
		['apple', '苹果'],
		['banana', '香蕉'],
		['orange', '橘子'],
	] as const) {
		const option = document.createElement('option')
		option.value = value
		option.textContent = text
		select.appendChild(option)
	}
	document.body.appendChild(select)
	return select
}

describe('selectOptionElement', () => {
	it('still selects by exact visible textContent', async () => {
		const select = makeFruitSelect()
		await selectOptionElement(select, '香蕉')
		expect(select.value).toBe('banana')
	})

	it('selects by option value when it differs from visible text (i18n)', async () => {
		const select = makeFruitSelect()
		// Dehydrated DOM includes `value=apple` while text is 苹果; agents often pass the value.
		await expect(selectOptionElement(select, 'apple')).resolves.toBeUndefined()
		expect(select.value).toBe('apple')
		expect(select.selectedOptions[0]?.textContent).toBe('苹果')
	})

	it('rejects when neither text nor value matches', async () => {
		const select = makeFruitSelect()
		await expect(selectOptionElement(select, 'grape')).rejects.toThrow(/not found/)
		expect(select.value).toBe('')
	})

	it('prefers exact textContent when one option text equals another option value', async () => {
		const select = document.createElement('select')
		const a = document.createElement('option')
		a.value = 'a'
		a.textContent = 'b'
		const b = document.createElement('option')
		b.value = 'b'
		b.textContent = 'a'
		select.append(a, b)
		document.body.appendChild(select)

		await selectOptionElement(select, 'a')
		// Preserve prior text-first behavior for ambiguous needles.
		expect(select.value).toBe('b')
		expect(select.selectedOptions[0]?.textContent).toBe('a')
	})
})
