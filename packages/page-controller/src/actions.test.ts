import { describe, expect, it } from 'vitest'

import { selectOptionElement } from './actions'

describe('selectOptionElement', () => {
	it('updates the value and dispatches input before change', async () => {
		const select = document.createElement('select')
		const firstOption = document.createElement('option')
		firstOption.value = 'one'
		firstOption.textContent = 'One'
		const secondOption = document.createElement('option')
		secondOption.value = 'two'
		secondOption.textContent = 'Two'

		select.append(firstOption, secondOption)
		document.body.append(select)

		const events: string[] = []
		select.addEventListener('input', () => events.push('input'))
		select.addEventListener('change', () => events.push('change'))

		await selectOptionElement(select, 'Two')

		expect(select.value).toBe('two')
		expect(events).toEqual(['input', 'change'])

		select.remove()
	})
})
